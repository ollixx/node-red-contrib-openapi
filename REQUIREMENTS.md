# node-red-contrib-openapi — Anforderungen

## 1. Vision

Ein Node-RED-Node-Set, das eine **OpenAPI-Spezifikation zur Quelle der Wahrheit** für serverseitige HTTP-Endpunkte macht. Der Entwickler pflegt eine `openapi.json`, und Node-RED realisiert die darin beschriebenen Endpunkte: eingehende Requests werden gegen die Spec validiert, als saubere Message in den Flow gegeben, und Responses werden ebenfalls gegen die Spec geprüft, bevor sie ausgeliefert werden. Auth ist integraler Bestandteil, Meta-Endpunkte (Spec-Auslieferung, Swagger-UI) werden automatisch mitgeliefert.

Kurz: **"OpenAPI-first HTTP-Server für Node-RED"** — der Gegenpol zu den generischen `http in`/`http response`-Nodes, aber spec-getrieben und selbstvalidierend.

## 2. Nicht-Ziele (vorerst)

- Kein Client-Generator (Aufrufen fremder APIs) — das ist ein separates, späteres Thema.
- Kein Code-Generator, der statische Flows erzeugt. Nodes arbeiten zur Laufzeit gegen die Spec.
- Keine Persistenz-/DB-Schicht. Die Business-Logik bleibt Sache des Flows zwischen In- und Return-Node.

## 3. Komponenten (Nodes)

### 3.1 `openapi-config` (Config-Node)
Hält die OpenAPI-Spezifikation und stellt sie allen anderen Nodes zentral bereit.

**Quellen (möglichst viele, erweiterbar):**
- Inline-JSON/YAML direkt im Editor
- Lokaler Dateipfad (`.json` / `.yaml`)
- URL (HTTP[S]-Fetch beim Deploy, optional periodisches Refresh)
- Node-RED-Umgebungsvariable / `flow`/`global`-Context
- *(später)* eingebetteter Admin-Editor mit Code-Completion, Live-Validierung, Format-Konvertierung

**Verantwortung:**
- Spec laden, parsen (JSON **und** YAML), `$ref` dereferenzieren, Bundle im Speicher halten.
- Spec beim Deploy validieren (OpenAPI 3.0/3.1, optional Swagger 2.0). Fehler klar an den Node-Status/Editor melden.
- Operationen indexieren: `operationId` → `{ method, path, parameters, requestBody, responses, security }`.
- Base-Path / Server-URL berücksichtigen (Prefix für alle Routen).
- Referenz auf einen optionalen `openapi-auth`-Node.
- Meta-Endpunkte registrieren (siehe 3.5), einzeln abschaltbar.

**Editor-UX:** Statusanzeige (valide / X Operationen / Fehler), Buttons zum Neu-Laden und zur Vorschau der Operationsliste.

### 3.2 `openapi-auth` (Config-Node)
Bündelt die Authentifizierung, abgeleitet aus `components.securitySchemes` der Spec.

**Unterstützte Schemes:**
- `apiKey` (Header / Query / Cookie)
- `http` `bearer` (inkl. optionaler JWT-Prüfung) und `basic`
- `oauth2` / `openIdConnect` (Token-Validierung; Flows nach Bedarf, ausbaustufig)

**Verantwortung:**
- Eingehende Credentials gegen das in der Operation geforderte `security`-Requirement prüfen.
- Bei Erfolg extrahierte Auth-Infos strukturiert in die Message legen (`msg.auth = { scheme, token, claims, scopes, principal }`).
- Bei Fehlschlag standardisierte 401/403-Antwort erzeugen (im Zusammenspiel mit dem Return-Node bzw. direkt).
- Secrets sicher speichern (Node-RED `credentials`), nicht im Flow-Export.
- Validierungsstrategie konfigurierbar: eingebaut (Key-Liste, JWT-Secret/JWKS-URL) oder Delegation an den Flow ("nur extrahieren, Flow entscheidet").

### 3.3 `openapi-in` (HTTP-In)
Realisiert **eine** Operation der Spec (ein Endpunkt = ein Node).

**Konfiguration:** Auswahl der Operation per `operationId` (oder Method+Path) aus dem referenzierten `openapi-config`.

**Verantwortung:**
- Route im Node-RED-HTTP-Server registrieren (Pfad-Umschreibung `{param}` → Express `:param`), inkl. Server-Prefix.
- Request gegen die Spec validieren: Pfad-, Query-, Header-, Cookie-Parameter (Typen, `required`, Enums, Formate) und `requestBody` gegen das JSON-Schema (via AJV).
- Content-Type-Aushandlung entsprechend `requestBody.content`.
- Auth über den `openapi-auth`-Node auslösen; Ergebnis in `msg.auth`.
- Bei Validierungsfehler: konfigurierbar — automatische 400-Antwort **oder** Weiterreichen an einen Fehlerausgang für eigene Behandlung.
- Ausgabe einer **sauberen, normalisierten Message**:
  - `msg.payload` = validierter Body (bei bodylosen Methoden die Parameter)
  - `msg.parameters` = `{ path, query, header, cookie }` (typkonvertiert)
  - `msg.openapi` = `{ operationId, method, path, spec-Auszug }`
  - `msg.req` / `msg.res` = Express-Objekte (für den Return-Node)
  - `msg.auth` = Auth-Ergebnis

**Ausgänge:** (1) valide Message, (2) optional Validierungs-/Auth-Fehler.

### 3.4 `openapi-response` (HTTP-Return)
Sendet die Response und hält sich dabei an die Spec.

**Verantwortung:**
- Statuscode und Body aus der Message bestimmen (`msg.statusCode`, `msg.payload`).
- Response gegen das in der Spec definierte `responses[status].content`-Schema validieren.
- **Flexibles Error-Handling** (zentrale Anforderung):
  - Modi: `strict` (invalide Response → 500 + Log), `warn` (senden, aber loggen/Status setzen), `off` (nur senden).
  - Fehler-Mapping: Flow kann `msg.error` setzen → Node bildet daraus eine spec-konforme Fehlerantwort (Status + standardisierter Error-Body, z. B. RFC-7807 `application/problem+json`, konfigurierbar).
  - Fallback-Antworten für nicht in der Spec beschriebene Fälle.
- Header setzen (Content-Type aus gewählter Response, CORS optional).
- Genau einmal antworten (Schutz gegen doppeltes Senden).

### 3.5 Meta-Endpunkte (vom `openapi-config` bereitgestellt)
Standardmäßig aktiv, je einzeln abschaltbar:
- `GET {prefix}/openapi.json` — die (dereferenzierte oder rohe) Spec
- `GET {prefix}/openapi.yaml` — YAML-Variante
- `GET {prefix}/docs` — Swagger-UI / Redoc über die Spec
- *(optional)* Health-/Info-Endpunkt

## 4. Querschnittsanforderungen

**Validierung:** AJV (JSON Schema draft-2020-12 & OpenAPI-Dialekt), Formate via `ajv-formats`. Aussagekräftige Fehlerobjekte (Pfad, Regel, erhaltener Wert).

**Spec-Handling:** `$ref`-Dereferenzierung, OpenAPI 3.0/3.1 primär, Swagger 2.0 nachrangig. Robust gegen Teil-Specs und Reload ohne Node-RED-Neustart.

**Lifecycle:** Routen bei Redeploy/`close` sauber deregistrieren, keine Doppelregistrierung, kein Leck im Express-Router-Stack.

**Fehler- & Status-Feedback:** Jeder Node zeigt aussagekräftigen Node-Status (grün/gelb/rot) und loggt strukturiert.

**Sicherheit:** Secrets nur über Node-RED-`credentials`. Keine Spec-Injektion von Prototypen. Body-Size-Limits konfigurierbar.

**Kompatibilität:** Node-RED ≥ 3.x, Node.js ≥ 18. Nutzung von `RED.httpNode` (Express) für Routen; Respekt vor `httpNodeMiddleware`/`httpNodeRoot`.

## 5. Technischer Rahmen

- **Sprache/Runtime:** Node.js (CommonJS-Nodes, wie Node-RED üblich).
- **Kern-Dependencies:** `@apidevtools/swagger-parser` (Parsen/Deref/Validieren), `ajv` + `ajv-formats` (Datenvalidierung), `js-yaml` (YAML), evtl. `swagger-ui-dist`/`redoc` für Docs, `jsonwebtoken`/`jwks-rsa` für JWT (Auth-Ausbaustufe).
- **Paketstruktur:**
  ```
  package.json          (node-red-Sektion mit allen Nodes)
  nodes/
    openapi-config.js / .html
    openapi-auth.js   / .html
    openapi-in.js     / .html
    openapi-response.js / .html
  lib/
    spec-loader.js      (Quellen laden, parsen, deref)
    validator.js        (AJV-Wrapper, Request/Response)
    auth.js             (Scheme-Prüfung, Token-Extraktion)
    routing.js          (Pfad-Umschreibung, Route-Registrierung/-Abbau)
    meta.js             (Meta-Endpunkte)
  examples/             (Beispiel-Flows, Petstore-Spec)
  test/                 (Node-Load- und Integrationstests)
  ```

## 6. Abnahmekriterien (MVP)

1. `openapi-config` lädt eine Petstore-Spec (inline/URL), meldet Operationsanzahl, validiert sie.
2. Ein `openapi-in`-Node registriert `GET /pet/{petId}` und `POST /pet`; ungültige Requests werden mit 400 + Fehlerdetails abgewiesen, gültige liefern eine normalisierte `msg`.
3. Ein `openapi-response`-Node sendet eine 200-Antwort, validiert den Body gegen die Spec, und bildet `msg.error` auf eine spec-konforme Fehlerantwort ab.
4. `GET /openapi.json` und `/docs` sind erreichbar und abschaltbar.
5. Redeploy funktioniert ohne verwaiste Routen. Alle Nodes laden fehlerfrei im Node-RED-Editor.

## 7. Roadmap (nach MVP)

- Admin-Editor mit Monaco (Code-Completion, Live-Validierung, YAML↔JSON).
- OAuth2-Flows vollständig, JWKS-Caching, Scope-Enforcement pro Operation.
- Response-Beispiele/Mock-Modus (Spec-basiertes Mocking ohne Flow-Logik).
- Metriken/Tracing pro Operation.
- Swagger-2.0- und AsyncAPI-Betrachtung.

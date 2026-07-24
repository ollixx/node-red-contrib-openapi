---
id: P7
node: openapi-config
title: "HTTP-Bearer: echte JWT-Verifikation (Shared Secret + JWKS) statt nur Extraktion"
epic: aspects/auth
findings:
  - "http bearer / oauth2 / openIdConnect werden aktuell nur EXTRAHIERT — im enforce-Modus reicht die bloße Präsenz eines Bearer-Tokens (lib/auth.enforceScheme: 'bearer: presence accepted at MVP'). Ein beliebiger String passiert die Auth."
acceptance:
  - "openapi-config bietet pro Bearer-basiertem Scheme eine Verifikationskonfiguration: entweder ein Shared Secret (HS256) oder eine JWKS-URL (RS256/ES256). Secrets liegen in Node-RED credentials, nicht im Flow-Export."
  - "Im enforce-Modus mit konfigurierter Verifikation: ein Token mit gültiger Signatur und nicht abgelaufenem exp passiert (200); ein Token mit falscher Signatur oder abgelaufenem exp wird mit 401 abgewiesen; ein fehlendes Token bleibt 401."
  - "Bei Erfolg stehen die verifizierten Claims in msg.auth.claims (statt null); der Rohtoken bleibt in msg.auth.token."
  - "Ohne konfigurierte Verifikation bleibt das bisherige Verhalten (Extraktion, Präsenz akzeptiert) erhalten — abwärtskompatibel; im extract-Modus wird nie verifiziert."
  - "Neue runtime dependencies jsonwebtoken (+ jwks-rsa für JWKS) — bewusste Dependency-Ergänzung (Stop-Condition architecture.md §1). JWKS-Caching-Details sind NICHT Teil dieser Phase (siehe P9)."
verify: http
spec: docs/nodes/openapi-config.md
tests: test/openapi-config.tests.md
dependencies: []
status: pending
---

# P7 — Bearer-JWT-Verifikation

Motiviert durch [ADR 0002](../../../adr/0002-post-mvp-feature-roadmap.md) (Review-Fund P3.3, Teil 1).

Erweitert die Auth im Config-Node (ADR 0001) um echte Signatur-/Ablauf-Prüfung für
Bearer-Tokens. `lib/auth.enforceScheme` wird für den `http bearer`-Fall (und
oauth2/oidc-Bearer) um eine Verifikations-Delegation ergänzt; die reine
OR/AND-Auswertung bleibt. Scope-Enforcement ist separat ([P8](P8-scope-enforcement.md)).
Volles OAuth2/OIDC-Flow-Handling + JWKS-Caching ist deferred ([P9]).

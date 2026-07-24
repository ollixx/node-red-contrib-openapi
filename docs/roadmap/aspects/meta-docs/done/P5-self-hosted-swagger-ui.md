---
id: P5
node: openapi-config
title: "Swagger-UI selbst hosten statt vom jsDelivr-CDN laden"
epic: aspects/meta-docs
findings:
  - "lib/meta.js docsHtml lädt CSS und JS von https://cdn.jsdelivr.net — Laufzeit-Abhängigkeit von einem externen CDN, bricht offline/hinter strenger CSP und ist ein unnötiger Drittanbieter-Trust."
acceptance:
  - "Die /docs-Seite lädt Swagger-UI-Assets von einer lokal ausgelieferten Route unter dem Server-Prefix (z. B. {prefix}/docs/swagger-ui.css, .../swagger-ui-bundle.js), NICHT von cdn.jsdelivr.net — der ausgelieferte HTML enthält keine jsdelivr-URL mehr."
  - "HTTP: GET {prefix}/docs → 200 text/html; die referenzierten Asset-Routen liefern 200 mit passendem Content-Type (text/css bzw. application/javascript); /docs bleibt einzeln abschaltbar (metaDocs=false → 404 für Seite und Assets)."
  - "Die Assets stammen aus dem Paket `swagger-ui-dist` (neue runtime dependency — bewusste Dependency-Ergänzung, Stop-Condition architecture.md §1); der Pfad wird via require.resolve('swagger-ui-dist') aufgelöst, nicht hartkodiert."
  - "Die Meta-Route-Lebenszyklus-Invariante bleibt: bei close/redeploy werden auch die Asset-Routen sauber entfernt (kein Orphan)."
verify: http
spec: docs/nodes/openapi-config.md
tests: test/meta.tests.md
dependencies: []
status: done
---

# P5 — Self-hosted Swagger-UI

Motiviert durch [ADR 0002](../../../../adr/0002-post-mvp-feature-roadmap.md) (Review-Fund P3.2).

`swagger-ui-dist` als runtime dependency aufnehmen, seine statischen Dateien unter dem
Prefix ausliefern (registriert/abgebaut über dieselben `lib/routing`-Helfer wie die
übrigen Meta-Routen, damit der Kollisionsschutz und der saubere Teardown greifen), und
`docsHtml` auf die lokalen Asset-Pfade zeigen lassen. Test-Katalog `test/meta.tests.md`
(neu) wird mitgepflegt.

## Result

**Delivered:** Swagger-UI wird aus `swagger-ui-dist` (neue runtime dependency) lokal ausgeliefert statt vom jsDelivr-CDN; `/docs`-HTML referenziert `{prefix}/docs/swagger-ui.css` + `-bundle.js`, die Asset-Routen liefern die Dateien aus `path.dirname(require.resolve('swagger-ui-dist'))`.
**Stats:** 4 Dateien (lib/meta.js, package.json, test/meta_spec.js [+4 Tests], test/meta.tests.md [neu]) + docs-Präzisierung; 76 Tests grün (vorher 72).
**Notes:** Asset-Routen laufen über dieselben lib/routing-Helfer (add()) → Kollisionsschutz + sauberer Teardown greifen; metaDocs=false → Seite UND Assets 404. Fehlt swagger-ui-dist, wird /docs mit Warnung deaktiviert. HTTP-Nachweis via supertest gegen echtes Express (verify: http).
**Cost:** session bba0ab6b, ~3m

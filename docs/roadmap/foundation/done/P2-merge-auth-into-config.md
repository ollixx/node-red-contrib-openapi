---
id: P2
node: openapi-config
title: "Auth in den Config-Node zusammenführen (openapi-auth entfällt als eigener Knoten)"
epic: foundation
findings:
  - "Auth braucht keinen eigenen Knoten. Das sollten Konfigurationen innerhalb des Config-Nodes sein."
acceptance:
  - "Die Felder des bisherigen openapi-auth (mode = enforce|extract; Credentials apiKeys, basicUsers) liegen jetzt auf openapi-config (mode als normales Feld, apiKeys/basicUsers als Node-RED credentials — nie im Flow-Export)."
  - "openapi-config bietet eine Methode `authenticate(security, schemes, req)`, die an `lib/auth.authenticate` mit der eigenen Config delegiert. `lib/auth.js` bleibt unverändert."
  - "openapi-in ruft die Auth über den Config-Node auf (nicht mehr über einen separaten Auth-Node). HTTP: fehlende Credentials → 401, falsche → 403, gültige → 200 und `msg.auth` gefüllt — für apiKey, http basic und bearer-extract, inkl. OR mehrerer Requirements."
  - "Der Knoten `openapi-auth` ist entfernt: nodes/openapi-auth.js + .html gelöscht, aus package.json `node-red.nodes` raus, README/REQUIREMENTS nennen ihn nicht mehr als eigenen Knoten."
  - "Bestehende Flows/Beispiele laden ohne Fehler; kein verwaister `auth`-Verweis im Config-Node."
verify: http
spec: docs/nodes/openapi-config.md
tests: test/openapi-config.tests.md
dependencies: [P1]
status: done
---

# P2 — Auth in den Config-Node zusammenführen

Motiviert durch [ADR 0001](../../../adr/0001-auth-config-not-separate-node.md).

Owner-Entscheidung (2026-07-05): Auth ist keine eigene Node-Ebene, sondern Teil der
Spec-Konfiguration — die `securitySchemes` stammen ohnehin aus der Spec im Config-Node,
und die Beziehung war immer 1:1.

Merge-Plan (klein, `lib/auth.js` bleibt unangetastet):
1. `mode` + Credentials (`apiKeys`, `basicUsers`) auf `openapi-config` (.js + .html) verschieben.
2. `openapi-config.authenticate(security, schemes, req)` → delegiert an `lib/auth.authenticate`.
3. `openapi-in` ruft `cfgNode.authenticate(...)` direkt (statt `cfgNode.getAuthNode().authenticate(...)`).
4. `nodes/openapi-auth.*` löschen, aus `package.json` `node-red.nodes` entfernen, Doku angleichen.

Tests fresh nach [node-testing.md](../../../../.ai/agents/node-testing.md); der `spec`/`tests`-Pfad
oben wird in dieser Phase mit angelegt (docs/nodes/openapi-config.md existiert noch nicht —
Teil des Deliverables).

## Result

**Delivered:** Auth in `openapi-config` zusammengeführt (ADR 0001): `authMode` (enforce|extract) als Feld, `apiKeys`/`basicUsers` als Node-RED-Credentials, neue Methode `node.authenticate(security, schemes, req)` die an das unveränderte `lib/auth` delegiert; `openapi-in` ruft `cfgNode.authenticate(...)` direkt. Der separate `openapi-auth`-Knoten ist entfernt (Dateien gelöscht, aus `package.json` `node-red.nodes`, aus Beispiel-Flow, README, REQUIREMENTS).
**Stats:** 11 Dateien (openapi-config.js/.html, openapi-in.js, package.json, examples/flow.json, README.md, REQUIREMENTS.md, nodes/openapi-auth.js+.html [gelöscht], docs/nodes/openapi-config.md [neu], docs/nodes/README.md, test/openapi-config_spec.js [neu, 7 Tests], test/openapi-config.tests.md [neu]); 23 Tests grün (vorher 16).
**Notes:** `lib/auth.js` unangetastet. HTTP-Auth end-to-end bewiesen (401/403/201 via createPet/ApiKeyAuth); Delegation für apiKey/basic/bearer/OR direkt getestet; 3 strukturelle Tests sichern die Node-Entfernung ab. `--exit` zum Test-Script ergänzt (node-red-node-test-helper hält sonst den Prozess offen — trat mit den neuen helper-basierten Specs auf).
**Cost:** session bba0ab6b, ~9m

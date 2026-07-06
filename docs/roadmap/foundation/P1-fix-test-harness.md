---
id: P1
title: "Test-Harness reparieren: npm test fährt wieder alle Specs"
epic: foundation
findings:
  - "`npm test` bricht komplett ab: keine einzige Testdatei läuft."
  - "Ursache: test/integration_spec.js macht `helper.init(require.resolve(\"node-red\"))`, aber `node-red` steht nicht in den devDependencies. Mocha lädt alle Spec-Dateien vor dem Lauf, also reißt der fehlende require die ganze Suite mit runter (Exit vor dem ersten Test)."
  - "Isoliert man die zwei dependency-leichten Specs (validator_spec, routing_auth_spec), sind 13 Tests grün."
acceptance:
  - "`npm test` läuft alle Spec-Dateien und endet mit exit=0, zero failing. Die pure-logic Specs (13 Tests) bleiben grün."
  - "Ist `node-red` installierbar/installiert: die Integrationstests in test/integration_spec.js laufen mit und sind grün (Meta-Endpoint, 400-Auto-Response, normalisierte msg)."
  - "Ist `node-red` NICHT auflösbar: die Integration-Suite wird sauber übersprungen (describe.skip o.ä. mit sichtbarem Skip-Hinweis) statt die gesamte Suite mit `Cannot find module` abzubrechen. `npm test` bleibt exit=0."
  - "package.json devDependencies enthält `node-red` (passende Major-Version zu node-red-node-test-helper)."
verify: unit
dependencies: []
status: in_progress
---

# P1 — Test-Harness reparieren

Siehe `findings`. Zwei Dinge zusammen: (1) `node-red` als devDependency aufnehmen, damit
`node-red-node-test-helper` initialisieren kann; (2) `test/integration_spec.js` defensiv
machen, sodass ein fehlendes `node-red` die restliche Suite nie wieder mitreißt
(resolvable-Check → `describe.skip`). Kontext: [context-budget → Pitfalls](../../../.ai/agents/context-budget.md), [validation](../../../.ai/agents/validation.md).

Kein Produkt-Verhalten ändert sich — nur die Testbarkeit. Danach ist die grüne Baseline
wiederhergestellt, die jede weitere Phase (Regel „green baseline before start") voraussetzt.

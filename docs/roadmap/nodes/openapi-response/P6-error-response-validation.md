---
id: P6
node: openapi-response
title: "Error-Responses (msg.error) gegen das Spec-Error-Schema validieren"
epic: nodes/openapi-response
findings:
  - "openapi-response überspringt bei msg.error die Spec-Validierung (nur der Erfolgs-Pfad wird validiert). Specs definieren aber oft Error-Schemas (z. B. responses.4XX/default.content) — eine falsch geformte Fehlerantwort wird ungeprüft rausgeschickt."
acceptance:
  - "Bei gesetztem msg.error wird der erzeugte Fehler-Body gegen das Spec-Response-Schema des gewählten Statuscodes validiert (mit demselben NXX/default-Fallback wie beim Erfolgs-Pfad), sofern die Spec dafür ein Schema hat (matched=true)."
  - "Der Validierungsmodus gilt konsistent: strict → ein spec-verletzender Fehler-Body wird durch 500 ersetzt; warn → wird gesendet + geloggt/Status gelb; off → ungeprüft gesendet."
  - "Hat die Spec für den Status kein Error-Schema (matched=false), wird der Fehler-Body unverändert gesendet (kein falscher 500)."
  - "Der bestehende RFC-7807/plain-Aufbau von msg.error bleibt unverändert; nur die Validierung kommt hinzu. Beweisbar über den Fake-res-Ansatz aus test/openapi-response_spec.js."
verify: unit
spec: docs/nodes/openapi-response.md
tests: test/openapi-response.tests.md
dependencies: []
status: in_progress
---

# P6 — Error-Response-Validierung

Motiviert durch [ADR 0002](../../../adr/0002-post-mvp-feature-roadmap.md) (Review-Fund P3.1).

Der `OperationValidator.validateResponse` existiert bereits und wird im Erfolgs-Pfad
genutzt; hier wird er auch auf den `msg.error`-Pfad angewandt, unter demselben
`validation`-Modus. `spec` (docs/nodes/openapi-response.md) und `tests`-Katalog werden in
P4 bzw. hier mitgeführt.

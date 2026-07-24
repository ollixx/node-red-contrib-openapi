---
id: P13
node: openapi-config
title: "In-Editor Monaco-Spec-Editor mit Code-Completion + Live-Validierung"
epic: nodes/openapi-config
findings:
  - "REQUIREMENTS §3.1/§7: als spätere Ausbaustufe ein eingebetteter Admin-Editor mit Monaco (Code-Completion, Live-Validierung, YAML↔JSON-Konvertierung) direkt im openapi-config-Editor-Panel."
acceptance:
  - "Das openapi-config-Editor-Panel bietet für die Inline-Quelle einen Monaco-Editor mit OpenAPI-Schema-gestützter Code-Completion und Live-Validierung (Fehler inline markiert)."
  - "YAML↔JSON-Konvertierung im Editor; die validierte Spec wird als Node-Config gespeichert."
verify: unit
dependencies: []
status: deferred
deferred_reason: "Große Editor-Feature (Monaco-Bundling in die Node-RED-Editor-Assets, Schema-Worker); braucht eine eigene ADR zu Bundling/Assets und UX."
---

# P13 — Monaco-Spec-Editor (deferred)

Motiviert durch [ADR 0002](../../../../adr/0002-post-mvp-feature-roadmap.md) (REQUIREMENTS §7).

Aufgeschoben bis eine ADR das Monaco-Bundling in die Editor-Assets und die UX klärt.

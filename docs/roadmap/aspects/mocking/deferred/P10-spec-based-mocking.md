---
id: P10
title: "Spec-basiertes Mocking: Responses aus examples/Schema ohne Flow-Logik"
epic: aspects/mocking
findings:
  - "REQUIREMENTS §7: ein Mock-Modus, der Antworten direkt aus der Spec erzeugt (deklarierte examples oder schema-generierte Daten), ohne Business-Logik zwischen openapi-in und openapi-response — zum Prototyping einer API vor ihrer Implementierung."
acceptance:
  - "Ein Mock-Modus (deploy-weit oder pro Operation aktivierbar) beantwortet eine Operation ohne Flow: gewählter Response-Status, Body aus responses[status].content.example / .examples, sonst aus dem Schema generiert."
  - "Der erzeugte Mock-Body ist gegen das eigene Response-Schema valide."
  - "Klar definiert, wie der Response ausgewählt wird (Default-Status, Content-Type-Aushandlung) und wie Mock mit echten Flows koexistiert."
verify: http
dependencies: []
status: deferred
deferred_reason: "Braucht eine eigene ADR zur Mock-Semantik (example-vs-schema-faker, Opt-in-Granularität pro Operation, Auswahl-Regeln) und Owner-Entscheidung."
---

# P10 — Spec-basiertes Mocking (deferred)

Motiviert durch [ADR 0002](../../../../adr/0002-post-mvp-feature-roadmap.md) (REQUIREMENTS §7).

Aufgeschoben bis eine ADR die Mock-Semantik festlegt.

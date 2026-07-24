---
id: P14
node: openapi-config
title: "Credential-Eingaben pro securityScheme im Editor rendern (statt flacher Listen)"
epic: nodes/openapi-config
findings:
  - "ADR 0001 (Consequences): Da der Config-Node die securitySchemes der Spec kennt, könnten die Credential-Eingaben pro Scheme gerendert werden, statt der aktuellen flachen apiKeys/basicUsers-Listen — aufgeschoben aus dem Auth-Merge (P2)."
acceptance:
  - "Das openapi-config-Editor-Panel liest die securitySchemes der (geladenen) Spec und rendert je Scheme das passende Credential-Eingabefeld (z. B. Key-Liste für apiKey, user:pass für http basic, Secret/JWKS für bearer)."
  - "Die eingegebenen Werte werden schema-korrekt als Node-RED credentials gespeichert und von node.authenticate genutzt; abwärtskompatibel zu den bestehenden flachen Feldern."
verify: unit
dependencies: []
status: deferred
deferred_reason: "Braucht editor-seitigen Zugriff auf die geladene Spec (Schemes vor Deploy) und eine UX-Entscheidung; aufgeschoben aus ADR 0001."
---

# P14 — Per-securityScheme Editor-Rendering (deferred)

Motiviert durch [ADR 0002](../../../../adr/0002-post-mvp-feature-roadmap.md) und [ADR 0001](../../../../adr/0001-auth-config-not-separate-node.md).

Aufgeschoben bis der Editor die Spec-Schemes vor Deploy kennt und die UX steht.

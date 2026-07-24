---
id: P4
title: "Node-Requirement-Docs für openapi-in und openapi-response (Detail-Bar)"
epic: aspects/docs
findings:
  - "Nur docs/nodes/openapi-config.md existiert. Für openapi-in und openapi-response fehlen die Requirement-Docs — der Cross-Check (validation.md Schritt 3) und die Detail-Bar (AGENTS.md Regel 10) haben für diese Knoten keine Grundlage."
acceptance:
  - "docs/nodes/openapi-in.md existiert und beschreibt pro Config-Feld (name, server, operation, onError, maxBodyBytes) Typ, Default, erlaubte Werte, Validierung, Abhängigkeiten und den beobachtbaren Effekt; dazu die registrierte Route, die Request-Validierung, die emittierte msg (payload/parameters/auth/openapi/req/res) und das onError-Verhalten (respond vs. output) inkl. 413-Body-Limit."
  - "docs/nodes/openapi-response.md existiert und beschreibt pro Feld (name, server, validation, errorFormat, defaultStatus) dasselbe, plus die Validierungsmodi strict/warn/off, die msg.error→RFC-7807/plain-Abbildung und die Send-genau-einmal-Garantie."
  - "docs/nodes/README.md verlinkt beide Docs (keine _(tbd)_-Platzhalter mehr)."
  - "`npm run check:links` bleibt grün (alle Verweise auflösbar)."
dependencies: []
status: pending
---

# P4 — Node-Requirement-Docs für openapi-in / openapi-response

Motiviert durch [ADR 0002](../../../adr/0002-post-mvp-feature-roadmap.md) (Review-Fund P3.8).

Reine Doku-Phase (kein Code). Beide Docs werden zur selben Detail-Bar geschrieben wie
[docs/nodes/openapi-config.md](../../../nodes/openapi-config.md) (Vorlage) — Feldtabelle
+ Verhalten + „Related". Danach sind alle drei Knoten cross-check-fähig.

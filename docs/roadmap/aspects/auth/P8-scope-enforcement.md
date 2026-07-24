---
id: P8
node: openapi-config
title: "Per-Operation Scope-Enforcement (403 bei unzureichenden Scopes)"
epic: aspects/auth
findings:
  - "Die von der Operation geforderten Scopes (security-Requirement, z. B. { OAuth2: ['pets:write'] }) werden extrahiert (msg.auth.scopes), aber nicht erzwungen — ein gültig authentifiziertes Token ohne den geforderten Scope wird nicht abgewiesen."
acceptance:
  - "Nach erfolgreicher Authentifizierung eines Bearer-Tokens werden die Token-Scopes (aus dem 'scope'/'scp'-Claim des verifizierten JWT) gegen die von der Operation geforderten Scopes geprüft."
  - "Fehlt mindestens ein geforderter Scope → 403 (authentifiziert, aber nicht autorisiert); sind alle geforderten Scopes vorhanden → Durchlass; fordert die Operation keine Scopes → keine Scope-Prüfung."
  - "Die 403-Antwort ist unterscheidbar von 401 (fehlende/ungültige Authentifizierung); msg.auth.scopes trägt die effektiven Token-Scopes."
verify: http
spec: docs/nodes/openapi-config.md
tests: test/openapi-config.tests.md
dependencies: [P7]
status: pending
---

# P8 — Scope-Enforcement pro Operation

Motiviert durch [ADR 0002](../../../adr/0002-post-mvp-feature-roadmap.md) (Review-Fund P3.3, Teil 2).

Baut auf [P7](P7-bearer-jwt-verification.md) auf: nachdem das JWT verifiziert ist, werden
dessen Scopes gegen `requirement[schemeName]` (die geforderten Scopes) geprüft. Ergänzt
`lib/auth` um einen Scope-Vergleich; die 401/403-Unterscheidung folgt der bestehenden
Semantik (401 = nicht authentifiziert, 403 = authentifiziert aber unautorisiert).

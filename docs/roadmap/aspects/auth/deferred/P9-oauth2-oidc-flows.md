---
id: P9
node: openapi-config
title: "OAuth2 / OIDC: volle Flows + JWKS-Caching + Provider-Integration"
epic: aspects/auth
findings:
  - "REQUIREMENTS §3.2/§7: oauth2 und openIdConnect sollen über reine Bearer-Extraktion hinaus vollständig unterstützt werden — Token-Introspection/Discovery, mehrere Flows, JWKS-Caching mit Rotation."
  - "Remote JWKS-URL-Verifikation (RS256/ES256) wurde aus P7 hierher verschoben: sie braucht asynchronen Key-Fetch + Caching (P7 liefert nur synchrone Verifikation via Shared Secret / statischem PEM Public Key)."
acceptance:
  - "OIDC-Discovery (.well-known) und JWKS-Abruf inkl. Caching mit Key-Rotation und TTL."
  - "Token-Validierung gegen den Provider (Introspection oder lokale JWKS-Prüfung), konfigurierbar pro Scheme."
  - "Klar definiertes Verhalten pro OAuth2-Flow (mindestens clientCredentials/authorizationCode-Token-Prüfung serverseitig)."
verify: http
dependencies: [P7]
status: deferred
deferred_reason: "Braucht eine eigene ADR (welche Flows/Provider, Introspection vs. lokale JWKS-Prüfung, Caching-Strategie) und eine Owner-Entscheidung. Grundlage JWT-Verifikation kommt aus P7."
---

# P9 — OAuth2 / OIDC volle Flows (deferred)

Motiviert durch [ADR 0002](../../../../adr/0002-post-mvp-feature-roadmap.md) (Review-Fund P3.3, Ausbaustufe).

Aufgeschoben bis P7 (Bearer-JWT-Verifikation) steht und eine dedizierte ADR die
Flow-/Provider-/Caching-Fragen entscheidet.

# Epic: aspects/auth

Cross-cutting authentication — `lib/auth.js`: credential extraction per
`securityScheme` (apiKey header/query/cookie, http basic, http/oauth2/oidc bearer),
evaluation of an operation's `security` (OR of ANDs), enforce-vs-extract modes, and the
401/403 decision. Roadmap: full JWT verification, OAuth2 flows, JWKS caching, per-op
scope enforcement.

Configured via `openapi-config` (after `foundation/P2`); invoked by `openapi-in`.

Packages follow [`.ai/agents/roadmap-phase-schema.md`](../../../../.ai/agents/roadmap-phase-schema.md).

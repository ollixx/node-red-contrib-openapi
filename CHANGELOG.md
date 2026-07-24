# Changelog

All notable changes to `node-red-contrib-openapi` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/); this project
uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Regression coverage for the shipped `examples/task-manager.json` showcase: a test
  loads the real file and drives its security-critical paths (apiKey + bearer JWT +
  per-operation scope + body validation), so a node change that breaks the example
  turns the suite red.
- Node-level coverage for every `openapi-config` spec source (`file`, `url`, `context`) —
  previously only `inline` was exercised end-to-end. Includes the node's `context`
  resolution (`global.` prefix, object vs JSON-string values, clean failure on an
  unresolved key).

### Fixed
- Removed stale `maxBodyBytes` fields from `examples/task-manager.json` (the field was
  removed from `openapi-in` in 0.9.0).

## [0.9.0] — 2026-07-24

Feature-complete **beta**. OpenAPI-first HTTP server nodes for Node-RED: an OpenAPI
spec is the source of truth — incoming requests are authenticated and validated
against it, handed to the flow as a clean message, and responses are validated
before they go out.

### Nodes
- **openapi-config** — loads the spec (inline / file / URL / context), dereferences
  `$ref`s and validates it, indexes operations, serves the meta endpoints, and holds
  the **authentication** config (ADR 0001).
- **openapi-in** — realizes one operation: registers the route, authenticates,
  validates the request (path/query/header/cookie + body), and emits a normalized
  `msg`; `onError` respond/output.
- **openapi-response** — sends the reply, validates the body against the spec
  (`strict`/`warn`/`off`), maps `msg.error` to RFC 7807 / plain, sends exactly once.

### Highlights
- **Auth in the config node** (no separate node): apiKey (header/query/cookie),
  http basic, and **bearer JWT verification** (HS256 secret / RS256·ES256 PEM) with
  **per-operation scope enforcement** (403 on insufficient scope).
- **Secrets are write-only credentials** — API keys, basic users and the JWT secret are
  stored as `password`-type Node-RED credentials: encrypted in `flows_cred.json`, never
  in `flows.json`, and not echoed back to the editor after saving.
- **Self-hosted Swagger-UI** at `{prefix}/docs` — no CDN dependency.
- Meta endpoints `openapi.json` / `openapi.yaml` / `docs`, individually toggleable and
  guarded against prefix collisions.
- **Express 4/5-robust route teardown** — no orphaned routes on redeploy.
- Error responses validated against the spec too.
- Body-size limiting delegated to Node-RED (`apiMaxLength` / `httpNodeMiddleware`,
  ADR 0003).

### Docs & examples
- Per-node requirement docs under `docs/nodes/`.
- A self-contained **Task Manager** showcase (`examples/task-manager.json`) exercising
  every feature, verified end-to-end in a real Node-RED
  (see `docs/examples/task-manager.md`).

### Tests
- 87 tests (mocha unit + `node-red-node-test-helper` integration).

### Deferred (post-0.9, each starts with its own ADR)
- OAuth2 / OIDC full flows + JWKS caching, spec-based mocking, per-operation
  metrics/tracing, Swagger 2.0 input, in-editor Monaco spec editor, per-`securityScheme`
  editor rendering.

## [0.1.0]

Initial MVP: the four-node skeleton and `lib/` foundation.

# 0001 — Auth is configured in the config node, not a separate node

- **Status:** Accepted
- **Date:** 2026-07-05

## Context

The MVP shipped a separate `openapi-auth` config node, referenced 1:1 by
`openapi-config` (`config.auth`). `openapi-config` held `authNode`/`authConfigId` and
exposed `getAuthNode()`; `openapi-in`'s handler called
`cfgNode.getAuthNode().authenticate(...)`.

The `securitySchemes` that auth is built from **come from the spec**, which lives in the
config node. Splitting the credentials for those schemes into a *second* node is an
artificial seam:

- The relationship is inherently **1:1** — there is no scenario where one auth config is
  shared across multiple specs, or multiple auth configs serve one spec, because schemes
  are spec-specific.
- It is one more node to create and wire for no reuse benefit.
- Node-RED **config nodes can hold `credentials`** themselves, so nothing technical
  requires a dedicated node.

## Decision

Fold authentication configuration **into `openapi-config`**. The `mode`
(`enforce`/`extract`) and the credentials (`apiKeys`, `basicUsers`) become fields on the
config node; the node exposes an `authenticate(security, schemes, req)` method that
delegates to the pure `lib/auth.js` functions. The separate `openapi-auth` node is
removed. `openapi-in` calls `cfgNode.authenticate(...)` directly.

`lib/auth.js` (the pure OR-of-ANDs evaluation, credential extraction, 401/403 decision)
is **unchanged** — this is a node-surface change, not a logic change.

## Consequences

- One fewer node type; simpler mental model and wiring. `package.json` `node-red.nodes`
  loses `openapi-auth`; `nodes/openapi-auth.*` are deleted.
- Existing flows that referenced a separate auth node must move their settings onto the
  config node. Acceptable — the project is pre-release (0.1.0).
- Secrets remain in Node-RED `credentials` (now on the config node), never in the flow
  export.
- Implemented by roadmap package **P2** (`docs/roadmap/foundation/`).
- Future (deferred): render the credential inputs **per securityScheme** in the editor,
  since the config node already knows the spec's schemes — tracked separately, not part
  of this decision.

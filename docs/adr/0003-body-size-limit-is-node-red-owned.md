# 0003 — Request body-size limiting is Node-RED's job, not a per-node field

- **Status:** Accepted
- **Date:** 2026-07-24
- **Refines:** the `maxBodyBytes` part of roadmap P1.3.

## Context

P1.3 added a configurable `maxBodyBytes` field to `openapi-in` with a streaming 413
in the node's own `bodyParser`. Its unit test passed because
`node-red-node-test-helper` runs the route with no upstream body parser, so
`req.body` is undefined and our parser (and its cap) executes.

Running the real Task Manager showcase in a live Node-RED revealed the field is largely
a **no-op** there: Node-RED parses request bodies on its HTTP-node routes **before**
`openapi-in` runs (the observed 400 came from `node-red/.../body-parser` with a
`raw-body` stack, on our `/api/v1/tasks` route). Consequences under real Node-RED:

- For the content-types Node-RED parses (JSON, `+json`, urlencoded, text), `req.body`
  is already set → our `bodyParser` skips → **`maxBodyBytes` is never enforced.**
- A malformed body yields Node-RED's own **400 before our authentication** runs.

So `maxBodyBytes` gives a false sense of protection: users can set it and believe they
have capped body size when, for the common case, they have not. We cannot reliably run
our size check ahead of Node-RED's parser — Node-RED controls the httpNode middleware
order; the real pre-route hook is the user's `httpNodeMiddleware` / `apiMaxLength`
setting, not a node field.

## Decision

Body-size limiting is **Node-RED's responsibility**. Concretely:

1. **Remove the `maxBodyBytes` editor field** from `openapi-in` (HTML + config read) —
   no user-facing knob that is silently bypassed.
2. **Keep the fallback stream parser** (it still runs only when `req.body` is undefined —
   content-types Node-RED did not parse) and bound it with a **fixed internal cap**
   (defense-in-depth), not a configurable field.
3. **Document** in the node's requirement doc, the example caveat, and `REQUIREMENTS.md`
   §4 that request body-size limiting is configured in Node-RED (`apiMaxLength` in
   `settings.js` / `httpNodeMiddleware`), applied uniformly and before the flow.

## Consequences

- One fewer `openapi-in` field; the remaining behaviour is honest.
- `REQUIREMENTS.md` §4 ("Body-Size-Limits konfigurierbar") is satisfied by pointing at
  Node-RED's mechanism rather than a per-node field.
- The P1.3 "413 over the limit" test still exercises the **fallback** path (which is
  exactly where the cap now lives — `req.body` undefined), repointed at the fixed
  internal cap; the suite stays green.
- Implemented by roadmap package **P15** (`docs/roadmap/nodes/openapi-in/`).

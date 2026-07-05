# Node-RED node testing standard (HTTP nodes)
<!-- project-specific — rewritten from the webapp browser standard; these nodes have NO frontend -->

Mandatory for every `openapi-*` node we build or change. These are **HTTP server
nodes** — they register Express routes, validate requests/responses against an
OpenAPI spec, and emit/consume Node-RED messages. **There is no browser frontend**,
so there is no rendering/`size`/`variant`/Playwright dimension: everything is proven
with **mocha + `node-red-node-test-helper` + `supertest`** (pure-logic parts with
plain mocha unit tests).

This is the test counterpart to the node **requirement docs** under
`docs/nodes/**` (those define WHAT the node must do; this defines HOW it is proven).

## The "fresh tests" rule

- **Per node-specific phase: write the node's tests NEW to this standard, and
  discard the node's old presence-only tests.** A "loads without error" test is
  never sufficient on its own.
- This applies to a **node's own** tests. **Cross-cutting tests** (shared spec-loader
  / validator / auth logic in `test/validator_spec.js`, `test/routing_auth_spec.js`)
  are out of scope here — do not throw those away.
- A test must assert an **observable outcome** — an HTTP status, a response body,
  a rejected request, an emitted `msg` shape, a route that is gone after redeploy —
  never mere "did not throw". A test must turn **red** if the feature is removed.
  Comments that document a known bug as acceptable ("imperfect", "deferred") are
  forbidden — a known bug gets a failing test or a bug phase.

## Two test kinds

- **Unit tests** (plain mocha, no Node-RED) for the pure `lib/` logic a node relies
  on: `spec-loader`, `validator`, `auth`, `routing`. Fast, dependency-light.
- **Integration tests** via `node-red-node-test-helper`: load the real node(s) into a
  test Node-RED, drive HTTP with `supertest` (`helper.request()`), assert status +
  body. This is how route registration, validation, auth, meta endpoints, and the
  message contract are proven.

We do **not** use a browser or Playwright — there is nothing to render.

## Per-node test flow construction

Build a dedicated test flow per node:

- At minimum an **`openapi-config`** (with an inline spec) **+ the node under test**.
- For `openapi-in`: wire its **request** output to a capture (an intercept on
  `node.send`, or a downstream `openapi-response` for the full round-trip).
- For `openapi-response`: feed it a `msg` carrying `req`/`res`/`openapi` (produced by
  an `openapi-in`, or a hand-built stub) and assert what reaches the HTTP client.
- If the operation has a **`security`** requirement, include an **`openapi-auth`**
  config (or the merged auth config on `openapi-config`) so 401/403/valid paths can be
  exercised.
- Use a small, self-contained inline spec (Petstore-style) as the fixture.

**Flow hygiene (check after creating OR changing a test flow):**
- Config nodes (`openapi-config`, `openapi-auth`) have **no** `x`/`y`; flow nodes
  (`openapi-in`, `openapi-response`, `inject`, `debug`) **must** have `x`/`y` or they
  silently register as config nodes and never run.
- The flow must load with **zero errors** at Node-RED startup.
- Give every config field the node does not set itself a sensible default.
- Allow the deferred spec load a tick (`setTimeout(…, ~200ms)`) before the first request.

## What to test

### Node-level
- The node produces **no errors at Node-RED startup** and is registered (not "missing").
- On `close`/redeploy the node's **routes are removed** — a second load must not throw
  "double registration", and the old path must stop responding (no orphan routes).

### `openapi-config`
- Loads a spec from **inline** (and at least one of file/url/context); reports the
  **operation count**; a malformed spec sets the node to an **error** state (does not crash).
- Serves the enabled **meta endpoints** (`openapi.json` / `openapi.yaml` / `/docs`) at
  the server prefix; each is **individually toggleable** (disabled → 404).
- The admin operations endpoint returns the indexed operations for the editor dropdown.

### `openapi-in`
- Registers the operation's route at the correct prefixed, Express-rewritten path
  (`{param}` → `:param`).
- **Valid request** → emits a normalized `msg` with `payload`, `parameters`
  (type-coerced: e.g. a numeric path param arrives as a number), `auth`, `openapi`,
  `req`, `res`.
- **Invalid request** (bad param type, missing required, body schema violation) →
  per `onError`: **auto-400** with error details, **or** handoff on the error output.
- **Auth**: missing credential → **401**; wrong credential → **403**; valid → passes and
  fills `msg.auth`. Cover an **OR** of requirements and, where relevant, an **AND** within
  one requirement.

### `openapi-response`
- Sends `msg.statusCode` + `msg.payload`; validates the body against the spec response
  schema per mode — **strict** (invalid → 500 + log), **warn** (send + warn), **off** (send).
- Maps `msg.error` to a spec-shaped error body (**RFC 7807 problem+json** by default, or
  plain per config).
- Responds **exactly once** (never double-sends; respects `res.headersSent`).

### `openapi-auth` (config)
- `enforce` vs `extract` mode; secrets read from **credentials**, not flow config.
- apiKey (header/query/cookie), http basic, http bearer extraction — matching the spec's
  `securitySchemes`.

## Keep the suite from exploding

Pick representative values + boundaries; do **not** combinatorially explode
schemes × params × modes. Favour a few high-signal cases over exhaustive matrices.

## Per-node test catalogue (`.md`)

For every node, maintain a short **`.md`** listing the node's tests and their **test
goal(s)** — for human review, kept current when the tests change.

> Location convention: `test/openapi-<node>.tests.md`, linked from the node's
> requirement doc (`docs/nodes/openapi-<node>.md`).

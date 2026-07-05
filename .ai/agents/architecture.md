# Architecture Defaults
<!-- project-specific — belongs in this repo, not in a shared agent-os -->

## Module structure

| Path | Responsibility |
|---|---|
| `lib/spec-loader.js` | Resolve a spec (inline/file/url/context), parse JSON+YAML, `$ref`-dereference & validate, build the operation index, compute the server prefix. |
| `lib/validator.js` | AJV request/response validation against a dereferenced operation (param coercion + body/response schemas). |
| `lib/auth.js` | Pure auth logic: extract credentials per `securityScheme`, evaluate an operation's `security` (OR of ANDs), 401/403 decision. |
| `lib/routing.js` | OpenAPI-path → Express-path rewrite, prefix join, route register/remove on `RED.httpNode`. |
| `lib/meta.js` | Register/unregister the meta endpoints (`openapi.json`, `openapi.yaml`, `/docs`). |
| `nodes/openapi-*.js` + `.html` | Node-RED registrations — thin adapters that wire node config to the `lib/` functions. |

## Key invariants

- **`lib/` is pure and node-red-free.** No file under `lib/` may `require("node-red")`, or depend on a live `RED` runtime, beyond the plain Express `req`/`res`/`RED.httpNode` values passed in as arguments. `lib/` functions must stay unit-testable **without** starting Node-RED (`test/validator_spec.js` and `test/routing_auth_spec.js` prove this).
- **Nodes are thin.** A `nodes/*.js` file maps config → `lib/` calls and handles Node-RED lifecycle (`on("close")`, status). Business logic lives in `lib/`.
- The OpenAPI spec is the **single source of truth**: routes, validation schemas, and `securitySchemes` all derive from it at runtime. Nodes do not hardcode paths or schemas.
- **Route lifecycle:** every route (operation + meta) registered on deploy must be removed on `close`/redeploy — no orphaned routes, no double registration in the Express router stack.
- Secrets live only in Node-RED **credentials**, never in the exported flow.

## Stop conditions

Stop and write down the decision needed (as a `blocker` in the package, `status: blocked`) if:

1. A phase requires a new runtime dependency not already in `package.json`.
2. A phase requires changing **how routes are registered/removed** on `RED.httpNode` (e.g. Express 4 → 5 router internals) in a way that affects every node.
3. A phase requires a **new node type** not in the current set (`openapi-config`, `openapi-auth`, `openapi-in`, `openapi-response`).
4. A phase changes the **message contract** emitted by `openapi-in` (`msg.payload`/`parameters`/`auth`/`openapi`/`req`/`res`) that downstream nodes rely on.
5. Validation fails twice for the same phase without a clear fix.
6. A spec/requirement doc contradicts the implementation in a way that cannot be resolved without a product decision.

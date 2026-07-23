# openapi-config

Config node. Holds the OpenAPI spec, indexes its operations, serves the meta
endpoints, and **holds the authentication config** (ADR 0001 — there is no separate
`openapi-auth` node). Consumed by `openapi-in` and `openapi-response` via accessors.

## Config fields

| Field | Type | Default | Meaning / effect |
|---|---|---|---|
| `name` | string | `""` | Editor label only. |
| `source` | enum `inline`\|`file`\|`url`\|`context` | `inline` | Where the spec is loaded from. The editor shows only the matching input(s). |
| `inline` | string (JSON or YAML) | `""` | Used when `source=inline`. Parsed JSON-first, then YAML. Empty → load error. |
| `file` | string path | `""` | Used when `source=file`. Absolute, or resolved against the Node-RED cwd. |
| `url` | string URL | `""` | Used when `source=url`. Fetched at deploy (HTTP[S]); non-2xx → load error. |
| `contextKey` | string | `""` | Used when `source=context`. Supports `flow.`/`global.` prefixes; value may be an object or a JSON/YAML string. |
| `contextStore` | string | `""` (default store) | Context store name for `contextKey`. |
| `authMode` | enum `enforce`\|`extract` | `enforce` | `enforce`: validate credentials against the fields below and reject (401/403) on failure. `extract`: only pull the token out and pass it to the flow in `msg.auth`; the flow decides. |
| `metaJson` | bool | `true` | Serve `GET {prefix}/openapi.json`. |
| `metaYaml` | bool | `true` | Serve `GET {prefix}/openapi.yaml`. |
| `metaDocs` | bool | `true` | Serve `GET {prefix}/docs` (Swagger-UI). |

### Credentials (stored via Node-RED `credentials`, never in the flow export)

| Credential | Type | Meaning |
|---|---|---|
| `apiKeys` | text | Allow-list of accepted API-key values, one per line or comma-separated. In `enforce` mode an `apiKey` scheme passes only if the presented key is in this list; an empty list means "presence is enough". |
| `basicUsers` | text | `user:password` per line. In `enforce` mode an `http basic` scheme passes only if the presented pair matches. |

## Behaviour

- **Spec load** (deferred to startup, re-run on redeploy): resolve → validate +
  dereference (`@apidevtools/swagger-parser`) → index operations
  (`operationId` → `{method, path, parameters, requestBody, responses, security}`) →
  compute the server prefix from the first `servers[]` entry. On failure the node goes
  to an **error** state (`node.error`, `spec-error` event) and does not crash.
- **Meta endpoints** are (re)registered on each successful load and removed on `close`;
  each is individually toggleable (disabled → the route is not registered → 404).
- **`node.authenticate(security, schemes, req)`** — evaluates the operation's `security`
  (an OR of AND requirement objects) against the request, delegating to `lib/auth`
  with `authMode` + the credentials above. Returns
  `{ ok, status?, auth: { scheme, token, claims, scopes, principal }, error? }`.
  No security on the operation → open (`ok: true`). Missing credential → `401`;
  present-but-rejected → `403`. Supported schemes: `apiKey` (header/query/cookie),
  `http basic`, `http`/`oauth2`/`oidc` bearer (extracted; full verification is Roadmap).
- **Accessors** for dependent nodes: `getOperation(id)`, `getPrefix()`,
  `getSecuritySchemes()`.
- **Admin endpoint** `GET /openapi-config/:id/operations` (permission `flows.read`) —
  the indexed operation list for the editor dropdown.

## Related

- ADR: [0001 — auth in config, not a separate node](../adr/0001-auth-config-not-separate-node.md)
- Auth logic: `lib/auth.js`; spec loading: `lib/spec-loader.js`; meta: `lib/meta.js`.
- Tests: `test/openapi-config.tests.md`.

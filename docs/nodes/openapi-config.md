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
| `metaDocs` | bool | `true` | Serve `GET {prefix}/docs` (Swagger-UI, self-hosted from `swagger-ui-dist` — no CDN; assets under `{prefix}/docs/`). |

### Credentials

Stored as Node-RED **credentials** — written encrypted to `flows_cred.json` (with the
instance's `credentialSecret`), **never to `flows.json`**. The secret-bearing ones are
`password`-type: **write-only** in the editor (not shown/echoed after saving; re-enter to
change). `jwtPublicKey` is not a secret and stays a plain (editable) credential.

| Credential | Type | Meaning |
|---|---|---|
| `apiKeys` | password | Allow-list of accepted API-key values, one per line or comma-separated. In `enforce` mode an `apiKey` scheme passes only if the presented key is in this list; an empty list means "presence is enough". |
| `basicUsers` | password | `user:password` per line. In `enforce` mode an `http basic` scheme passes only if the presented pair matches. |
| `jwtSecret` | password | HS256 shared secret for verifying bearer JWTs. When set (and `enforce`), a bearer token is verified (signature + expiry). |
| `jwtPublicKey` | text (PEM) | RS256/ES256 public key for verifying bearer JWTs; **takes precedence** over `jwtSecret`. Not a secret. Remote JWKS-URL verification is roadmap (P9). |

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
  a rejected api-key/basic credential → `403`. Supported schemes: `apiKey`
  (header/query/cookie), `http basic`, and `http`/`oauth2`/`oidc` **bearer** — when a
  `jwtSecret` (HS256) or `jwtPublicKey` (RS256/ES256) is configured the JWT is verified
  (signature + expiry): an invalid or expired token → `401` and, on success, the verified
  claims are in `msg.auth.claims`. Without a configured key the token is only extracted
  (presence accepted). Remote JWKS-URL verification + caching is roadmap (P9).
  **Scope enforcement:** when the operation's security requires scopes, they are checked
  against the verified token's `scope`/`scp` claim — a missing required scope →
  `403` (authenticated but not authorized); `msg.auth.scopes` carries the token's
  effective scopes.
- **Accessors** for dependent nodes: `getOperation(id)`, `getPrefix()`,
  `getSecuritySchemes()`.
- **Admin endpoint** `GET /openapi-config/:id/operations` (permission `flows.read`) —
  the indexed operation list for the editor dropdown.

## Related

- ADR: [0001 — auth in config, not a separate node](../adr/0001-auth-config-not-separate-node.md)
- Auth logic: `lib/auth.js`; spec loading: `lib/spec-loader.js`; meta: `lib/meta.js`.
- Tests: `test/openapi-config.tests.md`.

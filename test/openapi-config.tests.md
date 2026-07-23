# openapi-config — test catalogue

Per `.ai/agents/node-testing.md`. Kept current when the tests change.

## `test/openapi-config_spec.js`

### Structural — openapi-auth removal (runs without node-red)
| Test | Goal |
|---|---|
| package.json no longer registers openapi-auth | `node-red.nodes` has `openapi-config` but not `openapi-auth` — proves the node type is gone. |
| openapi-auth node files are deleted | `nodes/openapi-auth.js` + `.html` no longer exist. |
| example flow has no openapi-auth node / stray auth reference | `examples/flow.json` contains no `openapi-auth` node and the config node carries no `auth` field — proves no orphaned reference (criterion 5). |

### Auth merged into config (integration, node-red required)
| Test | Goal |
|---|---|
| exposes authenticate() delegating to lib/auth; no legacy getAuthNode() | The config node's `authenticate()` returns the correct ok/401/403 for apiKey (valid/wrong/missing), basic (valid/wrong), bearer (extracted token surfaced) and an OR of requirements — i.e. it delegates to `lib/auth` with the node's own `authMode` + credentials. Legacy `getAuthNode()` is gone. |
| secured operation → 401 when the credential is missing | `POST /api/v1/pets` (createPet, `ApiKeyAuth`) without `X-API-Key` → 401 over HTTP, via `openapi-in` → `cfgNode.authenticate`. |
| secured operation → 403 when the credential is wrong | Same route with a wrong `X-API-Key` (enforce + allow-list) → 403. |
| secured operation → passes with a valid credential and fills msg.auth | Correct `X-API-Key` + valid body → auth passes; the emitted `msg.auth.scheme === "ApiKeyAuth"` and `msg.auth.token` is the key; response 201. |

## Related coverage
- `test/routing_auth_spec.js` — unit tests of `lib/auth.authenticate` across all schemes (the logic the config node delegates to).
- `test/integration_spec.js` — meta endpoint + unsecured operation (getPet) request/validation path.

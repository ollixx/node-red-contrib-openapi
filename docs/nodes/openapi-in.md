# openapi-in

Input node. Realizes **one** operation of the spec: registers its route, runs auth,
validates the incoming request, and emits a normalized message — or routes
validation/auth failures per `onError`. One node instance = one endpoint.

## Config fields

| Field | Type | Default | Meaning / effect |
|---|---|---|---|
| `name` | string | `""` | Editor label only. |
| `server` | config-node ref (`openapi-config`) | — (**required**) | The spec this operation belongs to. Provides the operation index, prefix, security schemes, and `authenticate()`. |
| `operation` | string (`operationId`) | — (**required**) | Which operation to realize. Chosen in the editor from the config node's operation list. Resolved via `getOperation()`; an unknown id puts the node in an error state and registers no route. |
| `onError` | enum `respond` \| `output` | `respond` | `respond`: validation/auth failures are answered automatically (400/401/403/413). `output`: the failure is sent to the **2nd** output (`{statusCode, payload, errors, req, res, openapi}`) and the flow produces the response. |
| `maxBodyBytes` | integer (bytes) | `1048576` (1 MB) | Request body-size limit. A body exceeding it is rejected with **413** before the handler runs. `0`/invalid → default. |

## Behaviour

- **Route registration:** on spec load (and redeploy) the operation's path is prefixed
  and rewritten (`{param}` → `:param`) and registered on `RED.httpNode`; removed on
  `close` (no orphan routes). Until the spec is loaded the node shows "waiting for spec".
- **Body parsing:** buffers the request (up to `maxBodyBytes`), parsing JSON / `+json`,
  `application/x-www-form-urlencoded`, or text by Content-Type.
- **Authentication:** delegates to the config node's `authenticate(security, schemes, req)`
  (ADR 0001). Missing credential → 401, rejected → 403; result in `msg.auth`.
- **Request validation:** path/query/header/cookie parameters (typed + coerced,
  `required` enforced) and `requestBody` against its JSON schema (AJV).
- **Emitted message** (1st output, on success):
  - `msg.payload` — validated body (or the parameters for body-less methods)
  - `msg.parameters` — `{ path, query, header, cookie }`, type-coerced
  - `msg.auth` — `{ scheme, token, claims, scopes, principal, schemes }`
  - `msg.openapi` — `{ operationId, method, path, statusCodes }`
  - `msg.req` / `msg.res` — the Express objects (consumed by `openapi-response`)
- **On failure** (`onError`): `respond` → auto 400 (validation) / 401·403 (auth) / 413
  (oversized body) with an error detail body; `output` → the message on the 2nd output.

## Outputs

1. **request** — the normalized `msg` for a valid request.
2. **error** — validation/auth failures (only carries messages when `onError: output`).

## Related

- Config + auth: [openapi-config.md](openapi-config.md). Reply: [openapi-response.md](openapi-response.md).
- Validation logic: `lib/validator.js`; routing: `lib/routing.js`.
- Tests: `test/openapi-in.tests.md`.

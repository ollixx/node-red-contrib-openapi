# openapi-response

Output node. Sends the HTTP reply for an `openapi-in` request and holds it to the
spec: determines status + body (incl. mapping `msg.error` to a spec-shaped error),
validates the body against the spec's response schema per mode, applies headers, and
guarantees exactly one send.

## Config fields

| Field | Type | Default | Meaning / effect |
|---|---|---|---|
| `name` | string | `""` | Editor label only. |
| `server` | config-node ref (`openapi-config`) | — (**required**) | The spec used to look up the operation's response schema for validation. |
| `validation` | enum `strict` \| `warn` \| `off` | `warn` | How a response body that violates the spec's response schema is handled — see below. |
| `errorFormat` | enum `problem` \| `plain` | `problem` | Shape of the body built from `msg.error`. `problem` = RFC 7807 `{type, title, status, detail}`; `plain` = `{error, status, detail}`. |
| `defaultStatus` | integer | `200` | Status used when neither `msg.statusCode` nor `msg.error` sets one. |

## Behaviour

- **Status + body:**
  - `msg.error` set → error response: status from `msg.error.statusCode` / `msg.statusCode`
    / `msg.error.status` / `500`; body built per `errorFormat`.
  - otherwise → status from `msg.statusCode` / `defaultStatus`; body = `msg.payload`.
- **Response validation** (only on the success path, only when `msg.openapi.operationId`
  resolves a schema for the status; `NXX`/`default` fallback applies):
  - `strict` — an invalid body is **not** sent; replaced with `500`.
  - `warn` — the body is sent, the mismatch is logged and the node status flags it.
  - `off` — no validation; the body is sent as-is.
- **Headers:** `msg.headers` (object) are applied to the response.
- **Send-exactly-once:** if `res` is missing the node warns and does nothing; if
  `res.headersSent` it refuses to write again (no double send). A body that is an object
  is sent as JSON, `undefined`/`null` ends with just the status, otherwise sent as-is.

## Inputs / outputs

- **Input:** a message from `openapi-in` carrying `msg.res` (and usually `msg.openapi`).
  Set `msg.statusCode` + `msg.payload` for success, or `msg.error` for a spec-shaped error.
- **Outputs:** none (terminal node).

## Related

- Request side: [openapi-in.md](openapi-in.md). Spec/config: [openapi-config.md](openapi-config.md).
- Validation logic: `lib/validator.js`.
- Tests: `test/openapi-response.tests.md`.

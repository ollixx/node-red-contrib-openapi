# openapi-response — test catalogue

Per `.ai/agents/node-testing.md`. Kept current when the tests change.

Driven with a recording fake `res`, so what the node actually writes (status,
body, headers) is observed directly rather than inferred from an HTTP round-trip.

## `test/openapi-response_spec.js`
| Test | Goal |
|---|---|
| validation=off sends the payload even when it violates the spec | `off` performs no response validation — the body goes out unchanged. |
| validation=warn still sends the payload | `warn` sends the response and flags the mismatch rather than blocking it. |
| validation=strict replaces an invalid response with 500 | `strict` refuses to emit a body that violates the spec's response schema. |
| maps msg.error to an RFC 7807 problem body | `msg.error` becomes `{type, title, status, detail}` with the error's status code (default `errorFormat: problem`). |
| maps msg.error to a plain error body when errorFormat=plain | `plain` yields `{error, status, detail}` and no RFC 7807 `type`. |
| does not send twice when the response was already sent | `res.headersSent` short-circuits — the send-exactly-once guarantee. |
| applies msg.headers to the response | Custom headers from the flow reach the response. |
| validation=strict replaces a spec-violating error body with 500 | P6 — `msg.error` bodies are validated too; a 404 error body that violates the spec's error schema is replaced with 500 under strict. |
| validation=warn still sends a spec-violating error body | P6 — under warn the error body is sent despite the mismatch. |
| error body sent unchanged when the spec has no schema for that status | P6 — a status with no response schema (`matched=false`) is sent unchanged, even under strict (no false 500). |

## Related coverage
- `test/validator_params_spec.js` — the response-schema matching (`NXX` fallback, `matched=false`) the modes build on.

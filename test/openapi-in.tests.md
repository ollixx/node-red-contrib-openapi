# openapi-in — test catalogue

Per `.ai/agents/node-testing.md`. Kept current when the tests change.

## `test/openapi-in_spec.js`
| Test | Goal |
|---|---|
| rejects a request body larger than maxBodyBytes with 413 | The configurable body-size limit aborts an oversized request with 413 **before** the handler (validation/auth) runs — no unbounded buffering. |
| onError=output routes a validation failure to the 2nd output | With `onError: "output"` an invalid request produces no automatic response; the message goes to the error (2nd) output carrying `statusCode: 400` + `errors`, and the flow produces the response. |

## `test/integration_spec.js` (openapi-in via HTTP)
| Test | Goal |
|---|---|
| auto-responds 400 on an invalid path parameter | With `onError: "respond"` a bad path param is rejected with 400 + details. |
| emits a normalized msg for a valid request | A valid request emits `msg` with coerced `parameters`, `openapi.operationId`, and reaches an `openapi-response`. |

## Related coverage
- `test/openapi-config_spec.js` — auth over HTTP through `openapi-in` (401/403/200 + `msg.auth`).
- `test/routing_spec.js` — the route register/remove lifecycle `openapi-in` relies on.
- `test/validator_params_spec.js` — the request-validation logic behind the 400s.

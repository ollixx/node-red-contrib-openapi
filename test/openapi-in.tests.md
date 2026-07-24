# openapi-in — test catalogue

Per `.ai/agents/node-testing.md`. Kept current when the tests change.

## `test/openapi-in_spec.js`
| Test | Goal |
|---|---|
| onError=output routes a validation failure to the 2nd output | With `onError: "output"` an invalid request produces no automatic response; the message goes to the error (2nd) output carrying `statusCode: 400` + `errors`, and the flow produces the response. |

## `test/body-parser_spec.js` (fallback parser, ADR 0003)
| Test | Goal |
|---|---|
| fixed 1 MB default cap (not configurable) | Body-size limiting is Node-RED's job; the fallback parser only carries a fixed internal cap. |
| parses JSON / urlencoded under the cap | Correct parsing on the fallback path. |
| rejects a body over the cap with 413, no next | The fixed cap aborts an oversized fallback body without running the handler. |
| skips when the body was already parsed upstream | No-op when Node-RED already set `req.body`. |

## `test/integration_spec.js` (openapi-in via HTTP)
| Test | Goal |
|---|---|
| auto-responds 400 on an invalid path parameter | With `onError: "respond"` a bad path param is rejected with 400 + details. |
| emits a normalized msg for a valid request | A valid request emits `msg` with coerced `parameters`, `openapi.operationId`, and reaches an `openapi-response`. |

## Related coverage
- `test/openapi-config_spec.js` — auth over HTTP through `openapi-in` (401/403/200 + `msg.auth`).
- `test/routing_spec.js` — the route register/remove lifecycle `openapi-in` relies on.
- `test/validator_params_spec.js` — the request-validation logic behind the 400s.

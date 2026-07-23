# node-red-contrib-openapi

OpenAPI-first HTTP-server nodes for Node-RED. Keep an OpenAPI specification as the
source of truth and let Node-RED realize its endpoints: incoming requests are
authenticated and validated against the spec, handed to the flow as a clean
message, and responses are validated before they go out. Meta endpoints
(`openapi.json`, `openapi.yaml`, Swagger-UI docs) are served automatically.

See [REQUIREMENTS.md](./REQUIREMENTS.md) for the full concept and roadmap.

## Nodes

| Node | Type | Purpose |
|------|------|---------|
| `openapi-config` | config | Loads the spec (inline / file / URL / context), dereferences & validates it, indexes operations, serves the meta endpoints, and holds the authentication config (derived from the spec's `securitySchemes`; enforce or extract-only; secrets stored as credentials). |
| `openapi-in` | input | Implements one operation: registers the route, authenticates, validates the request, emits a normalized `msg`. |
| `openapi-response` | output | Sends the reply, validates the body against the spec, maps `msg.error` to a spec-shaped error (RFC 7807 by default). |

## Install

From your Node-RED user directory (`~/.node-red`):

```bash
npm install /path/to/node-red-contrib-openapi
```

Requires Node.js ≥ 18 and Node-RED ≥ 3.0.

## Quick start

1. Add an **openapi-config** node and point it at a spec (try `examples/petstore.json`).
2. Drop an **openapi-in** node, pick the config node, choose an operation from the dropdown.
3. Wire it to your logic, then to an **openapi-response** node.
4. Deploy. The route is live; `GET /<prefix>/openapi.json` and `/<prefix>/docs` are served.

The message emitted by `openapi-in`:

```js
msg.payload      // validated request body (or parameters for body-less methods)
msg.parameters   // { path, query, header, cookie } — type-coerced
msg.auth         // { scheme, token, claims, scopes, principal }
msg.openapi      // { operationId, method, path, statusCodes }
msg.req, msg.res // Express objects, consumed by openapi-response
```

To respond, set `msg.statusCode` + `msg.payload`, or set `msg.error` for a
spec-shaped error. See `examples/flow.json` for a working Petstore flow.

## Development

```bash
npm install
npm test
```

`test/routing_auth_spec.js` runs without external services; the validator and
integration specs require the installed dependencies and Node-RED.

## Status

MVP. Planned next: in-editor Monaco spec editor with completion/validation, full
OAuth2/JWT verification, spec-based mocking, and per-operation metrics
(see REQUIREMENTS.md §7).

## License

MIT

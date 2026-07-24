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
npm install ollixx/node-red-contrib-openapi
```

…or from a local checkout: `npm install /path/to/node-red-contrib-openapi`.

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

## Examples

- `examples/flow.json` — minimal Petstore (get/create).
- `examples/task-manager.json` — a **self-contained showcase** (inline spec) that
  exercises everything: apiKey **and** bearer-JWT auth with per-operation scopes,
  path/query/body validation, RFC 7807 errors, 204, and the self-hosted Swagger-UI.
  Walkthrough + curl cheat sheet: [docs/examples/task-manager.md](docs/examples/task-manager.md).

## Development

```bash
npm install
npm test
```

`test/routing_auth_spec.js` runs without external services; the validator and
integration specs require the installed dependencies and Node-RED.

## Status

**0.9.0 — feature-complete beta.** All core features are in and tested (see
[CHANGELOG.md](CHANGELOG.md)); the public API is stabilising toward 1.0. Deferred for
later: OAuth2/OIDC full flows + JWKS, spec-based mocking, per-operation metrics,
Swagger 2.0 input, an in-editor Monaco spec editor, and per-`securityScheme` editor
rendering (see REQUIREMENTS.md §7).

## License

MIT

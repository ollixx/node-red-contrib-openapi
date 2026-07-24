# Example: Task Manager API

A self-contained showcase flow ([`examples/task-manager.json`](../../examples/task-manager.json))
that exercises every node feature. The OpenAPI spec is **inline** in the config node, so
you only need to import the flow — no external files.

## What it demonstrates

| Feature | Where |
|---|---|
| apiKey auth (header `X-API-Key`) | `GET /tasks`, `GET /tasks/{id}` → 401 / 403 / 200 |
| Bearer **JWT** verification (HS256) | all write ops — invalid/expired token → 401 |
| Per-operation **scope** enforcement | `POST`/`PUT` need `tasks:write`, `DELETE` needs `tasks:admin` → 403 on insufficient scope |
| Path-param validation | `GET /tasks/notanumber` → 400 |
| Query validation (enum/int) | `GET /tasks?status=bogus` → 400 |
| Request-body validation | `POST /tasks` with no `title` → 400 + field details |
| `msg.error` → RFC 7807 `problem+json` | `GET /tasks/999` → 404 problem body |
| 204 No Content | `DELETE /tasks/{id}` |
| Response validation (`warn`) | every `openapi-response` node |
| Meta endpoints + self-hosted Swagger-UI | `GET /api/v1/openapi.json`, `/api/v1/openapi.yaml`, `/api/v1/docs` |

## Run it

1. Install the package into your Node-RED user dir (`~/.node-red`):
   ```bash
   npm install /path/to/node-red-contrib-openapi
   ```
2. In the editor: **Menu → Import**, paste `examples/task-manager.json`, **Import**.
3. Open the **Task API** (`openapi-config`) node and set the credentials:
   - **API keys:** `demo-key-123`
   - **JWT secret:** `demo-secret`
   - Leave **Auth mode** = *Enforce*. **Deploy**.
4. The routes are live under `/api/v1`; open **`/api/v1/docs`** for the Swagger-UI.

## A demo bearer token

The write/admin operations need a JWT signed with the secret above, carrying the scopes.
Generate one (valid 1 year):

```bash
node -e "console.log(require('jsonwebtoken').sign({sub:'demo',scope:'tasks:write tasks:admin'},'demo-secret',{expiresIn:'365d'}))"
```

A read-only token (to see a `403` from scope enforcement) uses `scope:'tasks:read'`.

## curl cheat sheet

```bash
KEY='X-API-Key: demo-key-123'
JWT="Authorization: Bearer $(node -e "console.log(require('jsonwebtoken').sign({sub:'demo',scope:'tasks:write tasks:admin'},'demo-secret',{expiresIn:'1h'}))")"
B=http://127.0.0.1:1880/api/v1     # adjust host/port to your Node-RED

curl -i $B/tasks                                  # 401 (no key)
curl -s -H "$KEY" $B/tasks                         # 200 list
curl -s -H "$KEY" "$B/tasks?status=open&limit=1"   # filtered
curl -i -H "$KEY" $B/tasks/notanumber              # 400 (path type)
curl -s -H "$KEY" $B/tasks/999                      # 404 problem+json
curl -i -X POST -H "$JWT" -H 'Content-Type: application/json' \
     -d '{"priority":"high"}' $B/tasks              # 400 (missing title)
curl -s -X POST -H "$JWT" -H 'Content-Type: application/json' \
     -d '{"title":"Ship it","priority":"high"}' $B/tasks   # 201 created
curl -i -X DELETE -H "$JWT" $B/tasks/1             # 204
curl -s $B/openapi.json | head                      # meta spec (no auth)
```

## Notes

- **Body-size limit caveat:** Node-RED installs its own JSON body-parser on the HTTP
  node routes, so it parses (and size-limits, per `httpNodeMiddleware`/`apiMaxLength`)
  the body **before** `openapi-in`. The node's own `maxBodyBytes` therefore only applies
  when no upstream parser has already consumed the body (e.g. content-types Node-RED does
  not parse). Rely on Node-RED's settings for the primary limit.
- Node docs: [openapi-config](../nodes/openapi-config.md) · [openapi-in](../nodes/openapi-in.md) · [openapi-response](../nodes/openapi-response.md).

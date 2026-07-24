# meta endpoints — test catalogue

Per `.ai/agents/node-testing.md`. The meta endpoints are served by `openapi-config`
via `lib/meta`; these are driven against a real Express app with supertest.

## `test/meta_spec.js`
| Test | Goal |
|---|---|
| serves openapi.json / .yaml / docs at the prefix | All three meta endpoints respond 200 at the server prefix with the right content types and content (spec title, `openapi:` YAML, Swagger-UI HTML). |
| individually toggles endpoints off (disabled → 404) | Each of json/yaml/docs is independently switchable; disabled → 404. |
| unregisterMeta removes the routes (no orphan) | Teardown removes registered meta routes. |
| warns and skips on a prefix collision | Two configs sharing a prefix: the second registers nothing and returns a collision warning (no duplicate registration). |

### Self-hosted Swagger-UI (P5)
| Test | Goal |
|---|---|
| serves the docs HTML referencing LOCAL assets, not a CDN | `/docs` HTML references `{prefix}/docs/swagger-ui.css` + `…-bundle.js` and contains no jsdelivr/CDN URL. |
| serves the swagger-ui assets locally with the right content types | The css/js asset routes 200 with `text/css` / `…javascript`, served from `swagger-ui-dist`. |
| disabling docs 404s both the page and the assets | `metaDocs: false` → page **and** asset routes are 404. |
| unregisterMeta removes the docs page and its asset routes | Teardown removes the page + both asset routes (no orphan). |

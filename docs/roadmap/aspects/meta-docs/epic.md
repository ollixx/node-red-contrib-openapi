# Epic: aspects/meta-docs

Cross-cutting meta endpoints — `lib/meta.js`: serving `openapi.json` / `openapi.yaml`
(raw or dereferenced) and a Swagger-UI `/docs` page at the server prefix, each
individually toggleable. Roadmap: self-hosted Swagger-UI (drop the CDN dependency),
optional health/info endpoint, dereferenced-vs-raw choice.

Registered by `openapi-config`.

Packages follow [`.ai/agents/roadmap-phase-schema.md`](../../../../.ai/agents/roadmap-phase-schema.md).

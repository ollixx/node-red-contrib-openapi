# Epic: aspects/spec-handling

Cross-cutting spec loading — `lib/spec-loader.js`: resolving a spec from all sources
(inline/file/url/context), parsing JSON **and** YAML, `$ref` dereferencing and
validation (OpenAPI 3.0/3.1, Swagger 2.0 later), the operation index
(`operationId` → operation), server-prefix derivation, and robust reload without a
Node-RED restart.

Not tied to a single node — `openapi-config` consumes this.

Packages follow [`.ai/agents/roadmap-phase-schema.md`](../../../../.ai/agents/roadmap-phase-schema.md).

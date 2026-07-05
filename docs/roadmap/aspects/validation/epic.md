# Epic: aspects/validation

Cross-cutting request/response validation — `lib/validator.js`: AJV-based parameter
coercion + validation (path/query/header/cookie), requestBody and response-body schema
validation, media-type selection (incl. wildcards / `+json`), OpenAPI `nullable`
handling, and `ajv-formats`. Meaningful error objects (path, rule, received value).

Consumed by `openapi-in` (request) and `openapi-response` (response).

Packages follow [`.ai/agents/roadmap-phase-schema.md`](../../../../.ai/agents/roadmap-phase-schema.md).

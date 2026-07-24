# Epic: aspects/mocking

Spec-based mocking — producing responses straight from the OpenAPI spec (declared
`examples` or schema-generated data) without any flow logic between `openapi-in` and
`openapi-response`. A deploy-time or per-operation "mock mode" for prototyping an API
before its behaviour exists.

Requires its own ADR (mock semantics: example-vs-faker, opt-in granularity) before
implementation — see [ADR 0002](../../../adr/0002-post-mvp-feature-roadmap.md).
Packages follow [`.ai/agents/roadmap-phase-schema.md`](../../../../.ai/agents/roadmap-phase-schema.md).

# Epic: aspects/observability

Per-operation metrics and tracing — request counts, latencies, status distributions,
and trace spans keyed by `operationId`, exposed to a metrics/tracing backend.

Requires its own ADR (backend choice: Prometheus endpoint vs OpenTelemetry, cardinality
limits) before implementation — see [ADR 0002](../../../adr/0002-post-mvp-feature-roadmap.md).
Packages follow [`.ai/agents/roadmap-phase-schema.md`](../../../../.ai/agents/roadmap-phase-schema.md).

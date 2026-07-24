---
id: P11
title: "Metriken/Tracing pro Operation"
epic: aspects/observability
findings:
  - "REQUIREMENTS §7: pro Operation sollen Metriken und Tracing verfügbar sein (Request-Zähler, Latenzen, Status-Verteilung, Trace-Spans keyed by operationId)."
acceptance:
  - "Pro Operation werden Request-Count, Latenz (Histogramm/Summary) und Status-Code-Verteilung erfasst, gekeyed nach operationId."
  - "Die Daten sind über ein gewähltes Backend exponiert (z. B. Prometheus-Endpoint oder OpenTelemetry-Export)."
  - "Kardinalität ist begrenzt (keine unbounded Labels aus Pfad-Parametern)."
verify: http
dependencies: []
status: deferred
deferred_reason: "Braucht eine eigene ADR zur Backend-Wahl (Prometheus-Endpoint vs. OpenTelemetry) und Kardinalitätsstrategie."
---

# P11 — Metriken/Tracing pro Operation (deferred)

Motiviert durch [ADR 0002](../../../../adr/0002-post-mvp-feature-roadmap.md) (REQUIREMENTS §7).

Aufgeschoben bis eine ADR das Metrics/Tracing-Backend festlegt.

# 0002 — Post-MVP feature roadmap (P3 features)

- **Status:** Accepted
- **Date:** 2026-07-24

## Context

The MVP is hardened: green test harness (P1), auth folded into the config node
(P2, ADR 0001), and a robustness + coverage pass (route-lifecycle Express 4/5, auth
AND-requirements, body-size limit, meta-collision guard; 70 tests). What remains is
the post-MVP feature set — the items in `REQUIREMENTS.md` §7 plus the review findings
that were parked as "P3". They were tracked only as a prose list; this ADR commits
them to the roadmap so each is an actionable (or explicitly parked) package.

The set spans very different weights: some are small and self-contained (publishing
hygiene, self-hosted Swagger-UI, node docs), some change a node's contract
(error-response validation, JWT verification), and some are large enough to deserve
their **own** ADR before implementation (OAuth2 flows, spec-based mocking, metrics
backend, an in-editor Monaco spec editor).

## Decision

Plan the P3 features as roadmap packages, split into **pending** (buildable now from
their own text, no further design decision needed) and **deferred** (need a dedicated
ADR and/or an owner decision before they are actionable):

**Pending** (actionable next, ordered by value/independence):
- **P3** — Publishing hygiene: `package.json` `files` whitelist so the npm tarball
  ships only runtime artefacts (epic `foundation`).
- **P4** — Node requirement docs for `openapi-in` + `openapi-response` (epic
  `aspects/docs`).
- **P5** — Self-hosted Swagger-UI: drop the jsDelivr CDN dependency (epic
  `aspects/meta-docs`).
- **P6** — Error-response validation: validate `msg.error` bodies against the spec's
  error response schema (epic `nodes/openapi-response`).
- **P7** — HTTP bearer **JWT verification** (shared secret + JWKS), reject
  invalid/expired (epic `aspects/auth`).
- **P8** — Per-operation **scope enforcement** (403 on insufficient scope), depends on
  P7 (epic `aspects/auth`).

**Deferred** (parked with a `deferred_reason`; each gets its own ADR when picked up):
- **P9** — OAuth2 / OIDC full flows + JWKS caching (needs a flows/providers ADR).
- **P10** — Spec-based mocking (needs a mock-semantics ADR: example vs schema-faker,
  opt-in granularity).
- **P11** — Metrics / tracing per operation (needs a backend ADR: Prometheus vs
  OpenTelemetry).
- **P12** — Swagger 2.0 input support (needs a conversion-strategy decision).
- **P13** — In-editor Monaco spec editor (large editor feature; own ADR).
- **P14** — Per-`securityScheme` editor rendering (deferred UX item from ADR 0001).

**AsyncAPI** (`REQUIREMENTS.md` §7) is explicitly **out of near-term scope** — it is a
different specification kind for a different (message-driven) transport, not an HTTP
concern; it stays a research note, not a package.

## Consequences

- Three new epics are created: `aspects/docs`, `aspects/mocking`,
  `aspects/observability`. Existing epics (`aspects/auth`, `aspects/meta-docs`,
  `nodes/openapi-response`, `foundation`) gain packages.
- INDEX "Open work" holds the six pending packages; the six deferred ones live under
  their epic's `deferred/` folder and are listed under INDEX "Deferred".
- Several pending packages add runtime dependencies when implemented
  (`swagger-ui-dist` for P5; `jsonwebtoken` + `jwks-rsa` for P7). Adding a dependency
  is a stop-condition per `.ai/agents/architecture.md` §1 — each such package calls it
  out in its `acceptance` so the implementing agent expects it.
- This ADR is an **umbrella**: it does not decide the internal design of the deferred
  items. Picking up P9–P14 starts with `evolve-roadmap` writing that item's own ADR.
- No source code changes here — this is planning only.

<!-- The ONLY "Always-read" roadmap file. Keep it slim.
     Lists open work only (pending / in_progress). Done packages live in their
     epic's done/ subfolder (deferred ones in deferred/) and are NOT listed here
     individually — the open surface stays small.

     The read-only tripwire `npm run check:roadmap` verifies this file stays in
     sync with the package files. It writes nothing — fixing drift is the agent's
     job at phase close-out. -->

# Roadmap index

Source of truth = the per-package files under `docs/roadmap/<epic>/`. Each package
follows [`.ai/agents/roadmap-phase-schema.md`](../../.ai/agents/roadmap-phase-schema.md).
This index is a slim view of **open work only**.

## How to pick the next phase

The next phase is the first **pending** package below whose `dependencies` are all
`done`. Open its file for the full contract (`findings` / `acceptance` / `verify`).
**Deferred** packages are parked (see their `deferred_reason`) — skip them until their
blocker clears.

## Open work (pending / in_progress)

Post-MVP feature set, planned by [ADR 0002](../adr/0002-post-mvp-feature-roadmap.md).

_(none — all pending P3 packages are done. What remains is the six **deferred**
packages below, each of which starts with its own `/evolve-roadmap` ADR.)_

## Epics (where plans live)

New packages are authored into one of these epic folders (add an `epic.md` for a new
epic). A package's file lives at the epic root while open, and `git mv`s into
`<epic>/done/` or `<epic>/deferred/` on status change.

| Epic | Scope |
|---|---|
| [foundation](foundation/epic.md) | Cross-cutting groundwork (test harness, structural merges) |
| [nodes/openapi-config](nodes/openapi-config/epic.md) | The config node's config surface + accessors + (P2) merged auth |
| [nodes/openapi-in](nodes/openapi-in/epic.md) | HTTP-in: operation selection, request validation, message contract, error routing |
| [nodes/openapi-response](nodes/openapi-response/epic.md) | HTTP-return: status/body, validation modes, error mapping, single-send |
| [aspects/spec-handling](aspects/spec-handling/epic.md) | `lib/spec-loader`: sources, JSON+YAML, deref, index, prefix, reload |
| [aspects/validation](aspects/validation/epic.md) | `lib/validator`: AJV request/response, coercion, media types, nullable |
| [aspects/auth](aspects/auth/epic.md) | `lib/auth`: scheme extraction, OR/AND eval, enforce/extract, JWT/OAuth2 (roadmap) |
| [aspects/meta-docs](aspects/meta-docs/epic.md) | `lib/meta`: openapi.json/yaml, Swagger-UI, self-hosting |
| [aspects/lifecycle](aspects/lifecycle/epic.md) | `lib/routing`: path rewrite, register/remove, no orphan routes, Express compat |
| [aspects/docs](aspects/docs/epic.md) | Node requirement docs + usage guides + README/REQUIREMENTS upkeep |
| [aspects/mocking](aspects/mocking/epic.md) | Spec-based mocking (deferred — needs its own ADR) |
| [aspects/observability](aspects/observability/epic.md) | Per-operation metrics/tracing (deferred — needs its own ADR) |

## Deferred (parked, not abandoned)

Reason in each package's `deferred_reason`. Picked up once the blocker clears.

- **P9** — aspects/auth — OAuth2 / OIDC volle Flows + JWKS-Caching — *braucht eigene ADR (Flows/Provider/Caching); hängt an P7* — [P9](aspects/auth/deferred/P9-oauth2-oidc-flows.md)
- **P10** — aspects/mocking — Spec-basiertes Mocking (Responses aus examples/Schema) — *braucht eigene ADR zur Mock-Semantik* — [P10](aspects/mocking/deferred/P10-spec-based-mocking.md)
- **P11** — aspects/observability — Metriken/Tracing pro Operation — *braucht eigene ADR zur Backend-Wahl* — [P11](aspects/observability/deferred/P11-metrics-tracing.md)
- **P12** — aspects/spec-handling — Swagger 2.0 als Eingabeformat — *braucht Konvertierungsstrategie-Entscheidung* — [P12](aspects/spec-handling/deferred/P12-swagger2-input.md)
- **P13** — nodes/openapi-config — In-Editor Monaco-Spec-Editor — *große Editor-Feature; eigene ADR (Bundling/UX)* — [P13](nodes/openapi-config/deferred/P13-monaco-spec-editor.md)
- **P14** — nodes/openapi-config — Credential-Eingaben pro securityScheme im Editor — *braucht editor-seitigen Spec-Zugriff + UX-Entscheidung (aus ADR 0001)* — [P14](nodes/openapi-config/deferred/P14-per-scheme-editor-rendering.md)

## Done (rollup — history lives in the epic folders)

Counts of completed packages per epic. Not individually listed here by design; open the
folder for the full history.

| Epic | done |
|---|---|
| foundation | 3 |
| nodes/openapi-config | 0 |
| nodes/openapi-in | 0 |
| nodes/openapi-response | 1 |
| aspects/spec-handling | 0 |
| aspects/validation | 0 |
| aspects/auth | 2 |
| aspects/meta-docs | 1 |
| aspects/lifecycle | 0 |
| aspects/docs | 1 |
| aspects/mocking | 0 |
| aspects/observability | 0 |

**Total: 8 done, 0 open, 6 deferred.**

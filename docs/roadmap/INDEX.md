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

- **P1** — foundation — Test-Harness reparieren: `node-red` als devDependency + Integrationstest skip-fähig, damit `npm test` alle Specs fährt statt am fehlenden `require("node-red")` komplett abzubrechen — [P1](foundation/P1-fix-test-harness.md)
- **P2** — foundation — Auth in den Config-Node zusammenführen (ADR 0001): `openapi-auth` entfällt als eigener Knoten; `mode` + Credentials + `authenticate()` wandern auf `openapi-config` — [P2](foundation/P2-merge-auth-into-config.md)

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

## Deferred (parked, not abandoned)

Reason in each package's `deferred_reason`. Picked up once the blocker clears.

_(none yet)_

## Done (rollup — history lives in the epic folders)

Counts of completed packages per epic. Not individually listed here by design; open the
folder for the full history.

| Epic | done |
|---|---|
| foundation | 0 |
| nodes/openapi-config | 0 |
| nodes/openapi-in | 0 |
| nodes/openapi-response | 0 |
| aspects/spec-handling | 0 |
| aspects/validation | 0 |
| aspects/auth | 0 |
| aspects/meta-docs | 0 |
| aspects/lifecycle | 0 |

**Total: 0 done, 2 open, 0 deferred.**

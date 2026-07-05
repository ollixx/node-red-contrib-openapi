# Roadmap phase schema (agent-os)
<!-- generic structure; node/verify vocabulary adapted for HTTP nodes -->

Mandatory for every phase that changes **observable behaviour** of an
`openapi-*` node (route registration, request/response validation, auth, the
emitted message contract, meta endpoints). It exists because terse,
semicolon-packed `title` strings let detailed user findings slip through: an
agent could make `npm test` green and still miss what was actually asked for,
because the target was never written down in a verifiable form.

A phase is a **contract**, not a hint. It has three jobs:
1. preserve the user's report **verbatim** so it cannot be re-interpreted away,
2. state **observable acceptance criteria** so "done" is checkable, not guessed,
3. name the **durable spec** and the **tests** the change must update.

## Fields

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | `P<n>` phase id. |
| `node` | for node phases | The `openapi-*` node this phase touches (e.g. `openapi-in`). Omit for pure infra/lib phases. |
| `title` | yes | One short line — *what* changes, not the full detail. Detail lives in `findings`/`acceptance`. |
| `epic` | yes | The epic folder this package lives in (e.g. `foundation`, `nodes/openapi-config`). |
| `findings` | for bug/UX phases | **The user's report, verbatim.** Symptoms/requests in the user's own words. Never paraphrased into the fix. |
| `acceptance` | for node/behaviour phases | A list of **observable** done-criteria — a concrete, checkable outcome (an HTTP status, a response body, a rejected request, an emitted `msg` field, a route absent after redeploy). One `findings` item maps to one or more `acceptance` lines. If you cannot phrase a finding as an observable outcome, it is under-specified — clarify before writing the phase. |
| `verify` | for node phases | `http` \| `unit`. `http` means the phase is **not done** until each `acceptance` line was proven end-to-end over HTTP (`node-red-node-test-helper` + `supertest`) per `.ai/agents/node-testing.md` — a passing unit test is necessary but not sufficient. Route/validation/auth/meta findings are `http`. Pure `lib/` logic can be `unit`. |
| `spec` | for node phases | Path to the node's requirement doc under `docs/nodes/openapi-<node>.md` — the durable contract that must be updated to match what was built. |
| `tests` | for node phases | Path to the node's test catalogue `.md` (`test/openapi-<node>.tests.md`). The phase is not done until this catalogue lists the new tests with their goals, kept current per `.ai/agents/node-testing.md`. |
| `dependencies` | yes | List of phase ids that must be `done` first. `[]` if none. |
| `status` | yes | `pending` \| `in_progress` \| `done` \| `deferred` \| `blocked`. `deferred` = consciously parked; requires a `deferred_reason` and lives under INDEX "Deferred". |
| `deferred_reason` | if `deferred` | One line: why it is parked and what unblocks it. |

## Folder layout — status maps to location

A package's **status determines where its file lives** inside its epic folder:

```
docs/roadmap/<epic>/
  epic.md
  P###-<slug>.md          ← pending / in_progress  (open work, at the epic root)
  deferred/
    P###-<slug>.md        ← deferred  (only created when the epic has any)
  done/
    P###-<slug>.md        ← done  (archived history; stays in its epic)
```

**On every status transition, `git mv` the file to its new location** and fix:
1. the package's own **relative body links** (depth changes by one between the epic
   root and a `done/`/`deferred/` subfolder — bump `../` by one level), and
2. the **INDEX link** to it.

`npm run check:roadmap` **validates every relative link** in `docs/roadmap/**.md`
and fails on a broken one — so a move that leaves a dangling link cannot be committed.
Prefer the frontmatter `spec:`/`tests:` fields (repo-root paths, move-invariant) over
body links where you can.

## Detail bar (AGENTS.md rule 10)

A package must be **buildable from its own text without interpretation**. If you
cannot meet that bar from the owner's input — a field's allowed values, a validation
rule, an auth behaviour, a response shape — **stop and ask**, then write the detailed
package. The matching durable contract — the node's `docs/nodes/**` requirement doc —
is held to the same bar.

## Rules

- **`findings` is the user's words.** Copy the report in. Do not compress it into the
  fix; do not resolve ambiguity by inventing a target.
- **`acceptance` and `findings` must not contradict.** A finding describes the *bug*;
  acceptance describes the *fixed target*, stated once, unambiguously.
- **`verify: http` ⇒ proof over HTTP.** The implementing agent drives
  `node-red-node-test-helper` + `supertest` and confirms every `acceptance` line.

## Example — a correctly specified node phase

```yaml
---
id: P42
node: openapi-in
title: "openapi-in: reject unknown query params when spec sets additionalProperties:false"
epic: nodes/openapi-in
findings:
  - "Ein Query-Param, den die Operation nicht deklariert, wird aktuell durchgelassen statt abgewiesen."
acceptance:
  - "HTTP: GET /api/v1/pets?bogus=1 auf eine Operation ohne 'bogus'-Param → 400 mit Fehlerdetail, das den unbekannten Param nennt (wenn die Operation additionalProperties:false vorgibt)."
  - "HTTP: eine deklarierte, gültige Query bleibt 200."
verify: http
spec: docs/nodes/openapi-in.md
tests: test/openapi-in.tests.md
dependencies: []
status: pending
---
```

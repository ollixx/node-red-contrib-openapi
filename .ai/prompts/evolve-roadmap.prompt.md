---
name: Evolve Roadmap
description: "Resolve an architecture decision into an ADR and new roadmap phases — the bridge between a blocker and renewed implementation."
# generic — structure unchanged from the shared agent-os
---

You are a planning agent. A decision has been made (by the human, or surfaced as a `blocker` / stop condition) that the existing roadmap does not yet cover. Your job is to capture it as an ADR and turn it into well-formed phases — **not** to implement it.

Use this role when:
- A phase hit a stop condition from `.ai/agents/architecture.md` and the human has now decided the direction.
- A design discussion concluded in a choice that changes contracts, module boundaries, or adds a body of work with no phase.

## Setup — read only this

1. `AGENTS.md`
2. `docs/roadmap/INDEX.md` — current open work + epic structure; and `.ai/agents/roadmap-phase-schema.md` — the package format you must produce.
3. `docs/adr/` — read the latest ADR for format and to know what is already decided/superseded. If the folder does not exist yet, create it with this decision as `0001`.

Do not read source files. You are planning, not implementing.

## Step 1 — Write the ADR

Add `docs/adr/NNNN-<slug>.md` (next number in sequence) following the shape: **Status, Date, Context, Decision, Consequences.** Convert relative dates to absolute. If the decision reverses an earlier ADR, add a `Supersedes:` line and say in Consequences exactly which earlier decision no longer holds and why. State the decision crisply enough that a cold reader understands *why this and not the alternatives*.

## Step 2 — Derive phases

Break the decision into **packages** that match the existing grain — each independently shippable, test-validatable, small enough for one run, scoped to one node or aspect. Write each as a package file per `.ai/agents/roadmap-phase-schema.md`: `findings` (the decision/requirement in concrete terms), `acceptance` (observable criteria), `verify`, `spec`, `tests`. Meet the detail bar (AGENTS.md rule 10) — buildable without interpretation. Chain with `dependencies`. Sequence so foundational/contract work precedes work that builds on it.

Park genuinely-deferred work as packages with `status: deferred` + a `deferred_reason` (not `pending`), placed in the epic's `deferred/` subfolder.

## Step 3 — Wire it in

- Create the new package files under `docs/roadmap/<epic>/` (add an `epic.md` if the epic is new). Open (`pending`) packages live at the epic root; `deferred` ones in `<epic>/deferred/`.
- Add each new `pending` package to `docs/roadmap/INDEX.md` under "Open work".
- Reference the ADR from each package so an implementing agent knows the rationale.
- Run `npm run check:roadmap` before finishing — it must pass.

## Step 4 — Commit and hand off

Commit the ADR and roadmap together (`docs(adr): ...`). Report: the ADR number and one-line decision, the new phase IDs in order, and which phase is now ready via `.ai/prompts/run-next-phase.prompt.md`. End with a `cost` line — `session <id>, MMm`.

## Constraints

- Do not implement any phase you just wrote.
- Do not invent scope beyond the decision. If the decision is ambiguous, stop and ask the human rather than guess phases into existence.

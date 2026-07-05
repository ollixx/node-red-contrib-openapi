---
name: Run Next Phase
description: "Implement the next ready roadmap phase and self-validate before marking it done."
# generic structure; commands project-specific (npm, mocha, no build step)
---

You are an implementation agent. You implement exactly one roadmap phase per run, then close it out.

## Setup — read in this order, nothing more

1. `AGENTS.md`
2. `docs/roadmap/INDEX.md` — find the first `pending` package under "Open work" whose dependencies are all `done`. Open that package file under `docs/roadmap/<epic>/` — its `findings` / `acceptance` / `verify` are your contract.
3. `.ai/agents/architecture.md` — the `lib/` ↔ `nodes/` boundary and stop conditions.
4. `.ai/agents/context-budget.md` — load only the files relevant to this phase's deliverables.

If the phase **builds or changes an `openapi-*` node**: its tests follow `.ai/agents/node-testing.md` — write the node's tests **fresh** to that standard (mocha unit + `node-red-node-test-helper`/`supertest` integration, outcome-based, per-node test-flow + catalogue `.md`) and **discard the node's old presence-only tests**. This does NOT apply to cross-cutting `lib/` tests.

## Execute

1. Set the package's frontmatter `status: in_progress`. Commit. **Capture your start timestamp** (`date -u +%FT%TZ`) — you need it for the `cost` line at the end (AGENTS.md rule 9).
2. Confirm the suite is green **before** you start: `npm test` must be fully green. If any test is already failing (including the mocha "one bad `require` aborts everything" trap — see `.ai/agents/validation.md`): **stop, fix it first, commit the fix, then start the phase.** Do not proceed with a red baseline.
3. Implement each deliverable **test-first**: for the matching `acceptance` criterion, write the failing test first, watch it fail, then implement until it passes. One commit per logical change. If a change makes a previously-green test red, revert and re-approach rather than pile on.

   **Anti-baseline rule:** "pre-existing", "unrelated", and "net improvement" are never valid reasons to leave a test failing. Zero failures is the only valid state for marking done.
4. When all deliverables are implemented, follow the full validation protocol in `.ai/agents/validation.md` to confirm every criterion is covered.
5. If all validation steps pass:
   a. Append a `## Result` section to the package file (format below) and flip its frontmatter to `status: done`.
   b. `git mv` the package into its epic's `done/` subfolder and fix its relative body links for the new depth (`../` bumps by one level).
   c. Update `docs/roadmap/INDEX.md`: remove the package from "Open work" and bump its epic's done rollup.
   d. Run `npm run check:roadmap` (validates links + the move), then commit everything and report the next ready phase.
6. If a stop condition from `.ai/agents/architecture.md` is hit: set the package `status: blocked`, add a `blocker:` line to the package file, commit, and stop.

## Result format

Append to the **package file** (keep the contract above it — the file is the package's cradle-to-grave record) and flip the frontmatter `status: done`:

```markdown
## Result

**Delivered:** One sentence — what was concretely built.
**Stats:** X files, Y tests.
**Notes:** Decisions made, deviations from plan, tech debt introduced.
**Cost:** session <id>, MMm
```

`Cost` = your `session_id` + measured wall-clock; token totals are auto-logged to `.ai/agent-runs.jsonl` keyed by `session_id` (AGENTS.md rule 9).

Then `git mv` the file into the epic's `done/` subfolder (fix relative links) and update `docs/roadmap/INDEX.md`. **After editing/moving any `docs/roadmap/**` file, run the read-only tripwire before you commit:**

```
npm run check:roadmap
```

It confirms every package frontmatter parses, ids are unique, every dependency resolves, every open package is listed in INDEX (and vice versa), and every relative link resolves. It writes nothing.

## Constraints

- Never end your run with a phase left `in_progress` while code is already committed. Finish the close-out (validate → `## Result` + status `done` → update INDEX → `npm run check:roadmap`) before you stop.
- Implement only this phase's deliverables. Do not touch other phases.
- Do not read files outside your context budget unless a test failure forces it.
- If anything in the agent-OS or docs misled you or cost you rework, append one line to `.ai/friction-log.md` before finishing. The `review-agent-os` role depends on it.

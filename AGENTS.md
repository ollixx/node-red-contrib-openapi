# Agent Entry Point
<!-- project-specific — belongs in this repo, not in a shared agent-os -->

Read this file first. Then read only what your current task requires.

This is a **single-package** Node-RED plugin (`node-red-contrib-openapi`) — plain
CommonJS, **npm** (not pnpm), **no build step**, tests via **mocha**. The agent-OS
here is the slim variant of the one in `node-red-contrib-webapp`; the heavy
orchestration/worktree machinery was intentionally left out (this is a small repo).

## Quick orientation

| File | Read when |
|---|---|
| `docs/roadmap/INDEX.md` | Always — find the current phase (first **pending** package under "Open work" whose dependencies are all `done`); then open that package file under `docs/roadmap/<epic>/` for the full contract |
| `.ai/agents/architecture.md` | Before any implementation — the `lib/` ↔ `nodes/` boundary and stop conditions |
| `.ai/agents/validation.md` | Before marking any phase done — the self-validation protocol |
| `.ai/agents/roadmap-phase-schema.md` | Before writing or implementing any node phase — the phase contract (`findings` verbatim, observable `acceptance`, `verify`, `spec` + `tests` references) |
| `.ai/agents/node-testing.md` | Before writing tests for any `openapi-*` node — the HTTP-node testing standard |
| `.ai/agents/context-budget.md` | Before reading any file — the minimum file set per role, and the known pitfalls |

`REQUIREMENTS.md` is the product vision and MVP acceptance list. The **roadmap** is
the source of truth for what to implement next.

## Non-negotiable rules

1. Work on exactly one roadmap phase at a time.
2. Update the package's `status` (in its `docs/roadmap/<epic>/<id>-*.md` frontmatter) when a phase starts (`in_progress`), completes (`done`), is parked (`deferred`, with a `deferred_reason`), or is blocked (`blocked`); keep `docs/roadmap/INDEX.md` in sync. Schema: `.ai/agents/roadmap-phase-schema.md`.
3. Never overwrite user changes unless explicitly asked.
4. Minimal-invasive patches only — no unrequested reformatting or restructuring.
5. `examples/flow.json` and `examples/petstore.json` are **hand-authored** example fixtures. Change them only when a phase's deliverable requires it, and keep them valid (importable into Node-RED, spec parses). There is no generator and no off-limits dev-flow file in this repo.
6. Before any new code: commit existing uncommitted changes with a meaningful message.
7. Before marking a phase done: `npm test` must pass **fully** (all specs, exit 0). See `.ai/agents/validation.md`.
8. When marking a phase done: append a `## Result` section to the **package file**, flip its frontmatter to `status: done`, and **`git mv` it into its epic's `done/` subfolder** (status maps to folder — see `.ai/agents/roadmap-phase-schema.md`); fix its relative body links for the new depth and remove it from INDEX "Open work" + bump the epic's done rollup. `npm run check:roadmap` validates all links and the move — run it before committing.
9. **Result accounting.** Token usage is captured **automatically**: a `SessionEnd` + `SubagentStop` hook (`.ai/hooks/record-run-cost.js`, wired in `.claude/settings.json`) reads the run's transcript and appends the real token totals + duration to `.ai/agent-runs.jsonl`, keyed by `session_id`. You do not estimate tokens. In your result, make the run **correlatable**: report your `session_id` and a measured wall-clock `duration` (capture `date -u +%FT%TZ` at start and end). Keep it to one line. See `.ai/hooks/README.md`.
10. **Specs and packages must be implementation-complete — a coding agent must not have to interpret.** This is the most common cause of a feature being half-built or built wrong.
    - **Node requirement docs (`docs/nodes/<node>.md`)** describe, **per config field**: type, allowed values/options, default, validation rules + the error/status shown on violation, dependencies on other fields, and the **observable effect** (route registered, message shape emitted, response sent). No keyword stubs.
    - **Work packages (`docs/roadmap/**`)** follow `.ai/agents/roadmap-phase-schema.md`: `findings` verbatim, `acceptance` concrete and observable, `verify` set. A package must be buildable from its own text without guessing.
    - **When the owner's input is too terse to meet this bar, STOP and ask.** Do not fill gaps by interpretation.

## Roles

Different tasks use different entry prompts. Start from the right one:

| Task | Entry prompt |
|---|---|
| Implement a single phase | `.ai/prompts/run-next-phase.prompt.md` |
| Only validate a completed phase | `.ai/prompts/validate-phase.prompt.md` |
| Only write missing tests for a phase | `.ai/prompts/write-tests.prompt.md` |
| Fix a bug / regression that is not a phase | `.ai/prompts/fix-bug.prompt.md` |
| Turn a decision into an ADR + new phases | `.ai/prompts/evolve-roadmap.prompt.md` |
| Audit the agent-OS itself | `.ai/prompts/review-agent-os.prompt.md` |

Model choices in the prompts are **preferences with fallbacks**, never hard requirements.

**Phase work vs. maintenance work.** The numbered rules above govern *roadmap-phase* work. Bug fixes and roadmap evolution are not phases: they skip the phase-status bookkeeping but still obey the universal rules — test-first, commit hygiene, minimal-invasive patches, never overwrite user changes. Use the dedicated prompts. If a bug fix reveals that the roadmap itself is wrong, hand off from `fix-bug` to `evolve-roadmap`.

**Friction log.** When something in this agent-OS or the docs slows you down, misleads you, or causes rework, append one line to `.ai/friction-log.md` before you finish. It is the raw material the `review-agent-os` role mines to keep the OS honest.

When implementing a phase that adds a new Node-RED node type, invoke the `/node-red-node` skill first if it is registered — it carries the four-file pattern and checklist.

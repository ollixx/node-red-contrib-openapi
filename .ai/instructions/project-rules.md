# Project Rules
<!-- generic — candidate for a shared agent-os -->

These rules apply to all agent runs in this repository.

1. Read `AGENTS.md` before any change or answer.
2. Never overwrite user changes unless explicitly asked.
3. Minimal-invasive patches only — no unrequested reformatting, restructuring, or position changes.
4. `examples/flow.json` and `examples/petstore.json` are hand-authored fixtures — change them only when a phase requires it, and keep them valid. There is no generator and no off-limits dev-flow file in this repo.
5. If a workflow in `AGENTS.md` requires commits or validation, notify the user immediately on any deviation.
6. If it is unclear whether an existing change was intentional: stop and ask rather than assume.
7. This is an **npm** project with **no build step** and **mocha** tests — never assume pnpm, a `dist/`, or Playwright.

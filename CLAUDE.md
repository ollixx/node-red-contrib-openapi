# CLAUDE.md

Guidance for Claude Code working in this repository. For the full agent workflow,
**start at [`AGENTS.md`](./AGENTS.md)** — this file is the short orientation.

## Commands

```bash
npm install            # deps (needs node-red as a devDependency for integration tests — see roadmap P1)
npm test               # mocha unit + integration specs
npm run check:roadmap  # read-only roadmap tripwire (frontmatter, deps, INDEX sync, links)
npm run check:links    # read-only doc-link tripwire
npm run validate       # check:roadmap + check:links + test
```

No build step (plain CommonJS). This is an **npm** project, not pnpm. Tests are
**mocha** (+ `node-red-node-test-helper` + `supertest` for integration) — not Playwright;
these are HTTP server nodes with no browser frontend.

## Architecture (short)

OpenAPI-first HTTP server nodes for Node-RED: an OpenAPI spec is the single source of
truth; incoming requests are authenticated + validated against it, handed to the flow as
a clean message, and responses are validated before they go out.

| Layer | Path | Role |
|---|---|---|
| Pure logic | `lib/` | spec-loader, validator, auth, routing, meta — **node-red-free, unit-testable** |
| Node adapters | `nodes/openapi-*.{js,html}` | thin Node-RED registrations wiring config → `lib/` |

Full boundaries + invariants + stop conditions: [`.ai/agents/architecture.md`](./.ai/agents/architecture.md).

## Agent workflow

Phased roadmap. Before implementation work read, in order:
1. [`AGENTS.md`](./AGENTS.md) — entry point, non-negotiable rules, roles
2. [`docs/roadmap/INDEX.md`](./docs/roadmap/INDEX.md) — the next open phase
3. [`.ai/agents/architecture.md`](./.ai/agents/architecture.md) — boundaries + stop conditions
4. [`.ai/agents/validation.md`](./.ai/agents/validation.md) — self-validation protocol
5. [`.ai/agents/context-budget.md`](./.ai/agents/context-budget.md) — minimum file set + pitfalls

Node phases additionally follow [`.ai/agents/node-testing.md`](./.ai/agents/node-testing.md)
(HTTP-node test standard) and [`.ai/agents/roadmap-phase-schema.md`](./.ai/agents/roadmap-phase-schema.md).

Slash commands (`.claude/commands/`): `/run-next-phase`, `/fix-bug`, `/evolve-roadmap`,
`/validate-phase`, `/write-tests`, `/review-agent-os`.

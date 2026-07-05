# Context Budget
<!-- general rules generic; "Files per role" + pitfalls are project-specific -->

Token cost is real. Do not read files speculatively.

## General rules

1. Read `AGENTS.md` and `docs/roadmap/INDEX.md`, then **only the one package file** for your phase under `docs/roadmap/<epic>/`. Do not read other packages.
2. For each deliverable, identify the minimum file set (the `lib/` module(s) it touches, the node `.js`/`.html`, the relevant `test/` spec, the node's `docs/nodes/<node>.md` if it exists). Read those. Do not read unrelated modules.
3. When writing tests, read one existing test file first to match conventions (`test/validator_spec.js` for pure-logic; `test/integration_spec.js` for the test-helper + supertest pattern).
4. Do not re-read a file you already read this session unless you need a specific line.
5. Use `grep` to locate symbols before reading whole files.

## Files per role

### New / changed node
- The node's `nodes/openapi-<x>.js` and `nodes/openapi-<x>.html`.
- The `lib/` module(s) it calls (e.g. `openapi-in` → `validator.js` + `routing.js`).
- `docs/nodes/openapi-<x>.md` (the requirement doc) if it exists.
- One existing test in the same style: `test/integration_spec.js`.
- `package.json` `node-red.nodes` block if you add/remove/rename a node type.

### `lib/` (pure logic) work
- The one `lib/*.js` file under change and its unit spec in `test/`.
- `test/validator_spec.js` or `test/routing_auth_spec.js` as the convention reference.

### Test-only work
- The specific `test/*_spec.js` file(s) and the source under test (grep first).
- `.ai/agents/node-testing.md` for the HTTP-node standard.

## Known pitfalls (cost repeated debug cycles — check these first)

- **Mocha aborts on one bad `require`.** `mocha test/**/*_spec.js` loads *all* spec files before running any test; a missing dependency in one spec (notably `require("node-red")` when `node-red` is not installed) throws `Cannot find module` and **zero tests run**. Guard integration specs behind a resolvable-check / `describe.skip`, or ensure the dep is a devDependency. This is a real red baseline, not a flake.
- **Node-RED config-node trap in test flows:** a node without `x`/`y` coordinates is parsed as a *config node*, not a flow node, and silently never registers. Every flow node a test deploys needs `x`/`y` (config nodes like `openapi-config`/`openapi-auth` correctly have none).
- **Express router internals for route teardown:** `lib/routing.removeRoute` walks `RED.httpNode._router.stack`. `app._router` is an Express 4 internal; Express 5 renamed/removed it (`app.router`). If a redeploy leaves orphan routes, this is the first suspect — cover both shapes and add a test.
- **`node-red-node-test-helper` needs `node-red` installed.** The helper is a devDependency; the `node-red` package it initialises with (`helper.init(require.resolve("node-red"))`) must also be resolvable, or the integration suite cannot load.
- **Deferred spec load:** `openapi-config` loads the spec on `setTimeout(0)`, so integration tests must wait a tick before hitting a route (existing specs use `setTimeout(…, 200)`); dependent nodes react to the `spec-ready` event.

## What never needs reading unless explicitly relevant
- `REQUIREMENTS.md` (read once at project start / when evolving the roadmap, not per phase).
- Unrelated node HTML files.
- `examples/*` (unless the phase changes the example fixtures).

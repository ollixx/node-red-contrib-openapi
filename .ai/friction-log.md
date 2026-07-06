# Friction log

One line per friction an agent hit in this agent-OS or the docs: a stale path, a
wrong instruction, a missing pointer, anything that caused rework. The
`review-agent-os` role mines this to keep the OS honest — an empty log makes a cold
audit blind, so append before you finish a run.

Format: `YYYY-MM-DD <phase/role> — <what misled you or cost rework> — <suggested fix>`

<!-- append below this line -->
2026-07-06 P1 — node-red-node-test-helper's `helper.request()` targets the admin app, so httpNode routes (all openapi-* operation/meta routes) 404; cost a debug cycle to discover the app is only reachable via `_registryUtil.createNodeApi().httpNode`. Fixed by centralising in `test/helpers/http-node.js` and correcting node-testing.md, which had wrongly said to use `helper.request()`.

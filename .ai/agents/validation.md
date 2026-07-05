# Self-Validation Protocol
<!-- generic structure; commands are project-specific (npm + mocha, no build step) -->

No human reviews PRs. The agent is responsible for verifying its own work before marking a phase done. Complete all three steps — in order — before updating the phase status to `done`.

There is **no build step** in this repo (plain CommonJS). So there is no stale-`dist` failure class — a test result reflects the source on disk directly.

## Step 1: Tests must be green

Run the full suite. Fix every failure before proceeding. No exceptions.

```
npm test
```

**Never pipe the authoritative test run through `tail`/`head` — it lies.** A pipeline's exit code is the *last* command's, so `npm test | tail` always exits `0` even when tests fail. Capture the full output and assert explicitly:

```
npm test > /tmp/oa-test.log 2>&1; echo "exit=$?"
grep -cE '([0-9]+ (failing|pending))' /tmp/oa-test.log   # inspect; "failing" count must be 0
```

The only acceptable signal is **`exit=0` with zero `failing`**. A quick cross-check when a phase adds N tests: the `passing` total should rise by ~N; if it stayed flat, the new tests (or others) silently failed.

**Mocha loads every spec file before running any test.** A single bad `require` in *one* spec (e.g. a missing optional dependency like `node-red`) aborts the **whole** suite before the first test runs — you will see `Cannot find module …`, not a test failure. If that happens, that is a real red baseline: fix it (install the dep, or guard the spec) before continuing. See `.ai/agents/context-budget.md` → pitfalls.

**Anti-baseline rule — no exceptions.** It does not matter whether a failing test was already failing before your phase started. If `npm test` reports any failure, fix every failing test before marking the phase done — even ones unrelated to this phase. "Pre-existing", "unrelated", and "net improvement" are not valid reasons to leave a test red. If a test is genuinely obsolete (tests a removed feature), delete it. The only acceptable exit state is zero failures.

## Step 2: Write and verify tests for every acceptance criterion

Open the phase's package file under `docs/roadmap/<epic>/` and use its **`acceptance`** list (and `verify:` mode) as the validation criteria. For each criterion, **write the test first if it does not exist**, then verify it passes:

- **`verify: unit`** — a pure-logic criterion (spec-loader, validator, auth, routing). Write a mocha spec in `test/` that asserts the exact behaviour, then run it. It must fail if the feature is removed (no presence-only "does not throw" proxies).
- **`verify: http`** — a criterion observable over HTTP (route registered, request rejected with 400, response validated, meta endpoint served, auth 401/403, no orphan route after redeploy). Prove it end-to-end with `node-red-node-test-helper` + `supertest` against a running Node-RED, per `.ai/agents/node-testing.md`. A unit test alone is necessary but not sufficient for an `http` criterion.
- **docs check** — read the referenced `docs/nodes/<node>.md` and the source side by side; confirm they match. Fix whichever is wrong and note it in the commit message.

Do not skip a criterion. Do not mark it done by assumption.

## Step 3: Cross-check implementation against the node's spec doc

For every node touched in the phase, read its `docs/nodes/<node>.md` (if present) and compare against the implementation:

1. Every documented **config field** → exists in the editor HTML `defaults` and is read in the node `.js`.
2. Every documented **validation/error behaviour** → has a matching code path.
3. Every documented **emitted message field / response behaviour** → is actually produced.

If the doc is ahead of the implementation (a speculative feature not in this phase's deliverables): leave it. Do not implement speculatively.

## Only after all three steps pass

Append the `## Result` section to the package file, flip its frontmatter `status: done`, `git mv` it into the epic's `done/` subfolder (fix relative links), update `docs/roadmap/INDEX.md`, and run `npm run check:roadmap`. Then commit.

---
description: Backfill missing unit + integration tests for a phase's acceptance criteria (no impl changes).
argument-hint: [phase id — optional]
---
Read `.ai/prompts/write-tests.prompt.md` in full and execute it **exactly** — for each acceptance criterion write the missing test at its `verify` level (unit or http), run `npm test`, keep the node's test catalogue current. Do not modify implementation files.

Phase to backfill (optional): $ARGUMENTS

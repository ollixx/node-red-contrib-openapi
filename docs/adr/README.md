# Architecture Decision Records

Each ADR captures one decision that changes contracts, module boundaries, or adds a
body of work. Format: **Status, Date, Context, Decision, Consequences** (see any file
here). Numbering is sequential (`NNNN-<slug>.md`). A decision that reverses an earlier
one carries a `Supersedes:` line and says in Consequences which earlier decision no
longer holds.

ADRs are written by the **`evolve-roadmap`** role
([`.ai/prompts/evolve-roadmap.prompt.md`](../../.ai/prompts/evolve-roadmap.prompt.md)),
which then derives roadmap packages from the decision. Roadmap packages reference the
ADR that motivated them.

| ADR | Decision |
|---|---|
| [0001](0001-auth-config-not-separate-node.md) | Auth is configured **in** the config node, not as a separate `openapi-auth` node. |
| [0002](0002-post-mvp-feature-roadmap.md) | Plan the post-MVP (P3) feature set as roadmap packages, split pending vs deferred. |
| [0003](0003-body-size-limit-is-node-red-owned.md) | Request body-size limiting is Node-RED's job; remove the bypassed `maxBodyBytes` field. |

# Epic: nodes/openapi-config

The config node — the central holder of the OpenAPI spec. Its config surface: spec
sourcing (inline/file/url/context), meta-endpoint toggles, the operation index it
exposes to dependent nodes and the editor dropdown, and — after `foundation/P2` — the
merged **auth** configuration (mode + credentials).

Spec *parsing* lives in `aspects/spec-handling`; route *lifecycle* in `aspects/lifecycle`;
this epic owns the **node**'s config surface and the accessors it hands to `openapi-in`
/ `openapi-response`.

Packages follow [`.ai/agents/roadmap-phase-schema.md`](../../../../.ai/agents/roadmap-phase-schema.md).
Node requirement doc: `docs/nodes/openapi-config.md`.

# Node requirement docs

One file per node: `openapi-<node>.md`. This is the **durable contract** — WHAT the node
must do — held to the detail bar in [`AGENTS.md`](../../AGENTS.md) rule 10 and cross-checked
against the implementation in [`.ai/agents/validation.md`](../../.ai/agents/validation.md)
step 3. A roadmap package that changes a node updates this doc in the same change (it is
the package's `spec:` reference).

Each node doc describes, **per config field**: type, allowed values/options, default,
validation rules + the error/status shown on violation, dependencies on other fields, and
the **observable effect** (route registered, message shape emitted, response sent). No
keyword stubs.

For an HTTP node also describe: the route(s) it registers, the request validation it
applies, the message it emits (or consumes), and the responses/errors it produces.

| Node | Doc | Test catalogue |
|---|---|---|
| `openapi-config` | [openapi-config.md](openapi-config.md) | `test/openapi-config.tests.md` |
| `openapi-in` | [openapi-in.md](openapi-in.md) | `test/openapi-in.tests.md` |
| `openapi-response` | [openapi-response.md](openapi-response.md) | `test/openapi-response.tests.md` |

These files are created as node phases build them out — this repo intentionally does not
ship empty stubs (a stub would violate the detail bar).

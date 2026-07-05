# Epic: nodes/openapi-in

The HTTP-in node — realizes **one** operation of the spec per node instance:
registers its route, invokes auth, validates the incoming request against the spec
(path/query/header/cookie params + requestBody), and emits the **normalized message
contract** (`payload`, `parameters`, `auth`, `openapi`, `req`, `res`) or routes
validation/auth failures per the `onError` setting.

Validation *logic* lives in `aspects/validation`; auth *logic* in `aspects/auth`; route
register/remove in `aspects/lifecycle`. This epic owns the **node**: operation selection,
message shape, error routing.

Packages follow [`.ai/agents/roadmap-phase-schema.md`](../../../../.ai/agents/roadmap-phase-schema.md).
Node requirement doc: `docs/nodes/openapi-in.md`.

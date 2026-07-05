# Epic: nodes/openapi-response

The HTTP-return node — sends the reply and holds it to the spec: determines status +
body (incl. `msg.error` mapping to a spec-shaped RFC-7807 error), validates the body
against the spec response schema per mode (`strict`/`warn`/`off`), sets headers, and
guarantees exactly one send.

Validation *logic* lives in `aspects/validation`. This epic owns the **node**: error
mapping, validation modes, single-send guarantee, header handling.

Packages follow [`.ai/agents/roadmap-phase-schema.md`](../../../../.ai/agents/roadmap-phase-schema.md).
Node requirement doc: `docs/nodes/openapi-response.md`.

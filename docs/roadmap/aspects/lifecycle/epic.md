# Epic: aspects/lifecycle

Cross-cutting route lifecycle — `lib/routing.js`: OpenAPI-path → Express-path rewrite,
prefix joining, and register/remove on `RED.httpNode`. The invariant this epic defends:
**no orphaned routes and no double registration** across deploy/redeploy/`close`, and
compatibility with the Express version Node-RED ships (the `_router` stack walk is an
Express-4 internal — Express 5 differs).

Consumed by every node that registers a route (`openapi-in`, meta endpoints).

Packages follow [`.ai/agents/roadmap-phase-schema.md`](../../../../.ai/agents/roadmap-phase-schema.md).

"use strict";

// Route registration + teardown against a real Express app (no node-red needed).
// This is the lifecycle the project promises: a registered route responds, and
// after removeRoute it is gone — no orphaned routes on redeploy. Also covers the
// Express-4 (`_router`) vs Express-5 (`router`) router-location handling.
const assert = require("assert");
const { registerRoute, removeRoute } = require("../lib/routing");

let express = null;
try {
  express = require("express");
} catch {
  // express is pulled in transitively by node-red (a devDependency); skip if absent.
}
let request = null;
try {
  request = require("supertest");
} catch {
  // supertest is a devDependency.
}
const canRun = express && request;
const d = canRun ? describe : describe.skip;

d("routing register/remove (real Express app)", function () {
  it("registers a route that responds, then removes it (no orphan)", async function () {
    const app = express();
    const RED = { httpNode: app };
    registerRoute(RED, "get", "/thing/:id", [(req, res) => res.json({ id: req.params.id })]);

    let r = await request(app).get("/thing/7");
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.id, "7");

    removeRoute(RED, "get", "/thing/:id");
    r = await request(app).get("/thing/7");
    assert.strictEqual(r.status, 404, "route must be gone after removeRoute");
  });

  it("removeRoute only removes the matching method+path", async function () {
    const app = express();
    const RED = { httpNode: app };
    registerRoute(RED, "get", "/a", [(req, res) => res.end("get-a")]);
    registerRoute(RED, "post", "/a", [(req, res) => res.end("post-a")]);

    removeRoute(RED, "get", "/a");
    assert.strictEqual((await request(app).get("/a")).status, 404, "GET /a removed");
    assert.strictEqual((await request(app).post("/a")).status, 200, "POST /a still there");
  });

  it("removeRoute is safe to call twice and on a missing route", function () {
    const app = express();
    const RED = { httpNode: app };
    removeRoute(RED, "get", "/nope"); // never registered — no throw
    registerRoute(RED, "get", "/x", [(req, res) => res.end("ok")]);
    removeRoute(RED, "get", "/x");
    removeRoute(RED, "get", "/x"); // twice — no throw
    assert.ok(true);
  });
});

// The router lives at `.router` on Express 5 and `._router` on Express 4; this
// fallback is pure logic and needs no Express instance.
describe("routing router-location fallback (Express 4 vs 5)", function () {
  it("finds and mutates the stack when the router is exposed as .router", function () {
    const stack = [{ route: { path: "/y", methods: { get: true } } }];
    const RED = { httpNode: { router: { stack } } }; // no _router → Express-5 shape
    removeRoute(RED, "get", "/y");
    assert.strictEqual(stack.length, 0, "route removed via the .router fallback");
  });

  it("prefers _router when present (Express-4 shape)", function () {
    const stack = [{ route: { path: "/z", methods: { delete: true } } }];
    const RED = { httpNode: { _router: { stack } } };
    removeRoute(RED, "delete", "/z");
    assert.strictEqual(stack.length, 0);
  });
});

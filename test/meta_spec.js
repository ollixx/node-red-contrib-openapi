"use strict";

// Meta endpoints (openapi.json / .yaml / docs) + individual toggles + teardown,
// plus the prefix-collision guard, driven against a real Express app.
const assert = require("assert");
const { registerMeta, unregisterMeta } = require("../lib/meta");

let express = null;
try {
  express = require("express");
} catch {
  // pulled in transitively by node-red (devDependency)
}
let request = null;
try {
  request = require("supertest");
} catch {
  // devDependency
}
const d = express && request ? describe : describe.skip;

const RAW = { openapi: "3.0.3", info: { title: "MetaTest" }, servers: [{ url: "/api/v1" }], paths: {} };

d("meta endpoints", function () {
  it("serves openapi.json / .yaml / docs at the prefix", async function () {
    const app = express();
    const RED = { httpNode: app };
    const { routes } = registerMeta(RED, { raw: RAW, prefix: "/api/v1", enable: { json: true, yaml: true, docs: true } });
    assert.strictEqual(routes.length, 3);

    const j = await request(app).get("/api/v1/openapi.json");
    assert.strictEqual(j.status, 200);
    assert.strictEqual(j.body.info.title, "MetaTest");

    const y = await request(app).get("/api/v1/openapi.yaml");
    assert.strictEqual(y.status, 200);
    assert.match(y.headers["content-type"], /yaml/);
    assert.match(y.text, /openapi:/);

    const docs = await request(app).get("/api/v1/docs");
    assert.strictEqual(docs.status, 200);
    assert.match(docs.headers["content-type"], /html/);
    assert.match(docs.text, /swagger-ui/i);
  });

  it("individually toggles endpoints off (disabled → 404)", async function () {
    const app = express();
    const RED = { httpNode: app };
    registerMeta(RED, { raw: RAW, prefix: "/api/v1", enable: { json: true, yaml: false, docs: false } });
    assert.strictEqual((await request(app).get("/api/v1/openapi.json")).status, 200);
    assert.strictEqual((await request(app).get("/api/v1/openapi.yaml")).status, 404);
    assert.strictEqual((await request(app).get("/api/v1/docs")).status, 404);
  });

  it("unregisterMeta removes the routes (no orphan)", async function () {
    const app = express();
    const RED = { httpNode: app };
    const { routes } = registerMeta(RED, { raw: RAW, prefix: "", enable: { json: true, yaml: false, docs: false } });
    assert.strictEqual((await request(app).get("/openapi.json")).status, 200);
    unregisterMeta(RED, routes);
    assert.strictEqual((await request(app).get("/openapi.json")).status, 404);
  });

  it("warns and skips on a prefix collision (two configs, same prefix)", function () {
    const app = express();
    const RED = { httpNode: app };
    const first = registerMeta(RED, { raw: RAW, prefix: "/api/v1", enable: { json: true, yaml: false, docs: false } });
    assert.strictEqual(first.warnings.length, 0);
    assert.strictEqual(first.routes.length, 1);

    const second = registerMeta(RED, { raw: RAW, prefix: "/api/v1", enable: { json: true, yaml: false, docs: false } });
    assert.strictEqual(second.routes.length, 0, "no duplicate registration on collision");
    assert.ok(second.warnings.length >= 1, "collision must warn");
    assert.match(second.warnings[0], /already registered/);
  });
});

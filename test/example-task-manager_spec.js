"use strict";

// Regression coverage for the SHIPPED showcase example (examples/task-manager.json).
// Loads the real file — so a node change that breaks the example (renamed field,
// changed auth/validation) turns this red. Structural checks + the security-critical
// HTTP paths (apiKey + bearer JWT + per-operation scope + body validation) against the
// example's own inline spec and node configs.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const helper = require("node-red-node-test-helper");
const jwt = require("jsonwebtoken");
const { loadSpec } = require("../lib/spec-loader");
const { httpNodeRequest } = require("./helpers/http-node");
const configNode = require("../nodes/openapi-config.js");
const inNode = require("../nodes/openapi-in.js");
const responseNode = require("../nodes/openapi-response.js");

const EXAMPLE = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "examples", "task-manager.json"), "utf8"));
const cfg = EXAMPLE.find((n) => n.type === "openapi-config");
const inNodes = EXAMPLE.filter((n) => n.type === "openapi-in");
const opNode = (op) => inNodes.find((n) => n.operation === op);

// Demo credentials from docs/examples/task-manager.md.
const API_KEY = "demo-key-123";
const SECRET = "demo-secret";
const sign = (scope) => jwt.sign({ sub: "demo", scope }, SECRET, { algorithm: "HS256", expiresIn: "1h" });

let nodeRedPath = null;
try {
  nodeRedPath = require.resolve("node-red");
} catch {
  // skip integration below if node-red is absent
}
const describeIntegration = nodeRedPath ? describe : describe.skip;
if (nodeRedPath) helper.init(nodeRedPath);

describe("example task-manager.json — structure (no node-red)", function () {
  it("has one openapi-config with an inline spec and enforce auth", function () {
    assert.ok(cfg, "config node present");
    assert.strictEqual(cfg.source, "inline");
    assert.strictEqual(cfg.authMode, "enforce");
    assert.ok(cfg.inline && cfg.inline.length > 0, "inline spec present");
  });

  it("has no stale/removed node fields (e.g. maxBodyBytes from pre-P15)", function () {
    const stale = EXAMPLE.filter((n) => n.type === "openapi-in" && "maxBodyBytes" in n);
    assert.deepStrictEqual(stale, [], "openapi-in nodes must not carry the removed maxBodyBytes field");
  });

  it("every openapi-in references a real operation, wired downstream", async function () {
    const spec = await loadSpec({ source: "inline", inline: cfg.inline });
    assert.strictEqual(Object.keys(spec.index.byId).length, inNodes.length, "one in-node per operation");
    for (const n of inNodes) {
      assert.ok(spec.index.byId[n.operation], `operation ${n.operation} exists in the spec`);
      assert.strictEqual(n.server, cfg.id, "in-node points at the config node");
      assert.ok(Array.isArray(n.wires) && n.wires[0] && n.wires[0].length > 0, `${n.operation} is wired downstream`);
    }
  });

  it("secures reads with apiKey and writes with bearer + scopes", async function () {
    const spec = await loadSpec({ source: "inline", inline: cfg.inline });
    const sec = (op) => spec.index.byId[op].security;
    assert.deepStrictEqual(sec("listTasks"), [{ ApiKeyAuth: [] }]);
    assert.deepStrictEqual(sec("createTask"), [{ BearerAuth: ["tasks:write"] }]);
    assert.deepStrictEqual(sec("deleteTask"), [{ BearerAuth: ["tasks:admin"] }]);
  });
});

describeIntegration("example task-manager.json — behaviour (HTTP, from the real file)", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });
  afterEach(function (done) {
    helper.unload().then(() => helper.stopServer(done));
  });

  // Build a runnable flow from the example's OWN config + in nodes, wiring each
  // in-node to a fresh response node (the example's function nodes are replaced by
  // an intercept). Meta endpoints off to keep the test focused.
  function flowFor(...operations) {
    const cfgNode = Object.assign({}, cfg, { metaJson: false, metaYaml: false, metaDocs: false });
    const flow = [cfgNode];
    for (const op of operations) {
      const src = opNode(op);
      const respId = "resp_" + op;
      flow.push(Object.assign({}, src, { id: "in_" + op, wires: [[respId], []] }));
      flow.push({ id: respId, type: "openapi-response", server: cfg.id, validation: "off", wires: [] });
    }
    return flow;
  }
  const creds = { [cfg.id]: { apiKeys: API_KEY, jwtSecret: SECRET } };

  it("listTasks: 401 without key, apiKey passes (msg.auth.scheme)", function (done) {
    helper.load([configNode, inNode, responseNode], flowFor("listTasks"), creds, function () {
      const n = helper.getNode("in_listTasks");
      const orig = n.send.bind(n);
      n.send = function (msgs) {
        const m = Array.isArray(msgs) ? msgs[0] : msgs;
        if (m) {
          try {
            assert.strictEqual(m.auth.scheme, "ApiKeyAuth");
            m.statusCode = 200;
            m.payload = [];
          } catch (e) {
            return done(e);
          }
        }
        return orig(msgs);
      };
      setTimeout(() => {
        httpNodeRequest().get("/api/v1/tasks").expect(401).end((e) => {
          if (e) return done(e);
          httpNodeRequest().get("/api/v1/tasks").set("X-API-Key", API_KEY).expect(200).end(done);
        });
      }, 200);
    });
  });

  it("createTask: 401 no token, 403 wrong scope, 201 valid, 400 bad body", function (done) {
    helper.load([configNode, inNode, responseNode], flowFor("createTask"), creds, function () {
      const n = helper.getNode("in_createTask");
      const orig = n.send.bind(n);
      n.send = function (msgs) {
        const m = Array.isArray(msgs) ? msgs[0] : msgs;
        if (m) {
          try {
            assert.ok(m.auth.scopes.includes("tasks:write"), "write scope enforced");
            m.statusCode = 201;
            m.payload = { id: 1, title: m.payload.title, status: "open", priority: "medium" };
          } catch (e) {
            return done(e);
          }
        }
        return orig(msgs);
      };
      const write = "Bearer " + sign("tasks:write");
      const readonly = "Bearer " + sign("tasks:read");
      setTimeout(() => {
        httpNodeRequest().post("/api/v1/tasks").send({ title: "x" }).expect(401).end((e1) => {
          if (e1) return done(e1);
          httpNodeRequest().post("/api/v1/tasks").set("Authorization", readonly).send({ title: "x" }).expect(403).end((e2) => {
            if (e2) return done(e2);
            httpNodeRequest().post("/api/v1/tasks").set("Authorization", write).send({}).expect(400).end((e3) => {
              if (e3) return done(e3);
              httpNodeRequest().post("/api/v1/tasks").set("Authorization", write).send({ title: "Ship it" }).expect(201).end(done);
            });
          });
        });
      }, 200);
    });
  });
});

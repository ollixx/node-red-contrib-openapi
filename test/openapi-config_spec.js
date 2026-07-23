"use strict";

// Auth-in-config behaviour (P2 / ADR 0001): openapi-config carries the auth
// configuration itself (there is no separate openapi-auth node) and exposes
// authenticate() that delegates to lib/auth. Proven both directly (delegation
// for apiKey/basic/bearer/OR) and over HTTP (a secured operation → 401/403/200).
const assert = require("assert");
const helper = require("node-red-node-test-helper");
const { httpNodeRequest } = require("./helpers/http-node");
const configNode = require("../nodes/openapi-config.js");
const inNode = require("../nodes/openapi-in.js");
const responseNode = require("../nodes/openapi-response.js");
const fs = require("fs");
const path = require("path");

const SPEC = fs.readFileSync(path.join(__dirname, "..", "examples", "petstore.json"), "utf8");

// See test/integration_spec.js: skip cleanly when node-red is not resolvable.
let nodeRedPath = null;
try {
  nodeRedPath = require.resolve("node-red");
} catch {
  // node-red not installed — skip below.
}
const describeIntegration = nodeRedPath ? describe : describe.skip;
if (nodeRedPath) helper.init(nodeRedPath);

// A spec exposing apiKey + basic + bearer schemes, to prove delegation across
// all scheme kinds and an OR of requirements through the config node.
const MULTI_SPEC = JSON.stringify({
  openapi: "3.0.3",
  info: { title: "Multi", version: "1.0.0" },
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
      BasicAuth: { type: "http", scheme: "basic" },
      BearerAuth: { type: "http", scheme: "bearer" },
    },
  },
  paths: { "/ping": { get: { operationId: "ping", responses: { "200": { description: "ok" } } } } },
});

const mkReq = (h) => ({
  headers: Object.fromEntries(Object.entries(h || {}).map(([k, v]) => [k.toLowerCase(), v])),
  query: {},
});

// Structural proof that the separate openapi-auth node is gone (runs without
// node-red). Turns red if the node type, its files, or a flow reference return.
describe("openapi-auth removal (structural)", function () {
  it("package.json no longer registers openapi-auth", function () {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
    assert.ok(!("openapi-auth" in pkg["node-red"].nodes), "openapi-auth must not be registered");
    assert.ok(pkg["node-red"].nodes["openapi-config"], "openapi-config must still be registered");
  });
  it("openapi-auth node files are deleted", function () {
    assert.ok(!fs.existsSync(path.join(__dirname, "..", "nodes", "openapi-auth.js")));
    assert.ok(!fs.existsSync(path.join(__dirname, "..", "nodes", "openapi-auth.html")));
  });
  it("the example flow has no openapi-auth node and no stray auth reference", function () {
    const flow = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "examples", "flow.json"), "utf8"));
    assert.ok(!flow.some((n) => n.type === "openapi-auth"), "no openapi-auth node in the example flow");
    const cfg = flow.find((n) => n.type === "openapi-config");
    assert.ok(cfg, "example flow has an openapi-config node");
    assert.strictEqual(cfg.auth, undefined, "config node must not carry an 'auth' reference");
  });
});

describeIntegration("openapi-config auth (merged from openapi-auth)", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });
  afterEach(function (done) {
    helper.unload().then(() => helper.stopServer(done));
  });

  it("exposes authenticate() delegating to lib/auth with node config, and no legacy getAuthNode()", function (done) {
    const flow = [{ id: "cfg", type: "openapi-config", source: "inline", inline: MULTI_SPEC, mode: "enforce", metaJson: false, metaYaml: false, metaDocs: false }];
    const creds = { cfg: { apiKeys: "s1", basicUsers: "alice:pw" } };
    helper.load([configNode], flow, creds, function () {
      setTimeout(() => {
        try {
          const cfg = helper.getNode("cfg");
          assert.strictEqual(typeof cfg.authenticate, "function", "authenticate() must exist");
          assert.strictEqual(cfg.getAuthNode, undefined, "legacy getAuthNode() must be gone");
          const schemes = cfg.getSecuritySchemes();

          // apiKey: valid / wrong / missing
          assert.strictEqual(cfg.authenticate([{ ApiKeyAuth: [] }], schemes, mkReq({ "X-API-Key": "s1" })).ok, true);
          assert.strictEqual(cfg.authenticate([{ ApiKeyAuth: [] }], schemes, mkReq({ "X-API-Key": "no" })).status, 403);
          assert.strictEqual(cfg.authenticate([{ ApiKeyAuth: [] }], schemes, mkReq({})).status, 401);

          // basic: credentials come from the config node's credentials
          const basic = "Basic " + Buffer.from("alice:pw").toString("base64");
          assert.strictEqual(cfg.authenticate([{ BasicAuth: [] }], schemes, mkReq({ Authorization: basic })).ok, true);
          const badBasic = "Basic " + Buffer.from("alice:x").toString("base64");
          assert.strictEqual(cfg.authenticate([{ BasicAuth: [] }], schemes, mkReq({ Authorization: badBasic })).ok, false);

          // bearer: extracted (presence accepted at MVP), token surfaced
          const bearer = cfg.authenticate([{ BearerAuth: ["read"] }], schemes, mkReq({ Authorization: "Bearer t.k" }));
          assert.strictEqual(bearer.ok, true);
          assert.strictEqual(bearer.auth.token, "t.k");

          // OR: apiKey wrong but basic satisfies -> ok via basic
          const or = cfg.authenticate([{ ApiKeyAuth: [] }, { BasicAuth: [] }], schemes, mkReq({ Authorization: basic }));
          assert.strictEqual(or.ok, true);
          assert.strictEqual(or.auth.scheme, "BasicAuth");
          done();
        } catch (e) {
          done(e);
        }
      }, 200);
    });
  });

  function securedFlow() {
    return [
      { id: "cfg", type: "openapi-config", source: "inline", inline: SPEC, mode: "enforce", metaJson: false, metaYaml: false, metaDocs: false },
      { id: "in1", type: "openapi-in", server: "cfg", operation: "createPet", onError: "respond", wires: [["resp"], []] },
      { id: "resp", type: "openapi-response", server: "cfg", validation: "off", wires: [] },
    ];
  }

  it("secured operation → 401 when the credential is missing", function (done) {
    helper.load([configNode, inNode, responseNode], securedFlow(), { cfg: { apiKeys: "secret1" } }, function () {
      setTimeout(() => {
        httpNodeRequest().post("/api/v1/pets").send({ name: "Rex" }).expect(401).end(done);
      }, 200);
    });
  });

  it("secured operation → 403 when the credential is wrong", function (done) {
    helper.load([configNode, inNode, responseNode], securedFlow(), { cfg: { apiKeys: "secret1" } }, function () {
      setTimeout(() => {
        httpNodeRequest().post("/api/v1/pets").set("X-API-Key", "wrong").send({ name: "Rex" }).expect(403).end(done);
      }, 200);
    });
  });

  it("secured operation → passes with a valid credential and fills msg.auth", function (done) {
    helper.load([configNode, inNode, responseNode], securedFlow(), { cfg: { apiKeys: "secret1" } }, function () {
      const in1 = helper.getNode("in1");
      const origSend = in1.send.bind(in1);
      in1.send = function (msgs) {
        const msg = Array.isArray(msgs) ? msgs[0] : msgs;
        if (msg) {
          try {
            assert.strictEqual(msg.auth.scheme, "ApiKeyAuth", "msg.auth.scheme");
            assert.strictEqual(msg.auth.token, "secret1", "msg.auth.token");
            msg.statusCode = 201;
            msg.payload = { id: 1, name: "Rex" };
          } catch (e) {
            return done(e);
          }
        }
        return origSend(msgs);
      };
      setTimeout(() => {
        httpNodeRequest()
          .post("/api/v1/pets")
          .set("X-API-Key", "secret1")
          .send({ name: "Rex" })
          .expect(201)
          .end((err) => done(err));
      }, 200);
    });
  });
});

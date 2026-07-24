"use strict";

// P7 — bearer JWT verification in openapi-config. A configured shared secret
// (HS256) makes bearer auth actually verify signature + expiry instead of just
// accepting any token; verified claims surface in msg.auth.claims.
const assert = require("assert");
const helper = require("node-red-node-test-helper");
const jwt = require("jsonwebtoken");
const { httpNodeRequest } = require("./helpers/http-node");
const configNode = require("../nodes/openapi-config.js");
const inNode = require("../nodes/openapi-in.js");
const responseNode = require("../nodes/openapi-response.js");

let nodeRedPath = null;
try {
  nodeRedPath = require.resolve("node-red");
} catch {
  // skip below when node-red is absent
}
const describeIntegration = nodeRedPath ? describe : describe.skip;
if (nodeRedPath) helper.init(nodeRedPath);

const SECRET = "s3cret";
const BEARER_SPEC = JSON.stringify({
  openapi: "3.0.3",
  info: { title: "B", version: "1.0.0" },
  servers: [{ url: "/api/v1" }],
  components: { securitySchemes: { BearerAuth: { type: "http", scheme: "bearer" } } },
  paths: {
    "/secure": {
      get: { operationId: "secure", security: [{ BearerAuth: [] }], responses: { "200": { description: "ok" } } },
    },
  },
});

const mkReq = (h) => ({
  headers: Object.fromEntries(Object.entries(h || {}).map(([k, v]) => [k.toLowerCase(), v])),
  query: {},
});
const sign = (payload, secret, opts) => jwt.sign(payload, secret, Object.assign({ algorithm: "HS256" }, opts));

describeIntegration("openapi-config bearer JWT verification (P7)", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });
  afterEach(function (done) {
    helper.unload().then(() => helper.stopServer(done));
  });

  const cfgFlow = () => [
    { id: "cfg", type: "openapi-config", source: "inline", inline: BEARER_SPEC, mode: "enforce", metaJson: false, metaYaml: false, metaDocs: false },
  ];

  it("verifies a valid HS256 token (claims surfaced) and rejects expired/wrong/missing", function (done) {
    helper.load([configNode], cfgFlow(), { cfg: { jwtSecret: SECRET } }, function () {
      setTimeout(() => {
        try {
          const cfg = helper.getNode("cfg");
          const schemes = cfg.getSecuritySchemes();
          const good = sign({ sub: "u1", scope: "read" }, SECRET, { expiresIn: "1h" });
          const okr = cfg.authenticate([{ BearerAuth: [] }], schemes, mkReq({ Authorization: "Bearer " + good }));
          assert.strictEqual(okr.ok, true);
          assert.strictEqual(okr.auth.claims.sub, "u1", "verified claims surface");
          assert.strictEqual(okr.auth.token, good);

          const expired = sign({ sub: "u1" }, SECRET, { expiresIn: -10 });
          assert.strictEqual(cfg.authenticate([{ BearerAuth: [] }], schemes, mkReq({ Authorization: "Bearer " + expired })).status, 401);

          const wrong = sign({ sub: "u1" }, "other-secret");
          assert.strictEqual(cfg.authenticate([{ BearerAuth: [] }], schemes, mkReq({ Authorization: "Bearer " + wrong })).status, 401);

          assert.strictEqual(cfg.authenticate([{ BearerAuth: [] }], schemes, mkReq({})).status, 401);
          done();
        } catch (e) {
          done(e);
        }
      }, 200);
    });
  });

  it("without a configured secret, a bearer token is only extracted (presence accepted, no claims)", function (done) {
    helper.load([configNode], cfgFlow(), {}, function () {
      setTimeout(() => {
        try {
          const cfg = helper.getNode("cfg");
          const schemes = cfg.getSecuritySchemes();
          const r = cfg.authenticate([{ BearerAuth: [] }], schemes, mkReq({ Authorization: "Bearer not.a.real.jwt" }));
          assert.strictEqual(r.ok, true, "presence accepted when no verification is configured");
          assert.strictEqual(r.auth.claims, null);
          done();
        } catch (e) {
          done(e);
        }
      }, 200);
    });
  });

  it("HTTP: bearer-secured operation passes with a valid token (claims in msg.auth) and 401s an expired one", function (done) {
    const flow = [
      { id: "cfg", type: "openapi-config", source: "inline", inline: BEARER_SPEC, mode: "enforce", metaJson: false, metaYaml: false, metaDocs: false },
      { id: "in1", type: "openapi-in", server: "cfg", operation: "secure", onError: "respond", wires: [["resp"], []] },
      { id: "resp", type: "openapi-response", server: "cfg", validation: "off", wires: [] },
    ];
    helper.load([configNode, inNode, responseNode], flow, { cfg: { jwtSecret: SECRET } }, function () {
      const in1 = helper.getNode("in1");
      const orig = in1.send.bind(in1);
      in1.send = function (msgs) {
        const m = Array.isArray(msgs) ? msgs[0] : msgs;
        if (m) {
          try {
            assert.strictEqual(m.auth.claims.sub, "u1", "verified claims reach the flow");
            m.statusCode = 200;
            m.payload = { ok: true };
          } catch (e) {
            return done(e);
          }
        }
        return orig(msgs);
      };
      const good = sign({ sub: "u1" }, SECRET, { expiresIn: "1h" });
      const expired = sign({ sub: "u1" }, SECRET, { expiresIn: -10 });
      setTimeout(() => {
        httpNodeRequest()
          .get("/api/v1/secure")
          .set("Authorization", "Bearer " + expired)
          .expect(401)
          .end((e) => {
            if (e) return done(e);
            httpNodeRequest()
              .get("/api/v1/secure")
              .set("Authorization", "Bearer " + good)
              .expect(200)
              .end((e2, r) => {
                if (e2) return done(e2);
                assert.strictEqual(r.body.ok, true);
                done();
              });
          });
      }, 200);
    });
  });
});

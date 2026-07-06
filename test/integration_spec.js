"use strict";

// End-to-end tests using node-red-node-test-helper. Requires `npm install`.
const helper = require("node-red-node-test-helper");
const { httpNodeRequest } = require("./helpers/http-node");
const configNode = require("../nodes/openapi-config.js");
const inNode = require("../nodes/openapi-in.js");
const responseNode = require("../nodes/openapi-response.js");
const fs = require("fs");
const path = require("path");

const SPEC = fs.readFileSync(path.join(__dirname, "..", "examples", "petstore.json"), "utf8");

// Integration tests need a resolvable `node-red` for node-red-node-test-helper.
// Mocha loads EVERY spec file before running any test, so a hard require of an
// absent `node-red` here would abort the whole suite (not just this file) with
// "Cannot find module 'node-red'". Guard it: when node-red is not installed,
// skip this file's tests cleanly and let the rest of the suite run. (Roadmap P1)
let nodeRedPath = null;
try {
  nodeRedPath = require.resolve("node-red");
} catch {
  // node-red not installed — integration tests will be skipped below.
}

const describeIntegration = nodeRedPath ? describe : describe.skip;
if (nodeRedPath) helper.init(nodeRedPath);

describeIntegration("openapi-in integration", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });
  afterEach(function (done) {
    helper.unload().then(() => helper.stopServer(done));
  });

  function baseFlow(extra) {
    return [
      { id: "cfg", type: "openapi-config", source: "inline", inline: SPEC, metaJson: true, metaYaml: false, metaDocs: false },
      ...extra,
    ];
  }

  it("serves the meta openapi.json endpoint", function (done) {
    helper.load([configNode], baseFlow([]), function () {
      // Give the deferred spec load a tick.
      setTimeout(() => {
        httpNodeRequest()
          .get("/api/v1/openapi.json")
          .expect(200)
          .expect("Content-Type", /json/)
          .end((err, res) => {
            if (err) return done(err);
            if (res.body.info.title !== "Petstore") return done(new Error("wrong spec served"));
            done();
          });
      }, 200);
    });
  });

  it("auto-responds 400 on an invalid path parameter", function (done) {
    const flow = baseFlow([
      { id: "in1", type: "openapi-in", server: "cfg", operation: "getPet", onError: "respond", wires: [[], []] },
    ]);
    helper.load([configNode, inNode], flow, function () {
      setTimeout(() => {
        httpNodeRequest().get("/api/v1/pets/notanumber").expect(400).end(done);
      }, 200);
    });
  });

  it("emits a normalized msg for a valid request", function (done) {
    const flow = baseFlow([
      { id: "in1", type: "openapi-in", server: "cfg", operation: "getPet", onError: "respond", wires: [["resp"], []] },
      { id: "resp", type: "openapi-response", server: "cfg", validation: "off", wires: [] },
    ]);
    helper.load([configNode, inNode, responseNode], flow, function () {
      const in1 = helper.getNode("in1");
      // Intercept the normalized message before the response node ends the request.
      const origSend = in1.send.bind(in1);
      in1.send = function (msgs) {
        const msg = Array.isArray(msgs) ? msgs[0] : msgs;
        if (msg) {
          try {
            if (msg.openapi.operationId !== "getPet") throw new Error("wrong op");
            if (Number(msg.parameters.path.petId) !== 7) throw new Error("param not coerced");
            msg.statusCode = 200;
            msg.payload = { id: 7, name: "Rex" };
          } catch (e) {
            return done(e);
          }
        }
        return origSend(msgs);
      };
      setTimeout(() => {
        httpNodeRequest().get("/api/v1/pets/7").expect(200).end((err, res) => {
          if (err) return done(err);
          if (res.body.name !== "Rex") return done(new Error("unexpected body"));
          done();
        });
      }, 200);
    });
  });
});

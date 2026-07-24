"use strict";

// openapi-in node behaviours: configurable body-size limit (413) and the
// onError="output" branch (route validation/auth failures to the 2nd output
// instead of auto-responding).
const assert = require("assert");
const helper = require("node-red-node-test-helper");
const { httpNodeRequest } = require("./helpers/http-node");
const configNode = require("../nodes/openapi-config.js");
const inNode = require("../nodes/openapi-in.js");
const fs = require("fs");
const path = require("path");

const SPEC = fs.readFileSync(path.join(__dirname, "..", "examples", "petstore.json"), "utf8");

let nodeRedPath = null;
try {
  nodeRedPath = require.resolve("node-red");
} catch {
  // skip below if node-red is not installed
}
const describeIntegration = nodeRedPath ? describe : describe.skip;
if (nodeRedPath) helper.init(nodeRedPath);

function baseCfg(extra) {
  return [
    { id: "cfg", type: "openapi-config", source: "inline", inline: SPEC, mode: "extract", metaJson: false, metaYaml: false, metaDocs: false },
    ...extra,
  ];
}

describeIntegration("openapi-in", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });
  afterEach(function (done) {
    helper.unload().then(() => helper.stopServer(done));
  });

  // Body-size limiting is Node-RED's job (ADR 0003); the fallback parser's fixed
  // internal cap is unit-tested in test/body-parser_spec.js.

  it("onError=output routes a validation failure to the 2nd output instead of responding", function (done) {
    const flow = baseCfg([
      { id: "in1", type: "openapi-in", server: "cfg", operation: "getPet", onError: "output", wires: [[], []] },
    ]);
    helper.load([configNode, inNode], flow, function () {
      const in1 = helper.getNode("in1");
      const orig = in1.send.bind(in1);
      in1.send = function (msgs) {
        try {
          assert.ok(Array.isArray(msgs), "send called with an array of outputs");
          assert.strictEqual(msgs[0], null, "no message on the request (1st) output");
          const err = msgs[1];
          assert.ok(err, "error message present on the 2nd output");
          assert.strictEqual(err.statusCode, 400);
          assert.ok(err.errors && err.errors.length >= 1, "error details present");
          // The node did NOT respond (onError=output); end the request here.
          err.res.status(err.statusCode).json({ handled: true });
        } catch (e) {
          return done(e);
        }
        return orig(msgs);
      };
      setTimeout(() => {
        httpNodeRequest()
          .get("/api/v1/pets/notanumber")
          .expect(400)
          .end((e, r) => {
            if (e) return done(e);
            assert.strictEqual(r.body.handled, true, "response produced by the flow, not the node");
            done();
          });
      }, 200);
    });
  });
});

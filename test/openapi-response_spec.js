"use strict";

// openapi-response: validation modes (strict/warn/off), msg.error → spec-shaped
// error body (RFC 7807 or plain), and the send-exactly-once guard. Driven with a
// recording fake `res` — no HTTP round-trip needed to observe what is sent.
const assert = require("assert");
const helper = require("node-red-node-test-helper");
const configNode = require("../nodes/openapi-config.js");
const responseNode = require("../nodes/openapi-response.js");
const fs = require("fs");
const path = require("path");

const SPEC = fs.readFileSync(path.join(__dirname, "..", "examples", "petstore.json"), "utf8");

let nodeRedPath = null;
try {
  nodeRedPath = require.resolve("node-red");
} catch {
  // skip below when node-red is absent
}
const describeIntegration = nodeRedPath ? describe : describe.skip;
if (nodeRedPath) helper.init(nodeRedPath);

function fakeRes() {
  const rec = { statusCode: null, body: undefined, headers: {}, ended: false };
  const res = {
    rec,
    headersSent: false,
    status(c) {
      rec.statusCode = c;
      return this;
    },
    json(b) {
      rec.body = b;
      rec.ended = true;
      this.headersSent = true;
      return this;
    },
    send(b) {
      rec.body = b;
      rec.ended = true;
      this.headersSent = true;
      return this;
    },
    end() {
      rec.ended = true;
      this.headersSent = true;
      return this;
    },
    set(k, v) {
      rec.headers[k] = v;
      return this;
    },
  };
  return res;
}

// getPet's 200 response schema is Pet (requires id AND name), so { id } alone is
// a spec violation we can drive the validation modes with.
const INVALID_PET = { id: 1 };

function flow(validation, errorFormat) {
  return [
    { id: "cfg", type: "openapi-config", source: "inline", inline: SPEC, metaJson: false, metaYaml: false, metaDocs: false },
    { id: "resp", type: "openapi-response", server: "cfg", validation, errorFormat: errorFormat || "problem", wires: [] },
  ];
}

function msgFor(res, extra) {
  return Object.assign({ res, openapi: { operationId: "getPet" }, statusCode: 200, payload: INVALID_PET }, extra);
}

describeIntegration("openapi-response", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });
  afterEach(function (done) {
    helper.unload().then(() => helper.stopServer(done));
  });

  function withNode(validation, errorFormat, fn, done) {
    helper.load([configNode, responseNode], flow(validation, errorFormat), function () {
      setTimeout(() => {
        try {
          fn(helper.getNode("resp"));
          done();
        } catch (e) {
          done(e);
        }
      }, 200);
    });
  }

  it("validation=off sends the payload even when it violates the spec", function (done) {
    withNode("off", null, (node) => {
      const res = fakeRes();
      node.receive(msgFor(res));
      assert.strictEqual(res.rec.statusCode, 200);
      assert.deepStrictEqual(res.rec.body, INVALID_PET);
    }, done);
  });

  it("validation=warn still sends the payload (but flags the mismatch)", function (done) {
    withNode("warn", null, (node) => {
      const res = fakeRes();
      node.receive(msgFor(res));
      assert.strictEqual(res.rec.statusCode, 200, "warn mode must still send");
      assert.deepStrictEqual(res.rec.body, INVALID_PET);
    }, done);
  });

  it("validation=strict replaces an invalid response with 500", function (done) {
    withNode("strict", null, (node) => {
      const res = fakeRes();
      node.receive(msgFor(res));
      assert.strictEqual(res.rec.statusCode, 500, "strict mode must not send an invalid body");
      assert.notDeepStrictEqual(res.rec.body, INVALID_PET);
    }, done);
  });

  it("maps msg.error to an RFC 7807 problem body", function (done) {
    withNode("off", "problem", (node) => {
      const res = fakeRes();
      node.receive(msgFor(res, { payload: undefined, error: { statusCode: 404, title: "Not Found", detail: "no pet 9" } }));
      assert.strictEqual(res.rec.statusCode, 404);
      assert.strictEqual(res.rec.body.type, "about:blank");
      assert.strictEqual(res.rec.body.title, "Not Found");
      assert.strictEqual(res.rec.body.status, 404);
      assert.strictEqual(res.rec.body.detail, "no pet 9");
    }, done);
  });

  it("maps msg.error to a plain error body when errorFormat=plain", function (done) {
    withNode("off", "plain", (node) => {
      const res = fakeRes();
      node.receive(msgFor(res, { payload: undefined, error: { statusCode: 409, detail: "conflict" } }));
      assert.strictEqual(res.rec.statusCode, 409);
      assert.strictEqual(res.rec.body.error, "Conflict");
      assert.strictEqual(res.rec.body.status, 409);
      assert.strictEqual(res.rec.body.detail, "conflict");
      assert.strictEqual(res.rec.body.type, undefined, "plain format has no RFC 7807 'type'");
    }, done);
  });

  it("does not send twice when the response was already sent", function (done) {
    withNode("off", null, (node) => {
      const res = fakeRes();
      res.headersSent = true;
      node.receive(msgFor(res));
      assert.strictEqual(res.rec.statusCode, null, "must not write to an already-sent response");
      assert.strictEqual(res.rec.ended, false);
    }, done);
  });

  it("applies msg.headers to the response", function (done) {
    withNode("off", null, (node) => {
      const res = fakeRes();
      node.receive(msgFor(res, { headers: { "X-Custom": "abc" } }));
      assert.strictEqual(res.rec.headers["X-Custom"], "abc");
    }, done);
  });
});

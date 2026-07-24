"use strict";

// Node-level coverage for every spec source of openapi-config (inline is already
// covered by the other integration specs). Exercises the node's own wiring:
// file/url reads and the node-specific resolveContextValue() (global./flow. prefixes,
// object vs JSON-string context values).
const assert = require("assert");
const helper = require("node-red-node-test-helper");
const configNode = require("../nodes/openapi-config.js");
const fs = require("fs");
const path = require("path");

const SPEC_JSON = fs.readFileSync(path.join(__dirname, "..", "examples", "petstore.json"), "utf8");
const SPEC_OBJ = JSON.parse(SPEC_JSON);

let nodeRedPath = null;
try {
  nodeRedPath = require.resolve("node-red");
} catch {
  // skip if node-red is absent
}
const describeIntegration = nodeRedPath ? describe : describe.skip;
if (nodeRedPath) helper.init(nodeRedPath);

describeIntegration("openapi-config spec sources (node level)", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });
  afterEach(function (done) {
    helper.unload().then(() => helper.stopServer(done));
  });

  // Load the config node, run `after(cfg)` once it exists, then re-run node.load()
  // deterministically (the constructor's initial load is on setTimeout(0), before
  // we can seed context / stub fetch — an explicit load() re-reads the source).
  function withCfg(nodeCfg, after) {
    const flow = [Object.assign({ id: "cfg", type: "openapi-config", metaJson: false, metaYaml: false, metaDocs: false }, nodeCfg)];
    helper.load([configNode], flow, function () {
      after(helper.getNode("cfg"));
    });
  }

  it("file: reads and indexes the spec from disk", function (done) {
    withCfg({ source: "file", file: "examples/petstore.json" }, (cfg) => {
      cfg.load().then((ok) => {
        try {
          assert.strictEqual(ok, true, "load succeeded");
          assert.ok(cfg.getOperation("getPet"), "operation indexed from the file");
          done();
        } catch (e) {
          done(e);
        }
      }, done);
    });
  });

  it("url: fetches the spec via global fetch", function (done) {
    const orig = global.fetch;
    global.fetch = async () => ({ ok: true, status: 200, text: async () => SPEC_JSON });
    withCfg({ source: "url", url: "http://example.test/spec.json" }, (cfg) => {
      cfg.load().then((ok) => {
        global.fetch = orig;
        try {
          assert.strictEqual(ok, true);
          assert.ok(cfg.getOperation("getPet"));
          done();
        } catch (e) {
          done(e);
        }
      }, (e) => { global.fetch = orig; done(e); });
    });
  });

  it("context (global. prefix, object value): resolves via node context", function (done) {
    withCfg({ source: "context", contextKey: "global.mySpec" }, (cfg) => {
      cfg.context().global.set("mySpec", SPEC_OBJ);
      cfg.load().then((ok) => {
        try {
          assert.strictEqual(ok, true);
          assert.ok(cfg.getOperation("createPet"));
          done();
        } catch (e) {
          done(e);
        }
      }, done);
    });
  });

  it("context (global. prefix, JSON-string value): parses the string", function (done) {
    withCfg({ source: "context", contextKey: "global.specStr" }, (cfg) => {
      cfg.context().global.set("specStr", SPEC_JSON); // string → parsed by the loader
      cfg.load().then((ok) => {
        try {
          assert.strictEqual(ok, true);
          assert.ok(cfg.getOperation("getPet"));
          done();
        } catch (e) {
          done(e);
        }
      }, done);
    });
  });

  it("context: empty/unset value fails cleanly (loadError, not a crash)", function (done) {
    withCfg({ source: "context", contextKey: "global.missing" }, (cfg) => {
      cfg.load().then((ok) => {
        try {
          assert.strictEqual(ok, false, "unresolved context → load fails");
          assert.ok(cfg.loadError, "loadError is set");
          done();
        } catch (e) {
          done(e);
        }
      }, done);
    });
  });
});

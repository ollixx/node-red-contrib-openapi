"use strict";

// Fallback body parser (P15/ADR 0003): a fixed internal cap, not a config field.
// Driven with a simulated request stream — no node-red, no HTTP.
const assert = require("assert");
const { EventEmitter } = require("events");
const { makeBodyParser, DEFAULT_MAX_BODY_BYTES } = require("../lib/body-parser");

function fakeReq(headers) {
  const r = new EventEmitter();
  r.headers = headers || {};
  r.destroy = () => { r.destroyed = true; };
  return r;
}
function fakeRes() {
  const rec = { status: null, body: undefined };
  return { rec, status(c) { rec.status = c; return this; }, json(b) { rec.body = b; return this; } };
}

describe("body-parser (fallback)", function () {
  it("exposes a fixed 1 MB default cap (not configurable)", function () {
    assert.strictEqual(DEFAULT_MAX_BODY_BYTES, 1024 * 1024);
  });

  it("parses a JSON body under the cap", function (done) {
    const req = fakeReq({ "content-type": "application/json" });
    const res = fakeRes();
    makeBodyParser(1000)(req, res, () => {
      assert.deepStrictEqual(req.body, { a: 1 });
      assert.strictEqual(res.rec.status, null, "no error status on a small body");
      done();
    });
    req.emit("data", Buffer.from('{"a":1}'));
    req.emit("end");
  });

  it("rejects a body over the cap with 413 and does not call next", function () {
    const req = fakeReq({ "content-type": "application/json" });
    const res = fakeRes();
    let nexted = false;
    makeBodyParser(20)(req, res, () => { nexted = true; });
    req.emit("data", Buffer.from("x".repeat(30))); // exceeds 20 bytes
    assert.strictEqual(res.rec.status, 413);
    assert.strictEqual(res.rec.body.limit, 20);
    assert.strictEqual(nexted, false, "handler must not run for an oversized body");
    assert.strictEqual(req.destroyed, true, "the request stream is destroyed");
  });

  it("skips entirely when the body was already parsed upstream", function (done) {
    const req = fakeReq({ "content-type": "application/json" });
    req.body = { already: "parsed" }; // Node-RED already set it
    const res = fakeRes();
    makeBodyParser(20)(req, res, () => {
      assert.deepStrictEqual(req.body, { already: "parsed" }, "must not touch an existing body");
      done();
    });
  });

  it("parses urlencoded bodies", function (done) {
    const req = fakeReq({ "content-type": "application/x-www-form-urlencoded" });
    const res = fakeRes();
    makeBodyParser(1000)(req, res, () => {
      assert.deepStrictEqual(req.body, { a: "1", b: "2" });
      done();
    });
    req.emit("data", Buffer.from("a=1&b=2"));
    req.emit("end");
  });
});

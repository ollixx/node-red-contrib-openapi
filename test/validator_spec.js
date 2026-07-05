"use strict";

// Requires dependencies to be installed (ajv, ajv-formats, swagger-parser, js-yaml).
const assert = require("assert");
const path = require("path");
const { loadSpec } = require("../lib/spec-loader");
const { OperationValidator } = require("../lib/validator");

describe("spec-loader + validator (Petstore)", function () {
  let spec;
  before(async function () {
    spec = await loadSpec({ source: "file", file: path.join(__dirname, "..", "examples", "petstore.json") });
  });

  it("indexes operations and resolves the server prefix", function () {
    assert.strictEqual(spec.prefix, "/api/v1");
    assert.ok(spec.index.byId.getPet);
    assert.ok(spec.index.byId.createPet);
    assert.strictEqual(spec.index.byId.getPet.method, "get");
  });

  it("coerces and validates path parameters", function () {
    const v = new OperationValidator(spec.index.byId.getPet);
    const params = { path: { petId: "42" }, query: {}, header: {}, cookie: {} };
    const r = v.validateRequest({ parameters: params, body: undefined, contentType: "" });
    assert.strictEqual(r.valid, true);
    assert.strictEqual(params.path.petId, 42); // coerced to integer
  });

  it("rejects an invalid path parameter", function () {
    const v = new OperationValidator(spec.index.byId.getPet);
    const params = { path: { petId: "abc" }, query: {}, header: {}, cookie: {} };
    const r = v.validateRequest({ parameters: params, body: undefined, contentType: "" });
    assert.strictEqual(r.valid, false);
    assert.ok(r.errors.length >= 1);
  });

  it("validates a request body against the schema", function () {
    const v = new OperationValidator(spec.index.byId.createPet);
    const good = v.validateRequest({ parameters: { path: {}, query: {}, header: {}, cookie: {} }, body: { name: "Rex" }, contentType: "application/json" });
    assert.strictEqual(good.valid, true);
    const bad = v.validateRequest({ parameters: { path: {}, query: {}, header: {}, cookie: {} }, body: { tag: "dog" }, contentType: "application/json" });
    assert.strictEqual(bad.valid, false); // missing required "name"
  });

  it("validates response bodies against the spec", function () {
    const v = new OperationValidator(spec.index.byId.getPet);
    assert.strictEqual(v.validateResponse(200, "application/json", { id: 1, name: "Rex" }).valid, true);
    const bad = v.validateResponse(200, "application/json", { id: 1 });
    assert.strictEqual(bad.matched, true);
    assert.strictEqual(bad.valid, false);
  });
});

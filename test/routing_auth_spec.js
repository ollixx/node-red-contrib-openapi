"use strict";

// Dependency-free unit tests for routing + auth logic.
const assert = require("assert");
const { toExpressPath, joinPath } = require("../lib/routing");
const { authenticate } = require("../lib/auth");

const schemes = {
  ApiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
  BearerAuth: { type: "http", scheme: "bearer" },
  BasicAuth: { type: "http", scheme: "basic" },
};
const mkReq = (h, q) => ({
  headers: Object.fromEntries(Object.entries(h || {}).map(([k, v]) => [k.toLowerCase(), v])),
  query: q || {},
});

describe("routing", function () {
  it("rewrites OpenAPI path params to Express", function () {
    assert.strictEqual(toExpressPath("/pet/{petId}/img"), "/pet/:petId/img");
  });
  it("joins prefix and path collapsing slashes", function () {
    assert.strictEqual(joinPath("/v1/", "/a"), "/v1/a");
    assert.strictEqual(joinPath("", "openapi.json"), "/openapi.json");
  });
});

describe("auth", function () {
  it("treats empty security as open", function () {
    const r = authenticate([], schemes, mkReq({}), { mode: "enforce" });
    assert.strictEqual(r.ok, true);
  });
  it("401 when credential missing, 403 when wrong", function () {
    let r = authenticate([{ ApiKeyAuth: [] }], schemes, mkReq({}), { mode: "enforce", apiKeys: ["s1"] });
    assert.strictEqual(r.status, 401);
    r = authenticate([{ ApiKeyAuth: [] }], schemes, mkReq({ "X-API-Key": "no" }), { mode: "enforce", apiKeys: ["s1"] });
    assert.strictEqual(r.status, 403);
  });
  it("accepts a valid api key", function () {
    const r = authenticate([{ ApiKeyAuth: [] }], schemes, mkReq({ "X-API-Key": "s1" }), { mode: "enforce", apiKeys: ["s1"] });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.auth.scheme, "ApiKeyAuth");
  });
  it("extracts a bearer token in extract mode", function () {
    const r = authenticate([{ BearerAuth: ["read"] }], schemes, mkReq({ Authorization: "Bearer t.k" }), { mode: "extract" });
    assert.strictEqual(r.auth.token, "t.k");
    assert.deepStrictEqual(r.auth.scopes, ["read"]);
  });
  it("validates basic auth credentials", function () {
    const ok = Buffer.from("alice:pw").toString("base64");
    const bad = Buffer.from("alice:x").toString("base64");
    assert.strictEqual(authenticate([{ BasicAuth: [] }], schemes, mkReq({ Authorization: "Basic " + ok }), { mode: "enforce", basicUsers: { alice: "pw" } }).ok, true);
    assert.strictEqual(authenticate([{ BasicAuth: [] }], schemes, mkReq({ Authorization: "Basic " + bad }), { mode: "enforce", basicUsers: { alice: "pw" } }).ok, false);
  });
  it("satisfies an OR of requirements", function () {
    const ok = Buffer.from("alice:pw").toString("base64");
    const r = authenticate([{ ApiKeyAuth: [] }, { BasicAuth: [] }], schemes, mkReq({ Authorization: "Basic " + ok }), { mode: "enforce", apiKeys: ["x"], basicUsers: { alice: "pw" } });
    assert.strictEqual(r.auth.scheme, "BasicAuth");
  });
});

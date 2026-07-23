"use strict";

// Validator coverage beyond the Petstore happy path: query/header/cookie
// parameters, media-type selection (incl. wildcards), required-body handling,
// response-status fallbacks, and tolerance of OpenAPI-specific schema keywords.
const assert = require("assert");
const { OperationValidator, pickMedia } = require("../lib/validator");

function op(overrides) {
  return Object.assign(
    { operationId: "t", method: "get", path: "/t", parameters: [], requestBody: null, responses: {} },
    overrides
  );
}
const emptyParams = () => ({ path: {}, query: {}, header: {}, cookie: {} });

describe("validator — query parameters", function () {
  const v = new OperationValidator(
    op({
      parameters: [
        { name: "limit", in: "query", schema: { type: "integer" } },
        { name: "active", in: "query", schema: { type: "boolean" } },
        { name: "needed", in: "query", required: true, schema: { type: "string" } },
      ],
    })
  );

  it("coerces query values to their declared types", function () {
    const params = Object.assign(emptyParams(), { query: { limit: "10", active: "true", needed: "x" } });
    const r = v.validateRequest({ parameters: params, body: undefined, contentType: "" });
    assert.strictEqual(r.valid, true);
    assert.strictEqual(params.query.limit, 10);
    assert.strictEqual(params.query.active, true);
  });

  it("rejects a missing required query parameter", function () {
    const params = Object.assign(emptyParams(), { query: { limit: "1" } });
    assert.strictEqual(v.validateRequest({ parameters: params, body: undefined, contentType: "" }).valid, false);
  });

  it("rejects a query parameter of the wrong type", function () {
    const params = Object.assign(emptyParams(), { query: { limit: "abc", needed: "x" } });
    const r = v.validateRequest({ parameters: params, body: undefined, contentType: "" });
    assert.strictEqual(r.valid, false);
    assert.ok(r.errors.some((e) => e.location === "query parameter"));
  });
});

describe("validator — header and cookie parameters", function () {
  it("matches declared header names case-insensitively", function () {
    const v = new OperationValidator(
      op({ parameters: [{ name: "X-Trace", in: "header", required: true, schema: { type: "string" } }] })
    );
    const ok = Object.assign(emptyParams(), { header: { "x-trace": "abc" } });
    assert.strictEqual(v.validateRequest({ parameters: ok, body: undefined, contentType: "" }).valid, true);

    const missing = emptyParams();
    assert.strictEqual(v.validateRequest({ parameters: missing, body: undefined, contentType: "" }).valid, false);
  });

  it("validates required cookie parameters", function () {
    const v = new OperationValidator(
      op({ parameters: [{ name: "sid", in: "cookie", required: true, schema: { type: "string" } }] })
    );
    const ok = Object.assign(emptyParams(), { cookie: { sid: "s" } });
    assert.strictEqual(v.validateRequest({ parameters: ok, body: undefined, contentType: "" }).valid, true);
    assert.strictEqual(v.validateRequest({ parameters: emptyParams(), body: undefined, contentType: "" }).valid, false);
  });
});

describe("validator — request body", function () {
  it("reports a missing required body", function () {
    const v = new OperationValidator(
      op({ requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } } })
    );
    const r = v.validateRequest({ parameters: emptyParams(), body: undefined, contentType: "application/json" });
    assert.strictEqual(r.valid, false);
    assert.ok(r.errors.some((e) => e.location === "body" && /required/.test(e.message)));
  });

  it("selects a wildcard media type (application/*+json)", function () {
    const v = new OperationValidator(
      op({
        requestBody: {
          required: true,
          content: {
            "application/*+json": { schema: { type: "object", required: ["a"], properties: { a: { type: "string" } } } },
          },
        },
      })
    );
    const good = v.validateRequest({ parameters: emptyParams(), body: { a: "x" }, contentType: "application/vnd.foo+json" });
    assert.strictEqual(good.valid, true);
    const bad = v.validateRequest({ parameters: emptyParams(), body: {}, contentType: "application/vnd.foo+json" });
    assert.strictEqual(bad.valid, false);
  });

  it("tolerates OpenAPI-specific schema keywords (nullable/example)", function () {
    const v = new OperationValidator(
      op({
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["s"], properties: { s: { type: "string", nullable: true, example: "x" } } },
            },
          },
        },
      })
    );
    const r = v.validateRequest({ parameters: emptyParams(), body: { s: "hello" }, contentType: "application/json" });
    assert.strictEqual(r.valid, true, "schema using nullable/example must compile and validate");
  });
});

describe("validator — pickMedia", function () {
  const content = { "application/json": { schema: {} }, "text/*": { schema: {} } };
  it("matches exactly, ignoring content-type parameters", function () {
    assert.ok(pickMedia(content, "application/json; charset=utf-8"));
  });
  it("matches a wildcard entry", function () {
    assert.ok(pickMedia(content, "text/plain"));
  });
  it("returns null when nothing matches", function () {
    assert.strictEqual(pickMedia(content, "image/png"), null);
  });
});

describe("validator — response status fallbacks", function () {
  const v = new OperationValidator(
    op({
      responses: {
        "4XX": {
          description: "err",
          content: {
            "application/json": { schema: { type: "object", required: ["code"], properties: { code: { type: "integer" } } } },
          },
        },
      },
    })
  );

  it("falls back from an exact status to the NXX pattern", function () {
    const ok = v.validateResponse(404, "application/json", { code: 404 });
    assert.strictEqual(ok.matched, true);
    assert.strictEqual(ok.valid, true);

    const bad = v.validateResponse(404, "application/json", {});
    assert.strictEqual(bad.matched, true);
    assert.strictEqual(bad.valid, false);
  });

  it("reports matched=false when the spec has no schema for the status", function () {
    const r = v.validateResponse(200, "application/json", { anything: true });
    assert.strictEqual(r.matched, false);
    assert.strictEqual(r.valid, true);
  });
});

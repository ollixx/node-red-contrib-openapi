"use strict";

// Pure-logic coverage for lib/spec-loader (no node-red): parsing (JSON+YAML),
// all resolve sources, server-prefix derivation, and operation/param indexing.
const assert = require("assert");
const path = require("path");
const { parseRaw, resolveRaw, indexOperations, serverPrefix, loadSpec } = require("../lib/spec-loader");

describe("spec-loader parseRaw", function () {
  it("parses JSON", function () {
    assert.deepStrictEqual(parseRaw('{"a":1}'), { a: 1 });
  });
  it("parses YAML when the text is not JSON", function () {
    const o = parseRaw("openapi: 3.0.0\ninfo:\n  title: Y\n");
    assert.strictEqual(o.openapi, "3.0.0");
    assert.strictEqual(o.info.title, "Y");
  });
});

describe("spec-loader serverPrefix", function () {
  it("absolute URL → path portion only", function () {
    assert.strictEqual(serverPrefix({ servers: [{ url: "https://api.example.com/api/v1" }] }), "/api/v1");
  });
  it("path URL → trailing slash trimmed", function () {
    assert.strictEqual(serverPrefix({ servers: [{ url: "/v1/" }] }), "/v1");
  });
  it("no servers → empty prefix", function () {
    assert.strictEqual(serverPrefix({}), "");
  });
});

describe("spec-loader indexOperations + mergeParameters", function () {
  const api = {
    paths: {
      "/pets/{id}": {
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "trace", in: "header", schema: { type: "string" } },
        ],
        get: {
          operationId: "getPet",
          parameters: [
            { name: "trace", in: "header", schema: { type: "string", maxLength: 8 } },
            { name: "verbose", in: "query", schema: { type: "boolean" } },
          ],
          responses: { "200": { description: "ok" } },
        },
        delete: { responses: { "204": { description: "no content" } } },
      },
    },
  };
  const idx = indexOperations(api);

  it("indexes by operationId and by 'METHOD path'", function () {
    assert.ok(idx.byId.getPet);
    assert.ok(idx.byRoute["GET /pets/{id}"]);
  });
  it("falls back to 'METHOD path' when operationId is missing", function () {
    assert.ok(idx.byId["DELETE /pets/{id}"]);
  });
  it("merges path- and operation-level params, operation wins on name+in", function () {
    const params = idx.byId.getPet.parameters;
    const trace = params.filter((p) => p.in === "header" && p.name === "trace");
    assert.strictEqual(trace.length, 1, "trace param must not be duplicated");
    assert.strictEqual(trace[0].schema.maxLength, 8, "operation-level param wins");
    assert.ok(params.some((p) => p.name === "id" && p.in === "path"), "path-level id kept");
    assert.ok(params.some((p) => p.name === "verbose" && p.in === "query"), "operation-level query kept");
  });
});

describe("spec-loader resolveRaw sources", function () {
  it("inline", async function () {
    assert.deepStrictEqual(await resolveRaw({ source: "inline", inline: '{"x":1}' }), { x: 1 });
  });
  it("inline empty → throws", async function () {
    await assert.rejects(() => resolveRaw({ source: "inline", inline: "" }));
  });
  it("context: object passthrough and string parse", async function () {
    assert.deepStrictEqual(await resolveRaw({ source: "context", contextValue: { y: 2 } }), { y: 2 });
    assert.deepStrictEqual(await resolveRaw({ source: "context", contextValue: '{"y":3}' }), { y: 3 });
  });
  it("file", async function () {
    const doc = await resolveRaw({ source: "file", file: path.join(__dirname, "..", "examples", "petstore.json") });
    assert.strictEqual(doc.info.title, "Petstore");
  });
  it("url uses global fetch; a non-ok response throws", async function () {
    const orig = global.fetch;
    global.fetch = async () => ({ ok: true, status: 200, text: async () => '{"z":9}' });
    try {
      assert.deepStrictEqual(await resolveRaw({ source: "url", url: "http://x/spec" }), { z: 9 });
      global.fetch = async () => ({ ok: false, status: 500, text: async () => "" });
      await assert.rejects(() => resolveRaw({ source: "url", url: "http://x/spec" }));
    } finally {
      global.fetch = orig;
    }
  });
});

describe("spec-loader loadSpec (inline YAML end-to-end)", function () {
  it("validates, dereferences, indexes and derives the prefix", async function () {
    const yamlSpec = [
      "openapi: 3.0.3",
      "info: { title: Y, version: 1.0.0 }",
      "servers: [{ url: /v2 }]",
      "paths:",
      "  /ping:",
      "    get:",
      "      operationId: ping",
      "      responses: { '200': { description: ok } }",
    ].join("\n");
    const spec = await loadSpec({ source: "inline", inline: yamlSpec });
    assert.strictEqual(spec.prefix, "/v2");
    assert.ok(spec.index.byId.ping);
  });
});

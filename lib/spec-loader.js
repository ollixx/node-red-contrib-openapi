"use strict";

/**
 * Loads an OpenAPI spec from one of several sources, parses JSON or YAML,
 * validates and dereferences it, and builds an operation index.
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const SwaggerParser = require("@apidevtools/swagger-parser");

/**
 * Parse a raw string into an object, trying JSON first then YAML.
 * @param {string} raw
 * @returns {object}
 */
function parseRaw(raw) {
  const text = String(raw).trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    // fall through to YAML
  }
  return yaml.load(text);
}

/**
 * Resolve the raw spec document from a configured source.
 * @param {object} opts
 * @param {"inline"|"file"|"url"|"context"} opts.source
 * @param {string} [opts.inline]   raw inline JSON/YAML
 * @param {string} [opts.file]     absolute or cwd-relative file path
 * @param {string} [opts.url]      http(s) URL
 * @param {*}      [opts.contextValue] pre-resolved value from flow/global context
 * @returns {Promise<object>} raw (not yet dereferenced) spec object
 */
async function resolveRaw(opts) {
  switch (opts.source) {
    case "inline": {
      if (!opts.inline) throw new Error("inline spec is empty");
      return parseRaw(opts.inline);
    }
    case "file": {
      if (!opts.file) throw new Error("file path is empty");
      const abs = path.isAbsolute(opts.file)
        ? opts.file
        : path.join(process.cwd(), opts.file);
      const raw = fs.readFileSync(abs, "utf8");
      return parseRaw(raw);
    }
    case "url": {
      if (!opts.url) throw new Error("url is empty");
      // Node 18+ has global fetch
      const res = await fetch(opts.url);
      if (!res.ok) {
        throw new Error(`fetch ${opts.url} failed: HTTP ${res.status}`);
      }
      const raw = await res.text();
      return parseRaw(raw);
    }
    case "context": {
      if (opts.contextValue == null) throw new Error("context value is empty");
      return typeof opts.contextValue === "string"
        ? parseRaw(opts.contextValue)
        : opts.contextValue;
    }
    default:
      throw new Error(`unknown spec source: ${opts.source}`);
  }
}

/**
 * Build an index of operations keyed by operationId and by "METHOD path".
 * @param {object} api dereferenced spec
 * @returns {{operations: object[], byId: object, byRoute: object}}
 */
function indexOperations(api) {
  const HTTP_METHODS = [
    "get",
    "put",
    "post",
    "delete",
    "options",
    "head",
    "patch",
    "trace",
  ];
  const operations = [];
  const byId = {};
  const byRoute = {};

  const paths = api.paths || {};
  for (const rawPath of Object.keys(paths)) {
    const pathItem = paths[rawPath] || {};
    const pathLevelParams = pathItem.parameters || [];
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op) continue;
      const operationId =
        op.operationId || `${method.toUpperCase()} ${rawPath}`;
      const entry = {
        operationId,
        method,
        path: rawPath,
        summary: op.summary || "",
        // merge path-level and operation-level parameters (op wins on name+in)
        parameters: mergeParameters(pathLevelParams, op.parameters || []),
        requestBody: op.requestBody || null,
        responses: op.responses || {},
        security: op.security != null ? op.security : api.security || [],
        raw: op,
      };
      operations.push(entry);
      byId[operationId] = entry;
      byRoute[`${method.toUpperCase()} ${rawPath}`] = entry;
    }
  }
  return { operations, byId, byRoute };
}

function mergeParameters(pathLevel, opLevel) {
  const key = (p) => `${p.in}:${p.name}`;
  const map = new Map();
  for (const p of pathLevel) map.set(key(p), p);
  for (const p of opLevel) map.set(key(p), p);
  return Array.from(map.values());
}

/**
 * Determine a URL prefix from the first server entry (path portion only).
 * @param {object} api
 * @returns {string} e.g. "" or "/v1"
 */
function serverPrefix(api) {
  const servers = api.servers || [];
  if (!servers.length) return "";
  try {
    const u = servers[0].url;
    // url can be absolute or a path
    if (/^https?:\/\//i.test(u)) {
      return new URL(u).pathname.replace(/\/$/, "");
    }
    return String(u).replace(/\/$/, "");
  } catch (e) {
    return "";
  }
}

/**
 * Full load pipeline: resolve -> validate/dereference -> index.
 * Returns both the dereferenced ("api") and the original ("raw") documents.
 * @param {object} opts see resolveRaw
 * @returns {Promise<{api: object, raw: object, index: object, prefix: string}>}
 */
async function loadSpec(opts) {
  const rawDoc = await resolveRaw(opts);
  // Keep a clean copy of the raw doc for meta endpoints (bundled, refs intact).
  const rawCopy = JSON.parse(JSON.stringify(rawDoc));
  // validate() both validates and dereferences in place; use a copy so raw stays intact.
  const api = await SwaggerParser.validate(JSON.parse(JSON.stringify(rawDoc)));
  const index = indexOperations(api);
  return {
    api,
    raw: rawCopy,
    index,
    prefix: serverPrefix(api),
  };
}

module.exports = {
  parseRaw,
  resolveRaw,
  indexOperations,
  serverPrefix,
  loadSpec,
};

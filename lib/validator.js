"use strict";

/**
 * AJV-based request/response validation against dereferenced OpenAPI operations.
 *
 * Two AJV instances are used:
 *  - `coercing`  : for parameters, which arrive as strings from the transport
 *                  and must be coerced to their declared types.
 *  - `strict`    : for request/response bodies, validated as-is.
 *
 * OpenAPI 3.0's `nullable` keyword is unknown to JSON Schema; strict mode is
 * disabled so it is tolerated (see Roadmap for full nullable enforcement).
 */

const Ajv = require("ajv");
const addFormats = require("ajv-formats");

function makeAjv(coerceTypes) {
  const ajv = new Ajv({
    strict: false,
    allErrors: true,
    coerceTypes: coerceTypes ? "array" : false,
    useDefaults: true,
  });
  addFormats(ajv);
  // Tolerate OpenAPI-specific keywords rather than throwing.
  for (const kw of ["nullable", "example", "xml", "discriminator", "externalDocs"]) {
    if (!ajv.getKeyword(kw)) ajv.addKeyword(kw);
  }
  return ajv;
}

class OperationValidator {
  /**
   * @param {object} op indexed operation (see spec-loader.indexOperations)
   */
  constructor(op) {
    this.op = op;
    this._coercing = makeAjv(true);
    this._strict = makeAjv(false);
    this._buildParamValidators();
  }

  _buildParamValidators() {
    // Group parameters by location and build one object-schema per location.
    const locations = { path: {}, query: {}, header: {}, cookie: {} };
    const required = { path: [], query: [], header: [], cookie: [] };

    for (const p of this.op.parameters || []) {
      const loc = p.in;
      if (!locations[loc]) continue;
      // HTTP headers are case-insensitive and arrive lowercased from the
      // transport, so index header params by their lowercased name.
      const name = loc === "header" ? String(p.name).toLowerCase() : p.name;
      locations[loc][name] = p.schema || { type: "string" };
      if (p.required || loc === "path") required[loc].push(name);
    }

    this._paramValidators = {};
    for (const loc of Object.keys(locations)) {
      const schema = {
        type: "object",
        properties: locations[loc],
        required: required[loc],
        // headers/query may carry extras; don't reject unknown keys.
        additionalProperties: true,
      };
      this._paramValidators[loc] = this._coercing.compile(schema);
    }
  }

  /**
   * Pick the requestBody schema for a given content-type.
   * @param {string} contentType
   * @returns {{schema: object, required: boolean}|null}
   */
  _bodySchema(contentType) {
    const rb = this.op.requestBody;
    if (!rb || !rb.content) return null;
    const media =
      pickMedia(rb.content, contentType) || pickMedia(rb.content, "application/json");
    if (!media || !media.schema) return null;
    return { schema: media.schema, required: !!rb.required };
  }

  /**
   * Validate an incoming request.
   * Mutates `input.parameters.*` in place with coerced (typed) values.
   * @param {object} input
   * @param {object} input.parameters {path, query, header, cookie}
   * @param {*}      input.body
   * @param {string} input.contentType
   * @returns {{valid: boolean, errors: object[]}}
   */
  validateRequest(input) {
    const errors = [];
    const params = input.parameters || {};

    for (const loc of ["path", "query", "header", "cookie"]) {
      const data = params[loc] || {};
      const validate = this._paramValidators[loc];
      if (!validate(data)) {
        for (const e of validate.errors || []) {
          errors.push(formatError(e, `${loc} parameter`));
        }
      }
      params[loc] = data; // coerced in place
    }

    const bodyDef = this._bodySchema(input.contentType);
    if (bodyDef) {
      if (input.body == null || input.body === "") {
        if (bodyDef.required) {
          errors.push({ location: "body", message: "request body is required" });
        }
      } else {
        const validate = this._strict.compile(bodyDef.schema);
        if (!validate(input.body)) {
          for (const e of validate.errors || []) {
            errors.push(formatError(e, "body"));
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate an outgoing response body against the spec.
   * @param {number|string} status
   * @param {string} contentType
   * @param {*} body
   * @returns {{valid: boolean, errors: object[], matched: boolean}}
   *   matched=false when the spec has no schema for this status/content-type.
   */
  validateResponse(status, contentType, body) {
    const responses = this.op.responses || {};
    const respDef =
      responses[String(status)] ||
      responses[`${String(status)[0]}XX`] ||
      responses.default;
    if (!respDef || !respDef.content) return { valid: true, errors: [], matched: false };

    const media =
      pickMedia(respDef.content, contentType) ||
      pickMedia(respDef.content, "application/json");
    if (!media || !media.schema) return { valid: true, errors: [], matched: false };

    const validate = this._strict.compile(media.schema);
    if (!validate(body)) {
      return {
        valid: false,
        matched: true,
        errors: (validate.errors || []).map((e) => formatError(e, "response body")),
      };
    }
    return { valid: true, errors: [], matched: true };
  }
}

/**
 * Select a media-type object, tolerating parameters and wildcards.
 */
function pickMedia(content, contentType) {
  if (!content) return null;
  if (!contentType) return null;
  const base = String(contentType).split(";")[0].trim().toLowerCase();
  for (const key of Object.keys(content)) {
    const k = key.toLowerCase();
    if (k === base) return content[key];
  }
  // wildcard match e.g. application/*+json vs application/json
  for (const key of Object.keys(content)) {
    const k = key.toLowerCase();
    if (k.includes("*")) {
      const re = new RegExp("^" + k.replace(/[.+]/g, "\\$&").replace(/\*/g, ".*") + "$");
      if (re.test(base)) return content[key];
    }
  }
  return null;
}

function formatError(e, location) {
  return {
    location,
    path: e.instancePath || "",
    rule: e.keyword,
    message: e.message,
    params: e.params,
  };
}

module.exports = { OperationValidator, pickMedia };

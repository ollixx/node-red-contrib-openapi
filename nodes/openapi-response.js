"use strict";

const { OperationValidator } = require("../lib/validator");

module.exports = function (RED) {
  function OpenApiResponseNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.name = config.name;
    node.server = RED.nodes.getNode(config.server);
    node.validation = config.validation || "warn"; // "strict" | "warn" | "off"
    node.errorFormat = config.errorFormat || "problem"; // "problem" | "plain"
    node.defaultStatus = parseInt(config.defaultStatus, 10) || 200;
    node._validators = {};

    function status(fill, text) {
      node.status({ fill, shape: "dot", text });
    }

    function validatorFor(operationId) {
      if (!node.server || !node.server.spec) return null;
      if (node._validators[operationId]) return node._validators[operationId];
      const op = node.server.getOperation(operationId);
      if (!op) return null;
      const v = new OperationValidator(op);
      node._validators[operationId] = v;
      return v;
    }

    function buildErrorBody(statusCode, err) {
      const detail =
        typeof err === "string"
          ? err
          : (err && (err.message || err.detail || err.error)) || "error";
      if (node.errorFormat === "problem") {
        return {
          type: (err && err.type) || "about:blank",
          title: (err && err.title) || httpText(statusCode),
          status: statusCode,
          detail,
          ...(err && err.instance ? { instance: err.instance } : {}),
        };
      }
      return { error: httpText(statusCode), status: statusCode, detail };
    }

    node.on("input", function (msg, send, done) {
      send = send || node.send;
      done = done || function () {};
      const res = msg.res && (msg.res._res || msg.res);

      if (!res || typeof res.status !== "function") {
        node.warn("no response object on msg (msg.res missing)");
        return done();
      }
      if (res.headersSent) {
        node.warn("response already sent; ignoring");
        return done();
      }

      // Determine status + body, handling error-mapping.
      let statusCode;
      let body;
      let isError = false;
      if (msg.error) {
        isError = true;
        statusCode =
          msg.error.statusCode || msg.statusCode || (msg.error.status || 500);
        body = buildErrorBody(statusCode, msg.error);
      } else {
        statusCode = msg.statusCode || node.defaultStatus;
        body = msg.payload;
      }

      // Validate against the spec response schema — success AND error bodies
      // (P6). The error body (RFC 7807 / plain) is checked against the spec's
      // response schema for its status, under the same validation mode.
      const operationId = msg.openapi && msg.openapi.operationId;
      if (node.validation !== "off" && operationId) {
        const validator = validatorFor(operationId);
        if (validator) {
          const contentType =
            (msg.headers && (msg.headers["content-type"] || msg.headers["Content-Type"])) ||
            "application/json";
          const vr = validator.validateResponse(statusCode, contentType, body);
          if (vr.matched && !vr.valid) {
            if (node.validation === "strict") {
              node.error(
                { message: "response failed spec validation", errors: vr.errors },
                msg
              );
              status("red", "invalid response → 500");
              res.status(500).json(buildErrorBody(500, "response validation failed"));
              return done();
            }
            // warn
            node.warn(
              "response does not match spec: " +
                vr.errors.map((e) => `${e.path} ${e.message}`).join("; ")
            );
            status("yellow", "spec mismatch (sent)");
          }
        }
      }

      // Apply any custom headers from the flow.
      if (msg.headers && typeof msg.headers === "object") {
        for (const [k, v] of Object.entries(msg.headers)) res.set(k, v);
      }

      try {
        if (body === undefined || body === null) {
          res.status(statusCode).end();
        } else if (typeof body === "object" && !Buffer.isBuffer(body)) {
          res.status(statusCode).json(body);
        } else {
          res.status(statusCode).send(body);
        }
        if (!isError) status("green", String(statusCode));
        else status("yellow", String(statusCode));
      } catch (err) {
        node.error(`failed to send response: ${err.message}`, msg);
      }
      done();
    });
  }

  function httpText(code) {
    const map = {
      200: "OK", 201: "Created", 204: "No Content", 400: "Bad Request",
      401: "Unauthorized", 403: "Forbidden", 404: "Not Found",
      409: "Conflict", 422: "Unprocessable Entity", 500: "Internal Server Error",
    };
    return map[code] || "Error";
  }

  RED.nodes.registerType("openapi-response", OpenApiResponseNode);
};

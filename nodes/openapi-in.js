"use strict";

const { OperationValidator } = require("../lib/validator");
const {
  toExpressPath,
  joinPath,
  registerRoute,
  removeRoute,
} = require("../lib/routing");

/**
 * Minimal body parser: buffers the request stream and parses JSON, urlencoded
 * or text based on Content-Type. Skips if the body was already parsed upstream.
 */
function bodyParser(req, res, next) {
  if (req.body !== undefined) return next();
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const buf = Buffer.concat(chunks);
    req.rawBody = buf;
    const ct = (req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    if (!buf.length) {
      req.body = undefined;
    } else if (ct === "application/json" || ct.endsWith("+json")) {
      try {
        req.body = JSON.parse(buf.toString("utf8"));
      } catch (e) {
        req._bodyParseError = e;
        req.body = buf.toString("utf8");
      }
    } else if (ct === "application/x-www-form-urlencoded") {
      req.body = Object.fromEntries(new URLSearchParams(buf.toString("utf8")));
    } else {
      req.body = buf.toString("utf8");
    }
    next();
  });
  req.on("error", next);
}

module.exports = function (RED) {
  function OpenApiInNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.name = config.name;
    node.operationId = config.operation;
    node.onError = config.onError || "respond"; // "respond" | "output"
    node.configNode = RED.nodes.getNode(config.server);

    node._route = null; // { method, path }
    node._validator = null;

    function status(fill, text) {
      node.status({ fill, shape: "dot", text });
    }

    function setup() {
      teardown();
      const cfgNode = node.configNode;
      if (!cfgNode || !cfgNode.spec) {
        status("grey", "waiting for spec");
        return;
      }
      const op = cfgNode.getOperation(node.operationId);
      if (!op) {
        status("red", `unknown operation: ${node.operationId}`);
        node.error(`operation "${node.operationId}" not found in spec`);
        return;
      }
      node._op = op;
      node._validator = new OperationValidator(op);

      const prefix = cfgNode.getPrefix();
      const exprPath = joinPath(prefix, toExpressPath(op.path));
      try {
        registerRoute(RED, op.method, exprPath, [bodyParser, handler]);
        node._route = { method: op.method, path: exprPath };
        status("green", `${op.method.toUpperCase()} ${exprPath}`);
      } catch (err) {
        status("red", err.message);
        node.error(`failed to register route: ${err.message}`);
      }
    }

    function teardown() {
      if (node._route) {
        removeRoute(RED, node._route.method, node._route.path);
        node._route = null;
      }
    }

    function handler(req, res) {
      const cfgNode = node.configNode;
      const op = node._op;

      // ---- Authentication ----
      let authResult = { ok: true, auth: { scheme: null, token: null, claims: null, scopes: [], principal: null } };
      const authNode = cfgNode.getAuthNode && cfgNode.getAuthNode();
      if (authNode && typeof authNode.authenticate === "function") {
        authResult = authNode.authenticate(op.security, cfgNode.getSecuritySchemes(), req);
      }
      if (!authResult.ok) {
        return fail(req, res, authResult.status || 401, "auth", [
          { location: "auth", message: authResult.error || "unauthorized" },
        ]);
      }

      // ---- Request validation ----
      const parameters = {
        path: { ...(req.params || {}) },
        query: { ...(req.query || {}) },
        header: { ...(req.headers || {}) },
        cookie: { ...(req.cookies || {}) },
      };
      const contentType = req.headers["content-type"] || "";
      const result = node._validator.validateRequest({
        parameters,
        body: req.body,
        contentType,
      });

      if (!result.valid) {
        return fail(req, res, 400, "validation", result.errors);
      }

      // ---- Build the clean message ----
      const msg = {
        payload: req.body !== undefined ? req.body : parameters,
        parameters,
        auth: authResult.auth,
        openapi: {
          operationId: op.operationId,
          method: op.method.toUpperCase(),
          path: op.path,
          statusCodes: Object.keys(op.responses || {}),
        },
        req,
        res,
      };
      node.send([msg, null]);
    }

    function fail(req, res, statusCode, kind, errors) {
      status("yellow", `${kind} ${statusCode}`);
      if (node.onError === "output") {
        // Hand off to the flow via the second output for custom handling.
        node.send([
          null,
          {
            statusCode,
            payload: { error: kind, details: errors },
            errors,
            req,
            res,
            openapi: { operationId: node.operationId },
          },
        ]);
      } else {
        res.status(statusCode).json({ error: kind, details: errors });
      }
    }

    // React to (re)loads of the spec.
    if (node.configNode) {
      node.configNode.on("spec-ready", setup);
      node.configNode.on("spec-error", () => status("red", "spec error"));
      // If the spec is already loaded, set up now.
      if (node.configNode.spec) setup();
      else status("grey", "waiting for spec");
    } else {
      status("red", "no spec configured");
    }

    node.on("close", function (done) {
      teardown();
      if (node.configNode) {
        node.configNode.removeListener("spec-ready", setup);
      }
      done();
    });
  }

  RED.nodes.registerType("openapi-in", OpenApiInNode);
};

"use strict";

const { loadSpec } = require("../lib/spec-loader");
const { registerMeta, unregisterMeta } = require("../lib/meta");
const { authenticate } = require("../lib/auth");

module.exports = function (RED) {
  function OpenApiConfigNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.name = config.name;
    node.source = config.source || "inline";
    node.inline = config.inline || "";
    node.file = config.file || "";
    node.url = config.url || "";
    node.contextKey = config.contextKey || "";
    node.contextStore = config.contextStore || "";

    // Authentication is configured here, not in a separate node (ADR 0001).
    // "enforce": validate credentials against the config below; "extract": only
    // pull the token out and let the flow decide. Secrets live in credentials.
    node.authMode = config.authMode || "enforce";
    const creds = node.credentials || {};
    node.authCfg = {
      mode: node.authMode,
      apiKeys: parseList(creds.apiKeys),
      basicUsers: parseUserMap(creds.basicUsers),
    };

    node.meta = {
      json: config.metaJson !== false,
      yaml: config.metaYaml !== false,
      docs: config.metaDocs !== false,
    };

    // Runtime state shared with dependent nodes.
    node.spec = null; // { api, raw, index, prefix }
    node.ready = false;
    node.loadError = null;
    node._metaRoutes = [];

    function resolveContextValue() {
      if (node.source !== "context" || !node.contextKey) return undefined;
      const ctx = node.context();
      const store = node.contextStore || undefined;
      // support "flow." / "global." prefixes
      if (node.contextKey.startsWith("global.")) {
        return ctx.global.get(node.contextKey.slice(7), store);
      }
      if (node.contextKey.startsWith("flow.")) {
        return ctx.flow.get(node.contextKey.slice(5), store);
      }
      return ctx.flow.get(node.contextKey, store);
    }

    node.load = async function () {
      node.ready = false;
      node.loadError = null;
      try {
        const spec = await loadSpec({
          source: node.source,
          inline: node.inline,
          file: node.file,
          url: node.url,
          contextValue: resolveContextValue(),
        });
        node.spec = spec;
        node.ready = true;
        // (Re)register meta endpoints.
        unregisterMeta(RED, node._metaRoutes);
        const metaResult = registerMeta(RED, {
          raw: spec.raw,
          prefix: spec.prefix,
          enable: node.meta,
        });
        node._metaRoutes = metaResult.routes;
        for (const w of metaResult.warnings || []) node.warn(w);
        node.emit("spec-ready", spec);
        node.log(
          `OpenAPI loaded: ${spec.index.operations.length} operations, prefix "${spec.prefix || "/"}"`
        );
      } catch (err) {
        node.loadError = err;
        node.error(`Failed to load OpenAPI spec: ${err.message}`);
        node.emit("spec-error", err);
      }
      return node.ready;
    };

    // Accessors used by dependent nodes.
    node.getOperation = function (operationId) {
      if (!node.spec) return null;
      return (
        node.spec.index.byId[operationId] ||
        node.spec.index.byRoute[operationId] ||
        null
      );
    };
    node.getPrefix = function () {
      return node.spec ? node.spec.prefix : "";
    };
    node.getSecuritySchemes = function () {
      return node.spec && node.spec.api.components
        ? node.spec.api.components.securitySchemes || {}
        : {};
    };
    // Run authentication for a request against this spec's securitySchemes and
    // the operation's security requirement, using the auth config above.
    node.authenticate = function (security, schemes, req) {
      return authenticate(security, schemes, req, node.authCfg);
    };

    node.on("close", function (done) {
      unregisterMeta(RED, node._metaRoutes);
      node._metaRoutes = [];
      done();
    });

    // Load on startup (deferred so the runtime HTTP server is ready).
    setTimeout(() => node.load(), 0);
  }

  function parseList(raw) {
    if (!raw) return [];
    return String(raw)
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function parseUserMap(raw) {
    const map = {};
    if (!raw) return map;
    for (const line of String(raw).split(/\n/)) {
      const t = line.trim();
      if (!t) continue;
      const idx = t.indexOf(":");
      if (idx < 0) continue;
      map[t.slice(0, idx)] = t.slice(idx + 1);
    }
    return map;
  }

  RED.nodes.registerType("openapi-config", OpenApiConfigNode, {
    credentials: {
      apiKeys: { type: "text" },
      basicUsers: { type: "text" },
    },
  });

  // ---- Admin endpoint: operation list for the editor dropdown ----
  RED.httpAdmin.get(
    "/openapi-config/:id/operations",
    RED.auth.needsPermission("flows.read"),
    function (req, res) {
      const node = RED.nodes.getNode(req.params.id);
      if (!node || !node.spec) {
        return res.json({ ready: false, operations: [] });
      }
      const ops = node.spec.index.operations.map((o) => ({
        operationId: o.operationId,
        method: o.method.toUpperCase(),
        path: o.path,
        summary: o.summary,
      }));
      res.json({ ready: true, prefix: node.spec.prefix, operations: ops });
    }
  );
};

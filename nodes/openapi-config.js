"use strict";

const { loadSpec } = require("../lib/spec-loader");
const { registerMeta, unregisterMeta } = require("../lib/meta");

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
    node.authNode = config.auth ? RED.nodes.getNode(config.auth) : null;
    node.authConfigId = config.auth || null;

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
        node._metaRoutes = registerMeta(RED, {
          raw: spec.raw,
          prefix: spec.prefix,
          enable: node.meta,
        }).routes;
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
    node.getAuthNode = function () {
      if (node.authNode) return node.authNode;
      if (node.authConfigId) node.authNode = RED.nodes.getNode(node.authConfigId);
      return node.authNode;
    };

    node.on("close", function (done) {
      unregisterMeta(RED, node._metaRoutes);
      node._metaRoutes = [];
      done();
    });

    // Load on startup (deferred so the runtime HTTP server is ready).
    setTimeout(() => node.load(), 0);
  }

  RED.nodes.registerType("openapi-config", OpenApiConfigNode);

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

"use strict";

const { authenticate } = require("../lib/auth");

module.exports = function (RED) {
  function OpenApiAuthNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.name = config.name;
    // "enforce": validate credentials here; "extract": only pull the token out.
    node.mode = config.mode || "enforce";

    // Secrets live in credentials, never in the exported flow.
    const creds = node.credentials || {};
    node.apiKeys = parseList(creds.apiKeys);
    node.basicUsers = parseUserMap(creds.basicUsers);

    node.cfg = {
      mode: node.mode,
      apiKeys: node.apiKeys,
      basicUsers: node.basicUsers,
    };

    /**
     * Run authentication for a request.
     * @param {Array} security operation security requirements
     * @param {object} schemes components.securitySchemes
     * @param {object} req express request
     * @returns {{ok, status?, auth, error?}}
     */
    node.authenticate = function (security, schemes, req) {
      return authenticate(security, schemes, req, node.cfg);
    };
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

  RED.nodes.registerType("openapi-auth", OpenApiAuthNode, {
    credentials: {
      apiKeys: { type: "text" },
      basicUsers: { type: "text" },
    },
  });
};

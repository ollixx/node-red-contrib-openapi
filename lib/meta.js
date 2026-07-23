"use strict";

/**
 * Registers the standard meta endpoints for a spec: the raw JSON/YAML
 * document and a Swagger-UI docs page. Each can be toggled off individually.
 */

const yaml = require("js-yaml");
const { joinPath, registerRoute, removeRoute, routeExists } = require("./routing");

function docsHtml(specUrl, title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)} — API docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"/>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({ url: ${JSON.stringify(specUrl)}, dom_id: "#swagger-ui" });
  </script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/**
 * @param {object} RED
 * @param {object} opts
 * @param {object} opts.raw        raw spec document
 * @param {string} opts.prefix     url prefix
 * @param {object} opts.enable     { json, yaml, docs } booleans
 * @returns {{routes: Array<{method: string, path: string}>}}
 */
function registerMeta(RED, opts) {
  const prefix = opts.prefix || "";
  const enable = opts.enable || { json: true, yaml: true, docs: true };
  const title = (opts.raw && opts.raw.info && opts.raw.info.title) || "OpenAPI";
  const routes = [];
  const warnings = [];

  const jsonPath = joinPath(prefix, "openapi.json");
  const yamlPath = joinPath(prefix, "openapi.yaml");
  const docsPath = joinPath(prefix, "docs");

  // Skip (and report) a meta route that is already registered — otherwise two
  // openapi-config nodes sharing a prefix would double-register the same paths.
  function add(path, handler) {
    if (routeExists(RED, "get", path)) {
      warnings.push(
        `meta route GET ${path} already registered — skipped (prefix collision between two openapi-config nodes?)`
      );
      return;
    }
    registerRoute(RED, "get", path, [handler]);
    routes.push({ method: "get", path });
  }

  if (enable.json !== false) {
    add(jsonPath, (req, res) => res.type("application/json").send(JSON.stringify(opts.raw)));
  }
  if (enable.yaml !== false) {
    add(yamlPath, (req, res) => res.type("text/yaml").send(yaml.dump(opts.raw)));
  }
  if (enable.docs !== false) {
    const html = docsHtml(jsonPath, title);
    add(docsPath, (req, res) => res.type("html").send(html));
  }
  return { routes, warnings };
}

function unregisterMeta(RED, routes) {
  for (const r of routes || []) removeRoute(RED, r.method, r.path);
}

module.exports = { registerMeta, unregisterMeta, docsHtml };

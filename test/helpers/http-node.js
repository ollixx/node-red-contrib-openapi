"use strict";

/**
 * Reach the httpNode Express app in node-red-node-test-helper.
 *
 * The helper serves the **admin** app via `helper.request()` (that targets
 * `helper._httpAdmin`), but it does NOT serve the **httpNode** app that
 * `openapi-*` nodes register their operation + meta routes on. Those routes land
 * on the mock runtime's `nodeApp`, which the helper never mounts on a server — so
 * `helper.request().get("/api/v1/openapi.json")` always 404s.
 *
 * The one supported handle to that app is the registry's `createNodeApi()`, which
 * maps `httpNode -> runtime.nodeApp` (see @node-red/registry util.js). We grab it
 * and let supertest drive the app object directly. This is the single place that
 * depends on the helper internal `_registryUtil`; keep the coupling here.
 *
 * Usage (AFTER `helper.load(...)`, since routes register during load):
 *   const { httpNodeRequest } = require("./helpers/http-node");
 *   httpNodeRequest().get("/api/v1/openapi.json").expect(200)
 */

const request = require("supertest");
const helper = require("node-red-node-test-helper");

function httpNodeApp() {
  if (!helper._registryUtil || typeof helper._registryUtil.createNodeApi !== "function") {
    throw new Error(
      "cannot reach httpNode app: node-red-node-test-helper._registryUtil is unavailable " +
        "(call helper.init()/startServer()/load() first, or the helper version changed)"
    );
  }
  return helper._registryUtil.createNodeApi({}).httpNode;
}

function httpNodeRequest() {
  return request(httpNodeApp());
}

module.exports = { httpNodeApp, httpNodeRequest };

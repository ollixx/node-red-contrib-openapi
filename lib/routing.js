"use strict";

/**
 * Helpers for registering and cleanly removing routes on Node-RED's
 * user-facing Express app (RED.httpNode).
 */

/**
 * Convert an OpenAPI path template to an Express route.
 *   /pet/{petId}/uploadImage  ->  /pet/:petId/uploadImage
 * @param {string} openApiPath
 * @returns {string}
 */
function toExpressPath(openApiPath) {
  return String(openApiPath).replace(/\{([^/}]+)\}/g, ":$1");
}

/**
 * Join a prefix and a path, collapsing duplicate slashes.
 */
function joinPath(prefix, p) {
  const joined = `${prefix || ""}/${p || ""}`.replace(/\/{2,}/g, "/");
  return joined.length > 1 ? joined.replace(/\/$/, "") : joined;
}

/**
 * Register a route on RED.httpNode.
 * @param {object} RED
 * @param {string} method lowercase http method
 * @param {string} path express path
 * @param {Function[]} handlers middleware + handler
 */
function registerRoute(RED, method, path, handlers) {
  const m = method.toLowerCase();
  if (typeof RED.httpNode[m] !== "function") {
    throw new Error(`unsupported HTTP method: ${method}`);
  }
  RED.httpNode[m](path, ...handlers);
}

/**
 * Locate the Express router stack across major versions.
 * Express 4 exposes it as `app._router`; Express 5 as `app.router` (and reading
 * `.router` on Express 4 can throw, so only fall back to it when `_router` is
 * absent, and guard the access).
 * @param {object} RED
 * @returns {object|null} the router (with a `.stack`) or null
 */
function getRouter(RED) {
  const app = RED && RED.httpNode;
  if (!app) return null;
  if (app._router) return app._router;
  try {
    return app.router || null;
  } catch (e) {
    return null;
  }
}

/**
 * Remove a previously registered route from the Express router stack.
 * Safe to call multiple times.
 * @param {object} RED
 * @param {string} method lowercase http method
 * @param {string} path express path
 */
function removeRoute(RED, method, path) {
  const m = method.toLowerCase();
  const router = getRouter(RED);
  if (!router || !router.stack) return;
  const stack = router.stack;
  for (let i = stack.length - 1; i >= 0; i--) {
    const layer = stack[i];
    const route = layer && layer.route;
    if (route && route.path === path && route.methods && route.methods[m]) {
      stack.splice(i, 1);
    }
  }
}

module.exports = { toExpressPath, joinPath, registerRoute, removeRoute };

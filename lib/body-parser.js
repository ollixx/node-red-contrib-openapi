"use strict";

/**
 * Fallback request-body parser for openapi-in.
 *
 * Node-RED installs its own body parser on the HTTP-node routes, which runs
 * BEFORE this node (see ADR 0003). So for the content-types Node-RED parses
 * (JSON, +json, urlencoded, text) `req.body` is already set and this parser is
 * a no-op. It only runs for bodies Node-RED did NOT parse — and even then it is
 * bounded by a **fixed internal cap** (defense-in-depth), not a configurable
 * field: the authoritative request body-size limit is Node-RED's own
 * (`apiMaxLength` in settings.js / `httpNodeMiddleware`).
 */

// Fixed cap for the fallback path. Not user-configurable (ADR 0003).
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024; // 1 MB

/**
 * Build the fallback body parser. Buffers the request stream (up to `maxBytes`)
 * and parses JSON / urlencoded / text by Content-Type; skips entirely when the
 * body was already parsed upstream. A body exceeding `maxBytes` is rejected 413.
 * @param {number} maxBytes 0/falsy disables the cap
 */
function makeBodyParser(maxBytes) {
  return function bodyParser(req, res, next) {
    if (req.body !== undefined) return next();
    const chunks = [];
    let size = 0;
    let aborted = false;
    req.on("data", (c) => {
      if (aborted) return;
      size += c.length;
      if (maxBytes && size > maxBytes) {
        aborted = true;
        res.status(413).json({ error: "payload too large", limit: maxBytes });
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (aborted) return;
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
    req.on("error", (err) => {
      if (!aborted) next(err);
    });
  };
}

module.exports = { makeBodyParser, DEFAULT_MAX_BODY_BYTES };

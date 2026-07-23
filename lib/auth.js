"use strict";

/**
 * Authentication handling driven by the spec's components.securitySchemes
 * and each operation's `security` requirements.
 *
 * A requirement list is an OR of requirement objects; each object is an AND
 * of scheme -> required-scopes entries. Auth passes if ANY requirement object
 * is fully satisfied.
 *
 * MVP scope: apiKey (header/query/cookie), http basic, http bearer (extract;
 * optional shared-secret allow-list). Full JWT/OAuth2 verification is Roadmap.
 */

/**
 * Extract the raw credential for a single scheme from an Express request.
 * @returns {{present: boolean, token: string|null, principal: string|null}}
 */
function extractCredential(scheme, req) {
  if (!scheme) return { present: false, token: null, principal: null };
  switch (scheme.type) {
    case "apiKey": {
      let val = null;
      if (scheme.in === "header") val = req.headers[String(scheme.name).toLowerCase()];
      else if (scheme.in === "query") val = req.query ? req.query[scheme.name] : undefined;
      else if (scheme.in === "cookie") val = req.cookies ? req.cookies[scheme.name] : undefined;
      return { present: val != null, token: val != null ? String(val) : null, principal: null };
    }
    case "http": {
      const h = req.headers.authorization || "";
      const [type, rest] = h.split(/\s+/, 2);
      if ((scheme.scheme || "").toLowerCase() === "basic") {
        if (!/^basic$/i.test(type) || !rest) return { present: false, token: null, principal: null };
        const decoded = Buffer.from(rest, "base64").toString("utf8");
        const idx = decoded.indexOf(":");
        const user = idx >= 0 ? decoded.slice(0, idx) : decoded;
        const pass = idx >= 0 ? decoded.slice(idx + 1) : "";
        return { present: true, token: `${user}:${pass}`, principal: user };
      }
      // bearer (and other http schemes)
      if (!/^bearer$/i.test(type) || !rest) return { present: false, token: null, principal: null };
      return { present: true, token: rest, principal: null };
    }
    case "oauth2":
    case "openIdConnect": {
      const h = req.headers.authorization || "";
      const [type, rest] = h.split(/\s+/, 2);
      if (!/^bearer$/i.test(type) || !rest) return { present: false, token: null, principal: null };
      return { present: true, token: rest, principal: null };
    }
    default:
      return { present: false, token: null, principal: null };
  }
}

/**
 * Optional enforcement for a scheme, based on node config.
 * @param {object} scheme
 * @param {object} cred extracted credential
 * @param {object} cfg  { mode, apiKeys?, basicUsers?, allowBearer? }
 * @returns {boolean}
 */
function enforceScheme(scheme, cred, cfg) {
  if (!cred.present) return false;
  if (cfg.mode === "extract") return true; // extraction only; flow decides

  switch (scheme.type) {
    case "apiKey":
      if (Array.isArray(cfg.apiKeys) && cfg.apiKeys.length) {
        return cfg.apiKeys.includes(cred.token);
      }
      return true; // no allow-list configured -> presence is enough
    case "http":
      if ((scheme.scheme || "").toLowerCase() === "basic") {
        if (cfg.basicUsers && Object.keys(cfg.basicUsers).length) {
          const [user, ...rest] = cred.token.split(":");
          return cfg.basicUsers[user] === rest.join(":");
        }
        return true;
      }
      return true; // bearer: presence accepted at MVP (verification -> Roadmap)
    default:
      return true;
  }
}

/**
 * Evaluate the operation's security against a request.
 * @param {Array} security operation security requirements
 * @param {object} schemes components.securitySchemes
 * @param {object} req express request
 * @param {object} cfg node config
 * @returns {{ok: boolean, status?: number, auth: object, error?: string}}
 */
function authenticate(security, schemes, req, cfg) {
  // No security -> open endpoint.
  if (!security || !security.length) {
    return { ok: true, auth: { scheme: null, token: null, claims: null, scopes: [], principal: null, schemes: [] } };
  }
  schemes = schemes || {};
  cfg = cfg || { mode: "enforce" };

  let anyPresent = false;
  for (const requirement of security) {
    const schemeNames = Object.keys(requirement);
    let satisfied = true;
    const matched = [];
    for (const name of schemeNames) {
      const scheme = schemes[name];
      const cred = extractCredential(scheme, req);
      if (cred.present) anyPresent = true;
      if (!enforceScheme(scheme, cred, cfg)) {
        satisfied = false;
        break;
      }
      matched.push({
        scheme: name,
        type: scheme ? scheme.type : null,
        token: cred.token,
        claims: null,
        scopes: requirement[name] || [],
        principal: cred.principal,
      });
    }
    if (satisfied && matched.length) {
      // A requirement object is an AND of schemes. Report the first as the
      // primary auth (stable/deterministic) and expose every satisfied scheme
      // in `schemes`, so a multi-scheme (AND) requirement does not silently
      // drop all but the last.
      return { ok: true, auth: { ...matched[0], schemes: matched } };
    }
  }

  return {
    ok: false,
    status: anyPresent ? 403 : 401,
    error: anyPresent ? "credentials rejected" : "authentication required",
    auth: { scheme: null, token: null, claims: null, scopes: [], principal: null, schemes: [] },
  };
}

module.exports = { extractCredential, enforceScheme, authenticate };

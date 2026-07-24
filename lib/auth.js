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
 * Whether a scheme carries a bearer token (http bearer, oauth2, openIdConnect).
 */
function isBearerScheme(scheme) {
  if (!scheme) return false;
  if (scheme.type === "oauth2" || scheme.type === "openIdConnect") return true;
  return scheme.type === "http" && String(scheme.scheme || "").toLowerCase() === "bearer";
}

/**
 * Extract the granted scopes from verified JWT claims — the OAuth2 `scope`
 * (space-separated string) or `scp` (string or array) claim.
 */
function tokenScopes(claims) {
  if (!claims) return [];
  const s = claims.scope != null ? claims.scope : claims.scp;
  if (Array.isArray(s)) return s;
  if (typeof s === "string") return s.split(/\s+/).filter(Boolean);
  return [];
}

/**
 * Decide whether a single scheme is satisfied, and produce any verified claims.
 * For a bearer scheme in enforce mode with a configured `cfg.verifyBearer`, the
 * token is cryptographically verified (signature + expiry); otherwise falls back
 * to the presence/allow-list logic in enforceScheme.
 * @returns {{ok: boolean, claims: object|null}}
 */
function verifyScheme(scheme, cred, cfg) {
  if (
    cred.present &&
    cfg &&
    cfg.mode !== "extract" &&
    isBearerScheme(scheme) &&
    typeof cfg.verifyBearer === "function"
  ) {
    const r = cfg.verifyBearer(cred.token, scheme) || {};
    // A present-but-unverifiable bearer token is an authentication failure
    // (RFC 6750 invalid_token → 401), not an authorization failure (403).
    return { ok: !!r.ok, claims: r.claims || null, invalidToken: !r.ok };
  }
  return { ok: enforceScheme(scheme, cred, cfg), claims: null };
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
  let invalidToken = false;
  let insufficientScope = false;
  for (const requirement of security) {
    const schemeNames = Object.keys(requirement);
    let satisfied = true;
    const matched = [];
    for (const name of schemeNames) {
      const scheme = schemes[name];
      const cred = extractCredential(scheme, req);
      if (cred.present) anyPresent = true;
      const ver = verifyScheme(scheme, cred, cfg);
      if (!ver.ok) {
        if (ver.invalidToken) invalidToken = true;
        satisfied = false;
        break;
      }
      // Per-operation scope enforcement (P8): for a verified token, the effective
      // scopes are what the token carries; the operation's required scopes
      // (requirement[name]) must all be present, else it's authenticated-but-not-
      // authorized (403). Only enforced when we have verified claims.
      const requiredScopes = requirement[name] || [];
      const effectiveScopes = ver.claims ? tokenScopes(ver.claims) : requiredScopes;
      if (ver.claims && requiredScopes.length) {
        const have = new Set(effectiveScopes);
        if (!requiredScopes.every((s) => have.has(s))) {
          insufficientScope = true;
          satisfied = false;
          break;
        }
      }
      matched.push({
        scheme: name,
        type: scheme ? scheme.type : null,
        token: cred.token,
        claims: ver.claims,
        scopes: effectiveScopes,
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
    status: invalidToken ? 401 : insufficientScope || anyPresent ? 403 : 401,
    error: invalidToken
      ? "invalid token"
      : insufficientScope
      ? "insufficient scope"
      : anyPresent
      ? "credentials rejected"
      : "authentication required",
    auth: { scheme: null, token: null, claims: null, scopes: [], principal: null, schemes: [] },
  };
}

module.exports = { extractCredential, enforceScheme, authenticate };

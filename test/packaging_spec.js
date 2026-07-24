"use strict";

// The published npm tarball must ship only runtime artefacts — no test/, agent-OS
// (.ai/), docs, scripts, or editor config. Driven off `npm pack --dry-run --json`.
const assert = require("assert");
const { execSync } = require("child_process");
const path = require("path");

describe("packaging (npm pack contents)", function () {
  this.timeout(30000);
  let files;

  before(function () {
    const root = path.join(__dirname, "..");
    const out = execSync("npm pack --dry-run --json", { cwd: root, encoding: "utf8" });
    const json = out.slice(out.indexOf("[")); // skip any leading npm notices
    files = JSON.parse(json)[0].files.map((f) => f.path.replace(/\\/g, "/"));
  });

  it("ships the runtime artefacts (nodes/, lib/, package.json)", function () {
    assert.ok(files.some((p) => p.startsWith("nodes/")), "nodes/ must be included");
    assert.ok(files.some((p) => p.startsWith("lib/")), "lib/ must be included");
    assert.ok(files.includes("package.json"), "package.json must be included");
  });

  it("excludes dev artefacts (test/, .ai/, docs/, scripts/, .claude/, .node-red*)", function () {
    const leaked = files.filter((p) => /^(test|\.ai|docs|scripts|\.claude|\.node-red)/.test(p));
    assert.deepStrictEqual(leaked, [], "no dev files may be in the tarball; leaked: " + leaked.join(", "));
  });
});

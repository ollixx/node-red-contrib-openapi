---
id: P3
title: "Publishing-Hygiene: package.json files-Whitelist, nur Runtime-Artefakte im npm-Tarball"
epic: foundation
findings:
  - "package.json hat kein `files`-Feld und es gibt keine `.npmignore` — beim npm-Publish landen Dev-Artefakte (test/, .ai/, docs/, .claude/, scripts/, examples-Fixtures) mit im Tarball."
acceptance:
  - "package.json enthält ein `files`-Feld, das genau die Runtime-Artefakte whitelistet: nodes/, lib/, examples/, README.md, LICENSE (und keine Dev-Verzeichnisse)."
  - "`npm pack --dry-run` listet KEINE der Dateien aus test/, .ai/, docs/, scripts/, .claude/, .node-red* — geprüft durch einen Test, der die Tarball-Fileliste inspiziert und auf diese Verzeichnisse assertet."
  - "Die Nodes laden nach einem simulierten Install weiterhin (nodes/ + lib/ + package.json node-red-Sektion sind vollständig enthalten)."
verify: unit
dependencies: []
status: in_progress
---

# P3 — Publishing-Hygiene

Motiviert durch [ADR 0002](../../adr/0002-post-mvp-feature-roadmap.md) (Review-Fund P3.9).

Ein publiziertes node-red-Contrib-Paket soll nur Laufzeit-Artefakte ausliefern. Aktuell
fehlt jede Steuerung, sodass `npm publish` das gesamte Repo (inkl. `.ai/`-Agent-OS,
`docs/`, `test/`) verschickt.

**Umsetzung:** `files`-Whitelist in `package.json` (`nodes/`, `lib/`, `examples/`,
`README.md`, `LICENSE`). Ein Test ruft `npm pack --dry-run --json` auf und assertet,
dass keine Datei aus `test/`, `.ai/`, `docs/`, `scripts/`, `.claude/` im Tarball ist und
dass `nodes/` + `lib/` vollständig enthalten sind. (Eine `LICENSE`-Datei ggf. anlegen,
falls nicht vorhanden — `package.json` deklariert MIT.)

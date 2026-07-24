---
id: P16
title: "0.9.0 auf npm veröffentlichen + in der Node-RED Flow Library listen"
epic: aspects/release
findings:
  - "Owner-Wunsch: das Projekt in der Node-RED-Community veröffentlichen. 0.9.0 ist auf GitHub (Tag v0.9.0), aber noch nicht auf npm — damit Nutzer es über den Node-RED Palette-Manager finden/installieren können, muss es auf npm publiziert und in der Flow Library (flows.nodered.org) gelistet sein."
acceptance:
  - "`npm publish` für 0.9.0 ausgeführt (Owner-Aktion — npm-Login/2FA). Vorher `npm publish --dry-run` zur Kontrolle: 19 Dateien, nur Runtime-Artefakte (nodes/lib/examples/README/LICENSE/CHANGELOG), keine test/.ai/docs/scripts."
  - "Das Paket erscheint in der Node-RED Flow Library (https://flows.nodered.org) — wird automatisch über das `node-red`-keyword in package.json indexiert (i.d.R. innerhalb ~24h); falls nicht, manuell über 'add a node' hinzufügen."
  - "In Node-RED unter 'Manage palette → Install' nach `node-red-contrib-openapi` such- und installierbar."
dependencies: []
status: pending
---

# P16 — Publish to npm + Node-RED flow library

**Note (Owner-Wunsch):** das Projekt in der Node-RED-Community veröffentlichen.

`npm publish` braucht den npm-Login/2FA des Owners — daher als Reminder-Paket geführt,
nicht als Agent-Aktion. Der Flow-Library-Eintrag folgt automatisch aus dem npm-Publish
(das `node-red`-keyword ist in package.json gesetzt); ein manuelles Eintragen ist nur
nötig, falls die Auto-Indexierung ausbleibt.

Publish-Ablauf:
```bash
npm publish --dry-run   # Kontrolle: exakt die 19 Runtime-Dateien
npm publish             # Owner: npm-Login + ggf. 2FA
```

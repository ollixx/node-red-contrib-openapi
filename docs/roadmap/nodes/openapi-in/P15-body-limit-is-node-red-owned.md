---
id: P15
node: openapi-in
title: "maxBodyBytes-Feld entfernen; Body-Size-Limit ist Node-RED-Sache (ADR 0003)"
epic: nodes/openapi-in
findings:
  - "Das in P1.3 eingeführte maxBodyBytes-Feld greift unter echtem Node-RED kaum: Node-RED parst den Request-Body auf den httpNode-Routen VOR openapi-in (beobachtet beim task-manager-Beispiel: der 400 kam aus node-red/.../body-parser mit raw-body-Stack auf /api/v1/tasks)."
  - "Für die von Node-RED geparsten Content-Types (JSON, +json, urlencoded, text) ist req.body bereits gesetzt → unser bodyParser überspringt → maxBodyBytes wird nie erzwungen. Ein malformed Body liefert zudem Node-REDs 400 VOR unserer Auth."
  - "Das Feld vermittelt damit falsche Sicherheit: gesetzt, aber im Regelfall wirkungslos."
acceptance:
  - "Das maxBodyBytes-Editor-Feld ist aus openapi-in entfernt (nodes/openapi-in.html defaults + Feld; nodes/openapi-in.js config-Read) — kein Nutzer-Feld mehr, das still umgangen wird."
  - "Der Fallback-Stream-Parser läuft weiterhin nur, wenn req.body undefined ist (Content-Types, die Node-RED nicht geparst hat), und ist durch eine feste interne Obergrenze begrenzt (Defense-in-Depth), NICHT durch ein konfigurierbares Feld; überschreitet der Body diese Grenze auf dem Fallback-Pfad → 413."
  - "docs/nodes/openapi-in.md, docs/examples/task-manager.md (Caveat) und REQUIREMENTS.md §4 stellen klar, dass das Request-Body-Size-Limit in Node-RED konfiguriert wird (apiMaxLength in settings.js / httpNodeMiddleware), einheitlich und vor dem Flow."
  - "Der bestehende P1.3-Test (413 über dem Limit) wird auf den Fallback-Pfad + die feste interne Obergrenze umgestellt (req.body undefined) statt auf ein Feld; die Suite bleibt grün."
verify: unit
spec: docs/nodes/openapi-in.md
tests: test/openapi-in.tests.md
dependencies: []
status: in_progress
---

# P15 — Body-Size-Limit ist Node-RED-Sache

Motiviert durch [ADR 0003](../../../adr/0003-body-size-limit-is-node-red-owned.md)
(verfeinert die maxBodyBytes-Facette von P1.3, aufgedeckt beim task-manager-Showcase).

Kein neues Verhalten, sondern Ehrlichkeit: das Feld weg, der Fallback-Parser behält eine
feste interne Obergrenze, und die Doku verweist auf Node-REDs eigenes Limit. `lib/`
bleibt unangetastet — reine Node-/Doku-Änderung in `openapi-in`.

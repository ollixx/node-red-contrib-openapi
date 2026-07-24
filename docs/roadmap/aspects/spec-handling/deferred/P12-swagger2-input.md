---
id: P12
title: "Swagger 2.0 als Eingabeformat unterstützen"
epic: aspects/spec-handling
findings:
  - "REQUIREMENTS §4/§7: OpenAPI 3.0/3.1 sind primär, Swagger 2.0 nachrangig. Aktuell wird nur validiert/dereferenziert, was @apidevtools/swagger-parser als OpenAPI akzeptiert; Swagger-2.0-spezifische Konstrukte (z. B. definitions, basePath, consumes/produces auf Operationsebene) werden nicht auf das 3.x-Modell abgebildet."
acceptance:
  - "Eine Swagger-2.0-Spec (swagger: '2.0') wird geladen: basePath→Prefix, definitions→Schemas, consumes/produces→content, parameters (inkl. body-Parameter)→requestBody, securityDefinitions→securitySchemes, sodass der bestehende Operations-Index/Validator/Auth unverändert darauf arbeiten."
  - "Eine kleine Swagger-2.0-Petstore lädt und ein GET/POST verhält sich äquivalent zur 3.x-Variante (Request-Validierung, Response-Validierung, Auth)."
verify: unit
dependencies: []
status: deferred
deferred_reason: "Braucht eine Entscheidung zur Konvertierungsstrategie (eigenes Mapping vs. externe swagger2openapi-Dependency) — ADR-würdig."
---

# P12 — Swagger 2.0 Eingabe (deferred)

Motiviert durch [ADR 0002](../../../../adr/0002-post-mvp-feature-roadmap.md) (REQUIREMENTS §4/§7).

Aufgeschoben bis die Konvertierungsstrategie entschieden ist. (AsyncAPI bleibt laut
ADR 0002 bewusst außerhalb des Scopes — anderer Spec-Typ, anderer Transport.)

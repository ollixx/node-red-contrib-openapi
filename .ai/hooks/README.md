# Agent-OS hooks

## `record-run-cost.js`

Wired in `.claude/settings.json` as a **SessionEnd** and **SubagentStop** hook.
On each run end it reads the run's transcript, sums the real per-message token
usage, measures wall-clock duration, and appends one JSON line to
`.ai/agent-runs.jsonl`, keyed by `session_id`.

Agents do **not** estimate tokens (AGENTS.md rule 9): they only report their
`session_id` + measured duration in their result, and the authoritative token row
lands here automatically.

### Log format (`.ai/agent-runs.jsonl`)

One JSON object per line:

```json
{
  "ts": "2026-07-05T12:00:00.000Z",
  "event": "SessionEnd",
  "session_id": "…",
  "model": "claude-…",
  "messages": 42,
  "tokens": { "input": 0, "output": 0, "cache_read": 0, "cache_creation": 0, "total": 0 },
  "duration_s": 123,
  "duration": "2m 3s",
  "cwd": "/…/node-red-contrib-openapi"
}
```

The hook is defensive: any failure path exits 0 and writes nothing, so it can
never break a session.

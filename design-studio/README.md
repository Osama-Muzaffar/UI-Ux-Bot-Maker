# Design Studio

Local web app for the **design-agent** Claude Code plugin. Runs on your Mac only (`127.0.0.1`),
uses your existing Claude Code login through the Claude Agent SDK — no API key, no separate bill.

## Features
- **New design** — idea + optional reference link (Play Store / website) → runs `/design-agent:design-app`.
- **Live activity** — agent messages, tool calls and their results stream in as they happen.
- **Approval gates** — when the agent stops (flow, wireframes, each Figma batch): *Approve & continue* or send changes.
- **Permission prompts** — tools outside the auto-allowed list (see `server/runner.ts`) ask in the app: Allow / Deny.
- **Design files** — every `.md` the agent writes under the project, rendered.
- **Previews** — every image a tool returns (Figma screenshots, reference screens) is saved and shown.
- **Lessons** — browse/search `~/.design-agent/lessons.db`, add lessons, mark 3×-seen lessons as promoted.

## Requirements
- Node ≥ 22.5, Claude Code installed and logged in (`claude` → `/login`).
- design-agent plugin installed: `claude plugin install design-agent@osama-local`.
- Optional: Figma Desktop with the *Figma Desktop Bridge* plugin running (for Figma steps).

## Run
```bash
cd "design-studio"
npm install
npm run build     # build the web UI once
npm start         # http://127.0.0.1:5174
```
Development (hot reload UI on :5173, API on :5174): `npm run dev`.

> Start it from **your own terminal**. When launched from inside another tool's sandbox, Claude Code
> may fail to refresh its login ("OAuth session expired") — the app shows a hint when that happens.

## Data
`~/.design-agent/projects/<id>/` — `project.json`, `events.jsonl`, `output/` (design files), `previews/` (images).
Lessons and references are shared with the plugin's MCP server in `~/.design-agent/`.

## Next
- Desktop app: wrap this server + UI in Electron (same code).
- The project folder name contains `:`, which breaks `PATH` lookups — scripts call binaries by path.

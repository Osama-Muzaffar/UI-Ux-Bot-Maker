# reference-analyzer MCP (Phase 3 + 4)

TypeScript MCP server bundled into one file (`dist/index.js`, no runtime `node_modules` needed).
Registered by the plugin's `.mcp.json`. Needs Node ≥ 22.5 (uses built-in `node:sqlite`).

Data lives in `~/.design-agent/` (override with `DESIGN_AGENT_HOME`) so plugin updates never wipe it:
`refs/<slug>/` (meta.json, screenshots, analysis.json, style.json, report.md), `lessons.db`, `LESSONS.md`.

| Tool | Does |
|---|---|
| `fetch_reference(url)` | Play Store link → name, category, description, up to 8 screenshots. Website → title, description, theme-color, og:image |
| `analyze_screens(slug[, screens])` | Returns screenshots as images for Claude to look at; with `screens` saves type / layout / navigation per screen |
| `extract_style(slug[, judgment])` | Measures pixels: theme, palette, brand accents, whitespace → density. With `judgment` (font, radius) saves style.json |
| `pattern_report(slug, good, take, avoid)` | Writes report.md: screens table, style profile, good / take / avoid, copy limit |
| `lessons_add(...)` | Saves a lesson; merges near-duplicates (bumps `seen`); regenerates LESSONS.md |
| `lessons_search(query)` | Finds relevant lessons before a new design |
| `lessons_review([promote_id])` | Lessons seen ≥ 3× to promote into SKILL.md; marks them promoted |

Claude does the visual understanding; this server only fetches, measures and stores.
Copy limit: patterns and structure only — never icons, illustrations, brand colors or text.

## Develop
The project folder name contains `:`, which breaks `PATH`, so scripts call binaries by path.
```bash
npm install
npm run build
DESIGN_AGENT_HOME=/tmp/da-test node test/smoke.mjs "<play store url>"
```

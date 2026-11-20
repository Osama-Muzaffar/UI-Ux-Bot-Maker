# design-agent

A Claude Code plugin that designs Android apps like a UI/UX designer:
idea → brief → flow → wireframes → design system → hi-fi Figma screens → self-review → Jetpack Compose.

```
/design-app "Expense tracker for freelancers" ref: <play store link>
/learn "bottom nav mein 5 se zyada items nahi"
```

## Layout
```
design-agent/
  .claude-plugin/plugin.json
  CLAUDE.md                        project rules + phase status
  skills/ux-thinking/SKILL.md      Phase 1 — designer thinking (+ examples/ = taste)
  skills/figma-design/SKILL.md     Phase 2 — the only Figma-specific file
  skills/design-critique/SKILL.md  Phase 4 — review loop
  skills/figma-to-compose/SKILL.md Phase 5 — code
  agents/design-reviewer.md        fresh-eyes reviewer subagent
  commands/design-app.md           /design-app
  commands/learn.md                /learn
  mcp/reference-analyzer/          Phase 3 — your MCP server (not built yet)
  lessons/LESSONS.md               lessons memory (SQLite later)
  tests/phase1/                    Phase 1 test outputs
```

## Setup (Phase 0)
1. Install and log in to Claude Code.
2. Connect Figma's remote MCP (write-to-canvas only works on the remote server):
   ```bash
   claude mcp add --transport http figma https://mcp.figma.com/mcp
   ```
3. Install Figma's official skills (e.g. `/figma-use`).
4. Make sure you have a Figma **Full seat** (needed to write outside Drafts).
5. Test: ask "Ek login screen banao" and check that a frame appears.
6. Load this plugin locally while developing:
   ```bash
   claude --plugin-dir ./design-agent
   ```

## Roadmap
| Week | Phase | Result |
|---|---|---|
| 1 | 0 + 1 start | Claude Code connected to Figma |
| 2 | 1 done | Idea → flow + wireframe (text) |
| 3 | 2 | Idea → Figma screens |
| 4–5 | 3 | Reference link → pattern report |
| 6 | 4 | Self-review + learning |
| 7 | 5 | Approved design → Compose code |
| 8 | 6 | One-command plugin |

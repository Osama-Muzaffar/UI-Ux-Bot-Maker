# UI/UX Bot Maker

An AI UI/UX designer for Android apps, built on Claude Code:
**idea → brief → flow → wireframes → design system → Figma screens → self-review → Jetpack Compose**.

| Folder | What it is |
|---|---|
| [`design-agent/`](design-agent/README.md) | Claude Code plugin — skills, reviewer subagent, `/design-app` and `/learn` commands, and the reference-analyzer MCP server (reference apps + lessons memory) |
| [`design-studio/`](design-studio/README.md) | Local web app to run the agent: new design form, live activity, approval gates, design files, Figma previews, lessons manager |
| `.claude-plugin/marketplace.json` | Local marketplace so the plugin installs with one command |

## Quick start
```bash
# 1. Install the plugin (from this folder)
claude plugin marketplace add "$PWD/"
claude plugin install design-agent@osama-local

# 2. Use it in any Claude Code session
/design-agent:design-app "Expense tracker for freelancers" ref: <play store link>

# 3. Or run the web app
cd design-studio && npm install && npm run build && npm start   # http://127.0.0.1:5174
```

Requirements: Node ≥ 22.5, Claude Code logged in (`claude auth login`), optional Figma Desktop with the
*Figma Desktop Bridge* plugin for the Figma steps.

## Status
| Phase | Status |
|---|---|
| 0 Setup | Done — Figma connected via local bridge |
| 1 UX thinking skill | Done — tested on expense tracker and gym tracker (`design-agent/tests/phase1/`) |
| 2 Figma design | First screens built; base component library still to do |
| 3 Reference analyzer MCP | Done — tested on a real Play Store link |
| 4 Critique + lessons | Lessons in SQLite; reviewer loop in use |
| 5 Figma → Compose | Skill drafted, not tested |
| 6 Packaging | Plugin + local marketplace; web app (desktop/Electron next) |

Copy rule: reference apps are used for patterns and structure only — never their icons, illustrations, brand colors or text.

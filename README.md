# UI/UX Bot Maker

**An AI UI/UX designer for Android apps, built on Claude Code.**
Give it an app idea (and optionally a Play Store reference). It thinks like a senior product designer, then builds the screens in Figma:

> **idea → brief → user flow → wireframes → design system → hi-fi Figma screens → self-review → Jetpack Compose**

It stops for your approval after each big step, reviews its own work with a separate reviewer agent, and saves every mistake as a lesson so the next design is better.

![Hi-fi screens designed by the agent in Figma](docs/images/hifi-batch-1.png)

---

## Results

Everything below was designed **by the agent in Figma** from a one-line idea: a photo-editing app (**"Contour AI"**), run end-to-end from the Design Studio app.

| | |
|---|---|
| **Screens** | 9 hi-fi screens · 9 wireframes · 27 state screens (empty / loading / error / permission / dialogs) |
| **Design system** | Material 3 color roles (light + dark), type scale, 8dp spacing, shape and component specs — every color pair checked for WCAG AA by script |
| **Process** | Brief → flow → wireframes → design system → hi-fi in 3 batches, each batch reviewed by the `design-reviewer` agent |
| **Learning** | 9 lessons captured by the reviewer during the run, reused automatically in later designs |

### Hi-fi screens (Figma)

**Batch 1 — Home · Editor · Tool adjust**
![Home, Editor and Tool adjust screens](docs/images/hifi-batch-1.png)

**Batch 2 — Photo picker · AI assistant · Export**
![Photo picker, AI assistant and Export screens](docs/images/hifi-batch-2.png)

**Batch 3 — Onboarding · Paywall · Settings**
![Onboarding, Paywall and Settings screens](docs/images/hifi-batch-3.png)

### Wireframes first — layout decided before color

Grey-box wireframes for all 9 screens, each with a note card listing its empty, loading and error states.

![Wireframes for all screens with state notes](docs/images/wireframes.png)

### Every screen gets its states

A rule the agent never breaks: each screen is designed for empty, loading and error — not just the happy path.

| Empty | Loading | Error |
|:---:|:---:|:---:|
| <img src="docs/images/state-home-empty.png" width="240" alt="Home, empty state"> | <img src="docs/images/state-home-loading.png" width="240" alt="Home, loading skeleton"> | <img src="docs/images/state-home-error.png" width="240" alt="Home, error with retry"> |

### Real icons, not placeholders

Icons are real **Material Symbols** vectors (Google's official Android set), placed with `figma.createNodeFromSvg` — the active nav item uses the filled variant.

<img src="docs/images/icons-test.png" width="240" alt="Top bar and bottom navigation with real Material Symbols icons">

---

## Design Studio — the app that runs the agent

A local web app (your Mac only, `127.0.0.1`) that drives the agent through the Claude Agent SDK using your own Claude Code login.

| Start a design | Read what the agent wrote |
|:---:|:---:|
| ![New design form with idea and reference link](docs/images/studio-new-design.jpg) | ![Design files tab rendering the brief](docs/images/studio-design-files.jpg) |

- **New design** — idea + optional Play Store / website reference
- **Live activity** — the agent's messages and tool calls as they happen
- **Approval gates** — *Approve & continue* or send changes at every step
- **Permission prompts** — Allow / Deny for anything outside the safe tool list
- **Design files** — brief, flow, wireframes, design system, hi-fi specs, rendered
- **Previews** — Figma screenshots and reference screens, saved automatically
- **Lessons** — search, add and promote what the agent has learned

![Lessons manager with lessons captured by the reviewer](docs/images/studio-lessons.jpg)

---

## How it works

| Folder | What it is |
|---|---|
| [`design-agent/`](design-agent/README.md) | Claude Code plugin: skills, reviewer subagent, `/design-app` + `/learn`, and an MCP server |
| [`design-studio/`](design-studio/README.md) | The local web app (Express + React + Claude Agent SDK) |
| `.claude-plugin/marketplace.json` | Local marketplace for one-command plugin install |

**Skills**
- `ux-thinking` — the designer's process in fixed order: brief → screens & flow (always starting with the Android 12+ splash) → wireframes → Material 3 design system (contrast checked by `scripts/contrast.py`) → hi-fi specs
- `figma-design` — puts specs on the Figma canvas one screen at a time, with auto layout, named layers and real icons
- `design-critique` + `design-reviewer` agent — fresh-eyes review on a 1–5 severity scale, max 2 fix rounds
- `figma-to-compose` — Material 3 theme, components and screens in Jetpack Compose from the approved design

**MCP server (`reference-analyzer`)**
- `fetch_reference` · `analyze_screens` · `extract_style` · `pattern_report` — learn patterns from a reference app (never its assets, colors or text)
- `icon_search` · `icons_svg` — Material Symbols icons for Figma
- `lessons_add` · `lessons_search` · `lessons_review` — SQLite lessons memory shared by the agent and the app

---

## Quick start

Requirements: Node ≥ 22.5, Claude Code logged in (`claude auth login`), Figma Desktop with the *Figma Desktop Bridge* plugin (for the Figma steps).

```bash
# 1. Install the plugin (run in this folder)
claude plugin marketplace add "$PWD/"
claude plugin install design-agent@osama-local
```

```text
# 2a. Use it in any Claude Code session
/design-agent:design-app "Expense tracker for freelancers" ref: https://play.google.com/store/apps/details?id=...
```

```bash
# 2b. Or run Design Studio
cd design-studio && npm install && npm run build && npm start   # → http://127.0.0.1:5174
```

Teach it something it got wrong (inside Claude Code):
```text
/design-agent:learn "bottom nav mein 5 se zyada items nahi"
```

More sample outputs (brief, flow, wireframes, design system as markdown): [`design-agent/tests/phase1/`](design-agent/tests/phase1/).

---

## Status

| Phase | Status |
|---|---|
| 0 Setup | ✅ Figma connected via the local bridge |
| 1 UX thinking | ✅ Tested on expense tracker, gym tracker and Contour AI |
| 2 Figma design | ✅ Wireframes, hi-fi and states built in Figma · base component library next |
| 3 Reference analyzer | ✅ Tested on real Play Store links |
| 4 Critique + lessons | ✅ Reviewer loop and SQLite lessons in use |
| 5 Figma → Compose | 🟡 Running on a real project; not yet verified with a Gradle build |
| 6 Packaging | ✅ Plugin + local marketplace + web app · Electron desktop app next |

**Copy rule:** reference apps are used for patterns and structure only — never their icons, illustrations, brand colors or text.

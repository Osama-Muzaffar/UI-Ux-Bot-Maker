---
name: ux-thinking
description: Think like a senior product/UX designer for an Android app idea. Produces a brief, screen list, user flow, grey-box wireframes and a Material 3 design system, in a fixed order, as markdown. Use when the user gives an app idea to design, runs /design-app, or asks for a flow, wireframe or design system.
---

# UX thinking

You are a senior product designer. Your job is to make the decisions a good designer
makes, in the right order, and write them down so the next step (Figma) is mechanical.

Never skip a step. Never jump to colors before layout is decided.
Output everything as markdown into `output/<app-slug>/` (one file per step) unless told otherwise.

## Step 0 — Load context
1. Lessons: call the `lessons_search` tool (reference-analyzer MCP) with keywords from the idea
   (app type, key screens, nav), plus once with an empty query for the most-seen lessons.
   If the MCP isn't available, read `~/.design-agent/LESSONS.md`, else `../../lessons/LESSONS.md`.
   List the lessons that apply in `01-brief.md` and follow them.
2. Skim this skill's `examples/` folder for patterns relevant to this app type (onboarding, dashboard, list, form…).
3. Reference link given → run the reference flow (below) first. A finished report lives at
   `~/.design-agent/refs/<slug>/report.md`. Take patterns only.

### Reference flow (reference-analyzer MCP)
1. `fetch_reference(url)` → slug + screenshots.
2. `analyze_screens(slug)` → look at every image; then `analyze_screens(slug, screens=[…])` to save
   screen_type, layout_pattern (regions top→bottom), navigation, one notable pattern each.
3. `extract_style(slug)` → measured theme, density, brand accents; then call again with `judgment`
   (font style, corner radius you see). Ignore marketing frames/captions when judging.
4. `pattern_report(slug, good, take, avoid)` → report.md.
Copy limit: never reuse the reference's icons, illustrations, brand colors (the measured accents) or text.

## Step 1 — Brief  → `01-brief.md`
Answer these, one or two lines each:
- **Who** is the primary user? (role, context, tech comfort, when/where they use the app)
- **Job to be done**: "When ___, I want to ___, so I can ___."
- **Core action**: the ONE thing the user does most. The home screen exists to serve it.
- **Success**: how do we know the app works for them? (e.g. "logs an expense in < 10 s")
- **Out of scope** for v1.
- **Assumptions** you made.

If the user, the core action, or the platform is genuinely unclear, ask **2–3 short questions**
and stop. Do not ask about things you can sensibly assume — write them under Assumptions.

## Step 2 — Screens and flow  → `02-flow.md`
1. Screen list as a table: `# | Screen | Purpose | Entry from | Key content`.
   Number them `01-Onboarding`, `02-Home`, … (these become Figma frame names).
   Keep v1 small: usually 5–9 screens. Every screen must justify itself against the brief.
2. Main flow as a line: `Onboarding → Home → <core action> → Result`.
   Count taps for the core action. Aim for ≤ 3 from Home.
3. Navigation model: bottom nav (3–5 destinations), tabs, or single stack. Say why.
4. Secondary flows (settings, edit, delete, auth) in one line each.
5. A mermaid `flowchart` of the main flow.

## Step 3 — Wireframes (grey boxes)  → `03-wireframes.md`
For each screen, top to bottom, describe regions only — no color, no font choice:
```
### 02-Home  (360×800)
- TopBar: title "…", action: profile icon
- Summary card (full width, ~120dp): month total, vs last month
- Section header "Recent"
- List (expense rows: icon · title · amount) — scrolls
- FAB: "+ Add expense" (bottom-right)
- BottomNav: Home · Reports · Clients · Settings
States: empty (illustration slot + "Add your first expense" CTA) · loading (skeleton rows) · error (inline banner + Retry)
```
Rules: one primary action per screen; most important content in the top third;
thumb zone for frequent actions; reuse the same region patterns across screens.
Every screen MUST list empty, loading and error states.

## Step 4 — Design system  → `04-design-system.md`
Derive it from the brief (audience + mood), not from taste defaults. Give a one-line rationale.
- **Color**: Material 3 roles — primary, onPrimary, primaryContainer, onPrimaryContainer,
  secondary(+on/container), tertiary(+on/container), error(+on/container), surface,
  surfaceContainer(low/high), onSurface, onSurfaceVariant, outline. Light + dark hex.
  Check every text/background pair for WCAG AA (4.5:1 body, 3:1 large text, icons & outlines)
  with this skill's script — never estimate ratios by eye:
  1. Write the pairs to `output/<app-slug>/contrast-pairs.txt`, one per line:
     `light onPrimary/primary | #FFFFFF | #1F5E4A` (add `| 3` for large text, icons, outlines).
     Cover every on-X/X pair, onSurface + onSurfaceVariant on each surface level, primary-as-text
     on surface, and outline on surface — for light AND dark.
  2. Run `python3 <this skill's folder>/scripts/contrast.py output/<app-slug>/contrast-pairs.txt`.
  3. If it exits non-zero, adjust the failing colors and re-run until all pass.
  4. Paste the script's table into the design-system file.
- **Typography**: M3 type scale (display/headline/title/body/label × L/M/S) — font, size/line-height, weight.
  Max 2 font families.
- **Spacing**: 8dp grid (4dp allowed for tight inner gaps). Tokens: xs 4, s 8, m 16, l 24, xl 32, xxl 48.
  Screen side margin 16dp.
- **Shape**: corner radius tokens (e.g. small 8, medium 12, large 16, full).
- **Elevation**: which surfaces use tonal elevation.
- **Components** (spec each: anatomy, sizes, states default/pressed/disabled/error):
  Button (filled, tonal, outlined, text), Card, TextField, TopBar, BottomNav, ListItem, FAB, Chip, Dialog/BottomSheet.
  Add only app-specific components the screens actually need.

## Step 5 — Hi-fi spec  → `05-hifi-<screen>.md` (one screen at a time)
Map each wireframe region to a design-system component + tokens. No new styles.
If something needs a style that doesn't exist, add it to the design system first, then use it.
Write real, specific copy (not lorem ipsum). Then hand off to the `figma-design` skill.

## Rules that never break
- Material 3 guidelines.
- Touch targets ≥ 48×48dp.
- WCAG AA contrast.
- Empty, loading and error state for every screen.
- 8dp spacing grid; consistent side margins.
- Text must handle long strings (truncate or wrap — decide per field) and large font scale.
- References: patterns and structure only. Never copy icons, illustrations, brand colors or text.
- Avoid generic AI look: pick one distinctive move per app (a signature card, type pairing,
  or accent use) grounded in the brief, and keep everything else calm.

## Approval gates
Stop and ask for approval after: Step 2 (flow), Step 3 (wireframes), Step 5 (each hi-fi screen batch).
Show a short summary and the file paths, not the whole files.

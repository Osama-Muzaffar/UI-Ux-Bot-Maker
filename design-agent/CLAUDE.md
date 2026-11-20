# design-agent — project rules

This repo is a Claude Code plugin that acts as a UI/UX designer for Android apps.
Entry point: `/design-app "<idea>" [ref: <link>]`. Lessons: `/learn "<lesson>"`.

## Pipeline (always in this order, user approval between big steps)
1. Brief → 2. Screens + flow → 3. Wireframes → 4. Design system → 5. Hi-fi screens → 6. Critique → 7. Compose code
- Thinking rules: `skills/ux-thinking/SKILL.md`
- Figma canvas work: `skills/figma-design/SKILL.md` (the ONLY file that knows Figma tool details)
- Review: `skills/design-critique/SKILL.md` + `agents/design-reviewer.md`
- Code: `skills/figma-to-compose/SKILL.md`

## Hard rules
- Material 3 guidelines, 48dp min touch targets, WCAG AA contrast, 8dp spacing grid.
- Every screen designs empty, loading and error states.
- Reference apps: take patterns and structure only. Never copy icons, illustrations, brand colors or copy text.
- One screen per step in Figma. Never build a whole app in one prompt.
- Before starting any design, read `lessons/LESSONS.md` and apply matching lessons.
- Do only what was asked — no extra screens, features or abstractions.

## Phase status
| Phase | Status |
|---|---|
| 0 Setup | done — figma-console local bridge connected; login test screen built (2026-11-20) |
| 1 UX thinking skill | 2 of 3 test ideas done (expense, gym); contrast script added |
| 2 Figma design | first wireframe (gym 02-Home) built via local bridge; no variables/components library yet |
| 3 Reference analyzer MCP | built (TypeScript, `mcp/reference-analyzer`); smoke-tested on a real Play Store link |
| 4 Critique + lessons | lessons in SQLite via MCP (add/search/review) tested; reviewer loop not yet run on a Figma screen |
| 5 Figma → Compose | skill drafted, not tested |
| 6 Plugin packaging | installed via local marketplace `osama-local`; MCP auto-registered from `.mcp.json` |

Do not start the next phase until the current phase's test passes.

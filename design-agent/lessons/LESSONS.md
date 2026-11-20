# Design lessons

Read before every new design. Added by the reviewer (`source: reviewer`) and by `/learn` (`source: user`).
Monthly: lessons with `seen ≥ 3` get promoted to a permanent rule in `skills/ux-thinking/SKILL.md` and moved to the Promoted section.
**Live lessons now live in `~/.design-agent/lessons.db`** (reference-analyzer MCP: `lessons_add`, `lessons_search`, `lessons_review`),
exported to `~/.design-agent/LESSONS.md`. This file is only the seed / fallback when the MCP is unavailable.

## Format
```
### L-001 · <category> · seen: 1 · source: user|reviewer · added: YYYY-MM-DD
- Mistake: …
- Why: …
- Do instead: …
```

## Active

### L-001 · component · seen: 1 · source: user · added: 2026-11-20
- Mistake: Bottom navigation with more than 5 destinations.
- Why: Material 3 nav bar supports 3–5 items; more makes targets too small and labels truncate.
- Do instead: Keep 3–5 top-level destinations; move the rest into a "More"/profile screen or a navigation drawer.

## Promoted
_(none yet)_

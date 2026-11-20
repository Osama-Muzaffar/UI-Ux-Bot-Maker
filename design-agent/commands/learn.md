---
description: Save a design lesson (e.g. something you fixed by hand in Figma) so the agent applies it next time.
argument-hint: "<lesson, e.g. bottom nav mein 5 se zyada items nahi>"
---

Add this lesson to the design agent's memory: $ARGUMENTS

1. Turn it into: mistake, why, do_instead (English; if the input is Urdu/Roman Urdu, keep the
   meaning exactly), and one category: spacing, color, type, layout, flow, component, copy,
   accessibility, code, figma.
2. Call the `lessons_add` tool with source `user`. It merges near-duplicates by itself.
   If the reference-analyzer MCP isn't available, append to `~/.design-agent/LESSONS.md` by hand.
3. Reply in one line: `added L-00N` or `merged into L-00N (seen: X)` + the rule.

Monthly: run `lessons_review` — lessons seen ≥ 3 times become permanent rules in
`skills/ux-thinking/SKILL.md` ("Rules that never break"), then `lessons_review(promote_id=N)`.

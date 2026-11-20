---
name: design-critique
description: Review a just-built screen (Figma screenshot or hi-fi spec) against a fixed checklist, score each issue 1–5, fix issues scored above 3, and record lessons. Use after every Figma screen is created, or when the user asks for a design review.
---

# Design critique

The builder is biased toward "looks fine". Always delegate the review to the
`design-reviewer` subagent, which sees the design fresh. You then fix what it found.

## Loop (max 2 rounds)
1. Get a screenshot of the frame (Figma MCP) + the frame's spec file. Save the screenshot path.
2. Call `lessons_search` with the screen's type and components; send the screenshot path, spec path
   and those lessons to the `design-reviewer` agent. It returns issues with severity 1–5.
3. Fix every issue with severity > 3. Leave ≤ 3 as notes for the user.
4. Re-screenshot and run the reviewer once more. Stop after round 2 even if issues remain —
   report them to the user instead of looping.

## Learning
For every issue with severity ≥ 4 that you fixed, call `lessons_add` (category, mistake, why,
do_instead, source `reviewer`). The tool merges near-duplicates and bumps their `seen` count itself.
If the MCP isn't available, append to `~/.design-agent/LESSONS.md` by hand in the same format.

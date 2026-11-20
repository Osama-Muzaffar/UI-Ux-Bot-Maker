---
description: Design an Android app from an idea — brief, flow, wireframes, design system, Figma screens, review, and optionally Compose code.
argument-hint: "<app idea>" [ref: <play store or website link>]
---

Design this app: $ARGUMENTS

Run the pipeline in order. Stop for my approval at each gate. Never skip ahead.

1. **Plan** — use the `ux-thinking` skill for Steps 0–4 (lessons → brief → flow → wireframes → design system).
   Write files to `output/<app-slug>/`.
   - If a `ref:` link was given and the reference-analyzer MCP is available, run
     `fetch_reference` → `analyze_screens` → `extract_style` → `pattern_report` first and use the
     report as input. Patterns only — never copy assets, brand colors or text.
   - If no MCP, but I attached screenshots, analyze them yourself the same way.
   - **Gate:** after flow, and again after wireframes.
2. **Wireframes in Figma** — `figma-design` skill, Wireframes page, one screen at a time.
3. **Hi-fi** — `ux-thinking` Step 5 spec, then `figma-design` on the Hi-fi page, one screen at a time.
   After each screen run the `design-critique` skill (max 2 rounds). **Gate:** per screen batch.
4. **Code** — only if I approve and ask: `figma-to-compose` skill.

At each gate show: what you decided (3–6 bullets), files written, open questions.

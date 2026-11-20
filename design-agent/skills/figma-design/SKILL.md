---
name: figma-design
description: Put an approved ux-thinking plan (wireframes, design system, hi-fi spec) onto the Figma canvas, one screen at a time, using the base design-system library. Use after the user approves a wireframe or hi-fi spec and wants it in Figma.
---

# Figma design

This is the ONLY file that knows how Figma tools work. If Figma's MCP changes, change only this file.

## Prerequisites (Phase 0)
One of these two Figma connections (check in this order):

**A. Local bridge — `figma-console` MCP (current setup)**
- Figma Desktop open with the target file, and the plugin running:
  Plugins → Development → *Figma Desktop Bridge* → Run.
- Check: `figma_get_status` with `probe: true` must report success. If it says
  "No active file connected", stop and ask the user to run the plugin — don't retry in a loop.
- Tools: `figma_execute` (Plugin API JavaScript) to build, `figma_capture_screenshot` (nodeId) to verify,
  `figma_search_components` / `figma_get_variables` to find library components and tokens,
  `figma_setup_design_tokens` / `figma_batch_create_variables` to create tokens in one call.

**B. Official remote MCP** — `https://mcp.figma.com/mcp` + Figma's official skills (e.g. `/figma-use`).
Write-to-canvas only works on the remote server. Full seat needed outside Drafts.

Both: a base design-system file with variables (color, spacing, radius) and components
Button, Card, TextField, TopBar, BottomNav (+ ListItem, FAB, Chip as they get added).
If the file has none yet, create the variables from `04-design-system.md` first (one batch call).

## File structure
- Page `Wireframes` — grey boxes from `03-wireframes.md`.
- Page `Hi-fi` — final screens from `05-hifi-*.md`.
- Page `States` — empty / loading / error variants, placed under their screen.
- Check if a page exists before creating it. Never create duplicates.

## Per-screen procedure (one screen per call — never the whole app at once)
1. Create frame `NN-ScreenName`, 360×800, vertical auto layout, padding 16dp sides.
2. Build regions top→bottom from the spec. Each region = auto-layout frame, named after the region.
3. Use library component instances and variables. Draw new shapes ONLY if no component exists —
   then note it so it can be added to the library.
4. Children fill container width (not hug) unless the spec says otherwise.
5. Bind fills, text styles, spacing and radius to variables — no hard-coded hex or px.
6. Take a screenshot of the frame and hand it to the `design-critique` skill.

### Local bridge (`figma_execute`) notes
- Load fonts before any text: `await figma.loadFontAsync({family:"Inter",style:"Regular"})` (and every style used).
  If a brand font isn't installed, fall back to Inter and note it. Check the exact weights with
  `figma.listAvailableFontsAsync()` first — e.g. Space Grotesk often has no "Semi Bold" (use Medium or Bold).
- If the connected file is not a dedicated design file, work only on a separate page
  (e.g. `Design Agent Test`) and never touch existing pages.
- Pages: `await figma.loadAllPagesAsync()`, reuse an existing page by name, then `await figma.setCurrentPageAsync(page)`.
- Place each screen beside the last one (x = previous.x + 360 + 80) so frames never overlap.
- Auto layout: `layoutMode="VERTICAL"`, children `layoutSizingHorizontal="FILL"`; set sizing AFTER `appendChild`.
- Return the created frame id from the script, then `figma_capture_screenshot` with that nodeId.
- On error: delete any partial frame you created before retrying.
- Keep each script to one screen; raise `timeout` (e.g. 30000) for larger screens.

## Wireframe mode
Only greys (surface, outline, onSurfaceVariant), system font, placeholder rectangles for images.

## Naming
Frames `01-Onboarding`, `02-Home`…; layers named by role (`Header`, `SummaryCard`, `RecentList`), never `Frame 123`.

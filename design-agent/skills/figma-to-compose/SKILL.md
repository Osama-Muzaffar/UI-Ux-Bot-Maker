---
name: figma-to-compose
description: Turn an APPROVED Figma design into Jetpack Compose code — Material 3 theme from Figma variables, one Compose component per Figma component, then screens. Use only after the user approves the hi-fi screens and asks for code.
---

# Figma → Jetpack Compose

Only run on screens the user approved.

## Steps
1. **Read** the approved frames with the Figma MCP read tools: layout, variables, components.
2. **Tokens** → `ui/theme/`:
   - `Color.kt` + `Theme.kt`: Material 3 `lightColorScheme` / `darkColorScheme` from Figma color variables.
   - `Type.kt`: `Typography` from Figma text styles.
   - `DesignTokens.kt`: spacing (`Spacing.s = 8.dp` …) and shapes (`Shapes`).
3. **Components** → `ui/components/`: one composable per Figma component (`AppButton`, `AppCard`,
   `AppTextField`, `AppTopBar`, `AppBottomNav`…). Wrap M3 components; take tokens from the theme only.
   If Figma Code Connect is set up, map each Figma component to its composable.
4. **Screens** → one file per screen. Stateless `XScreen(state, onEvent)` + `@Preview` for
   default, empty, loading, error states. Follow the target project's CLAUDE.md
   (architecture, naming, "nothing extra").
5. **Verify**: `./gradlew assembleDebug`, then render previews/screenshot and compare with the Figma frame.
   Any visible difference → fix it, and add a lesson (category `code`) to `../../lessons/LESSONS.md`.

## Rules
- No hard-coded colors, dp or sp in screens — theme and tokens only.
- Touch targets ≥ 48dp (`Modifier.minimumInteractiveComponentSize()`).
- Strings in `strings.xml`.

# Design system — Gym tracker for beginners

**Rationale**: beginners are intimidated by "hardcore" gym apps (black + neon, aggressive type). Mood = *calm coach*: a grounded deep green for trust and growth, a warm amber for wins/PRs, very high contrast and large tap targets for in-gym, glance-at-it use.

**Signature move**: the **Set row** — a big, rounded, tactile row whose ✓ button fills with primary and the row turns `primaryContainer` when done. It is the one thing users touch 50+ times per workout, so it gets the character; everything else stays quiet. PRs use the amber `secondary` only — so amber always means "you got stronger".

## Color (Material 3 roles)

| Role | Light | Dark |
|---|---|---|
| primary / onPrimary | #1F5E4A / #FFFFFF | #8DD5B5 / #003827 |
| primaryContainer / onPrimaryContainer | #A8F0D0 / #002116 | #005138 / #A8F0D0 |
| secondary / onSecondary (PR amber) | #7A5200 / #FFFFFF | #F5BC6B / #412D00 |
| secondaryContainer / onSecondaryContainer | #FFDDB3 / #2A1800 | #5C3D00 / #FFDDB3 |
| tertiary / onTertiary (info, rest timer) | #3D5F8F / #FFFFFF | #A8C8FF / #00315F |
| tertiaryContainer / onTertiaryContainer | #D5E3FF / #001B3D | #23477A / #D5E3FF |
| error / onError | #BA1A1A / #FFFFFF | #FFB4AB / #690005 |
| errorContainer / onErrorContainer | #FFDAD6 / #410002 | #93000A / #FFDAD6 |
| surface / onSurface | #F7FAF6 / #191C1A | #101412 / #E0E3DF |
| surfaceContainerLow | #F1F4F0 | #181D1A |
| surfaceContainerHigh | #E6E9E5 | #262B28 |
| onSurfaceVariant | #404943 | #BFC9C1 |
| outline | #707973 | #89938C |

### Contrast check (WCAG AA: 4.5:1 body, 3:1 large text/icons/outlines)
| Pair | Light | Dark |
|---|---|---|
| onPrimary / primary | 7.6 ✓ | 7.7 ✓ |
| onPrimaryContainer / primaryContainer | 13.0 ✓ | 7.2 ✓ |
| onSecondary / secondary | 6.9 ✓ | 7.7 ✓ |
| onSecondaryContainer / secondaryContainer | 13.2 ✓ | 7.7 ✓ |
| onTertiary / tertiary | 6.5 ✓ | 7.7 ✓ |
| onTertiaryContainer / tertiaryContainer | 13.3 ✓ | 7.2 ✓ |
| onError / error | 6.5 ✓ | 7.7 ✓ |
| onErrorContainer / errorContainer | 13.3 ✓ | 7.2 ✓ |
| onSurface / surface | 16.3 ✓ | 14.3 ✓ |
| onSurfaceVariant / surface | 8.9 ✓ | 10.9 ✓ |
| onSurfaceVariant / surfaceContainerHigh | 7.6 ✓ | 8.5 ✓ |
| primary (as text) / surface | 7.2 ✓ | 10.9 ✓ |
| outline / surface (3:1 needed) | 4.3 ✓ | 5.9 ✓ |

## Typography (2 families)
- **Display/Headline/numbers**: *Space Grotesk* — tabular figures, friendly-technical; makes weights & timers read like a scoreboard.
- **Title/Body/Label**: *Inter*.

| Style | Font | Size / line | Weight | Use |
|---|---|---|---|---|
| displaySmall | Space Grotesk | 36/44 | 600 | Big progress number, rest timer |
| headlineLarge | Space Grotesk | 32/40 | 600 | Summary headline |
| headlineMedium | Space Grotesk | 28/36 | 600 | Set weight × reps |
| headlineSmall | Space Grotesk | 24/32 | 600 | Workout timer |
| titleLarge | Inter | 22/28 | 600 | Screen titles, exercise name |
| titleMedium | Inter | 16/24 | 600 | Card titles |
| titleSmall | Inter | 14/20 | 600 | Section headers |
| bodyLarge | Inter | 16/24 | 400 | Main text |
| bodyMedium | Inter | 14/20 | 400 | Supporting text |
| bodySmall | Inter | 12/16 | 400 | Helper / error text |
| labelLarge | Inter | 14/20 | 600 | Buttons, trailing values |
| labelMedium | Inter | 12/16 | 600 | Chips, badges |
| labelSmall | Inter | 11/16 | 600 | Nav labels |

Large font scale: set rows wrap weight × reps under the set number at ≥ 1.3×; exercise names wrap to 2 lines then ellipsis.

## Spacing (8dp grid)
xs 4 · s 8 · m 16 · l 24 · xl 32 · xxl 48. Screen side margin **16dp**. Card inner padding 16dp. Gap between cards 16dp, between set rows 8dp.

## Shape
small 8 (chips, badges) · medium 12 (text fields, list rows) · large 20 (cards, set rows, bottom sheets top) · full (buttons, FAB, ✓ button).

## Elevation
Tonal only. Level 0 surface · Level 1 `surfaceContainerLow` (cards, set rows) · Level 2 `surfaceContainerHigh` (bottom sheets, rest timer bar). No drop shadows except the rest timer bar (level 3) so it floats above the list.

## Components
| Component | Anatomy & size | States |
|---|---|---|
| Button — filled | 56dp height for primary actions (gym use), full width, labelLarge, radius full | default primary · pressed +state layer 12% · disabled onSurface 12%/38% · loading = spinner replaces label |
| Button — tonal | 48dp, secondaryContainer | same |
| Button — outlined | 48dp, outline 1dp | same |
| Button — text | 48dp min target | same |
| Card | surfaceContainerLow, radius 20, padding 16 | default · pressed state layer |
| TextField (outlined) | 56dp, radius 12, label + supporting text | focused primary 2dp · error border + bodySmall error text · disabled |
| TopBar | small 64dp; title titleLarge; ≤ 2 actions | scrolled = surfaceContainer |
| BottomNav | 80dp, 4 items, icon + labelSmall, active indicator primaryContainer | selected · unselected onSurfaceVariant |
| ListItem | 72dp two-line, leading 40dp, trailing labelLarge | default · pressed |
| Chip (filter / choice) | 32dp visual, 48dp touch target, radius 8 | selected primaryContainer · unselected outline |
| Dialog / BottomSheet | sheet radius 20 top, drag handle, max 2 actions | — |
| **SetRow** (app-specific) | 72dp, radius 20, [set # labelLarge] [weight headlineMedium, tappable 48dp] × [reps, tappable 48dp] [✓ 56dp circle] | upcoming: surfaceContainerLow · current: outline 2dp primary · done: primaryContainer + filled ✓ · error: errorContainer + "Retry" |
| **RestTimerBar** (app-specific) | 72dp bar above bottom edge, tertiaryContainer, timer displaySmall-sized 32sp, −15 / +15 / Skip (48dp each) | running · finished (vibrate + "Next set") |
| **WeekStrip** (app-specific) | 3 day dots 32dp + labels, "1 of 3 this week" | done (primary fill) · today (primary outline) · upcoming (outline) |
| **PRBadge** (app-specific) | labelMedium, secondaryContainer, radius 8, "▲ PR" | — |
| **ChoiceCard** (onboarding) | full width, 72dp, radius 20, title + 1 line | selected primaryContainer + check · unselected outline |

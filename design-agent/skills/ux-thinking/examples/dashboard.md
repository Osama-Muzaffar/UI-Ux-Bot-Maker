# Pattern: Home / dashboard that answers one question

**Goal**: in 2 seconds the user knows "how am I doing?" and can do the core action in one tap.

## What works
- **One hero number** at the top (balance, today's total, streak) with a short comparison
  ("↓ 12% vs last month"). Use displaySmall/headlineLarge for the number, labelMedium for the label.
- **Core action always reachable**: FAB or a prominent button in the thumb zone.
- **Then context, not everything**: 1 summary card + "Recent" list (5–7 items) + "See all".
- **Progressive disclosure**: charts and breakdowns live one tap deeper (Reports tab).
- **Consistent card rhythm**: same radius, same 16dp inner padding, 12–16dp gaps between cards.
- **Pull to refresh** if data is remote; show "Updated 2 min ago" quietly.

## States
- Empty: hero number shows 0 with a friendly line + CTA to the core action.
- Loading: skeleton for hero + 3 list rows (no full-screen spinner).
- Error: keep cached content, show an inline banner with Retry.

## Avoid
- Six equal-weight cards fighting for attention.
- Charts on home that need a legend to understand.
- Hiding the core action in a menu.

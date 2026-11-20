# Pattern: Onboarding that earns the signup

**Goal**: get the user to their first moment of value as fast as possible.

## What works
- **Value before account.** Let people try the core action first; ask for signup when there is
  something to save ("Save your first budget → create account").
- **≤ 3 intro screens, skippable.** Each one = one benefit, one short headline (≤ 6 words),
  one supporting line. "Skip" top-right, primary "Next/Get started" in the thumb zone.
- **Personalize with 1–2 questions** that actually change the home screen (e.g. currency,
  main goal). Use big tappable choice cards, not dropdowns.
- **Permission priming.** Explain why before the system dialog (notifications, camera). Ask in context, not on launch.
- **Progress indicator** (dots or step bar) when there are 2+ steps.

## Layout skeleton (360×800)
- Top: Skip (text button, 48dp target)
- Middle 55%: illustration slot (your own art — never a reference app's)
- Below: headline (headlineMedium), body (bodyLarge, onSurfaceVariant), max 2 lines
- Bottom: dots + primary filled button full width, 16dp margins, 24dp from bottom

## Avoid
- Signup wall as the first screen for a utility app.
- 5+ carousel slides nobody reads.
- Asking for data you don't use yet.

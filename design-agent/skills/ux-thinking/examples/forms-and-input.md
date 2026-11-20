# Pattern: Fast data entry (add / create form)

**Goal**: the user finishes in seconds and trusts it was saved.

## What works
- **Smart defaults**: today's date, last used category/currency pre-filled.
- **Most important field first and auto-focused**, with the right keyboard (numeric for amounts).
- **Big amount input** (headlineMedium) for money apps; everything else is secondary.
- **Chips over dropdowns** for ≤ 8 options; bottom sheet picker for more.
- **Inline validation** on blur, error text under the field (bodySmall, error color) — never only red borders.
- **Primary action pinned above the keyboard** ("Save"), disabled until required fields are valid.
- **Confirmation**: snackbar "Expense saved · Undo", return to the previous screen.
- Long forms: split into sections or steps; show progress.

## Field anatomy (M3 outlined TextField)
Label · input · supporting/error text · optional leading/trailing icon. Height 56dp, 16dp gap between fields.

## Avoid
- Asking for optional fields upfront — hide them behind "Add note", "More details".
- Placeholder text as the only label.
- Losing input on rotation, back press or error.

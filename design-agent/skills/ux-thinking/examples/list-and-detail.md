# Pattern: List → detail

**Goal**: scan fast, find one item, act on it.

## List
- Row = leading visual (icon/avatar 40dp) · title (bodyLarge, 1 line, ellipsis) · supporting text
  (bodyMedium, onSurfaceVariant) · trailing value or meta (labelLarge). Min height 56–72dp.
- Group by date or status with sticky section headers when the list is long.
- Search + 1 row of filter chips at the top; sort in an overflow or chip.
- Swipe actions only for frequent, reversible actions (archive), always with Undo snackbar.
- Pagination: infinite scroll with a footer loader; never a "Load more" for < 200 items.

## Detail
- TopBar with back + 1–2 actions (edit, overflow). Destructive actions go in overflow.
- Most important field big at the top, then grouped sections with labelLarge headers.
- Primary action at the bottom (filled button) if the detail screen has one clear next step.

## States
- Empty list: explain what will appear here + CTA. Empty search: "No results for '…'" + clear filters.
- Loading: 6–8 skeleton rows.
- Error: full-area message with Retry (list), or inline banner (detail with cached data).

## Avoid
- Tiny trailing icon buttons < 48dp.
- More than 2 lines of supporting text per row.
- Delete without confirmation or undo.

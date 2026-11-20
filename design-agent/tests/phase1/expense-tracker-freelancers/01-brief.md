# Brief — Expense tracker for freelancers

Lessons applied: L-001 (bottom nav ≤ 5 items).
Examples used: dashboard.md, forms-and-input.md, list-and-detail.md, onboarding.md.

- **Who**: Solo freelancers (designers, developers, writers) working with 2–10 clients. Comfortable with phones, hate bookkeeping. Use the app right after paying for something (on the go) and once a month before invoicing / tax time (at a desk).
- **Job to be done**: "When I pay for something work-related, I want to log it in seconds and tag the client, so I can bill it back and have clean numbers at tax time."
- **Core action**: Add an expense (amount, category, client, optional receipt photo).
- **Success**: An expense is logged in < 10 s from opening the app; at month end the user can see per-client billable totals and export them.
- **Out of scope (v1)**: invoicing, bank sync, multi-currency conversion, team accounts, income tracking.
- **Assumptions**: Android only; single currency chosen at onboarding; offline-first with local storage; receipt photos stored on device; export = CSV/PDF share sheet.

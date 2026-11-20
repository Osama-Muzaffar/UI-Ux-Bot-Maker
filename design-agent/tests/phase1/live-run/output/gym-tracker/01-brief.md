# Brief — Gym workout tracker for beginners (3×/week)

**Step 0 context**
- Lessons applied: L-001 (bottom nav ≤ 5 items).
- Examples used: onboarding.md (value before account, 1–2 personalizing questions), dashboard.md (one hero answer), forms-and-input.md (fast entry, smart defaults), list-and-detail.md (history).
- Reference report: none.

- **Who**: Gym beginners (0–6 months), 18–35, comfortable with phones but not with training jargon. Use the app *inside the gym*, between sets — sweaty hands, phone on a bench, 60–90 s rest breaks, often one-handed.
- **Job to be done**: "When I walk into the gym, I want to know exactly what to do today and log it without thinking, so I can see I'm getting stronger and keep coming back."
- **Core action**: Log a set (weight × reps, tap ✓) during today's workout.
- **Success**: Logging a set takes ≤ 1 tap when repeating the suggested weight/reps (≤ 3 taps when changing it); user completes 3 workouts/week for 4 weeks; sees a progression on at least one lift.
- **Out of scope (v1)**: custom program builder, social/feed, nutrition, wearables, coaching videos (only short form cues), cardio tracking beyond a note.
- **Assumptions**:
  - App ships with 2 built-in beginner programs (Full-body A/B, 3 days/week); user picks one in onboarding.
  - Next-session weight is suggested automatically (+2.5 kg when all reps hit last time).
  - Units kg/lb chosen once. Offline-first; no account needed for v1.
  - Built-in rest timer starts automatically after each logged set.

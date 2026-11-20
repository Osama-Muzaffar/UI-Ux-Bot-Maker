# Wireframes (grey boxes, 360×800)

### 01-Onboarding (3 steps, one screen with a step bar)
- Step bar (3 segments) + Skip (text button, top-right; skip = sensible defaults)
- Step 1: illustration slot + headline "Know exactly what to do today" + 1 line
- Step 2: "What's your goal?" — 3 choice cards (Get stronger · Build muscle · Stay consistent)
- Step 3: "Which days do you train?" — 7 day chips (pre-selected Mon/Wed/Fri) + units chips (kg · lb)
- Primary button full width at bottom ("Next" → "Start my plan")
States: empty n/a · loading: button progress while plan is generated · error: inline "Couldn't save — Retry"

### 02-Home
- TopBar: "Wednesday" + greeting line, action: none (keep calm)
- Week strip: 3 training-day dots (done / today / upcoming) — "1 of 3 this week"
- **Today card (hero, full width, ~220dp)**: workout name "Full-body A", 5 exercise names (2 lines max, "+2 more"), est. "45 min", primary button "Start workout"
- Section "Last time": 1 compact row (date · workout · volume · PR badge)
- BottomNav: Home · History · Progress · Settings
States: rest day (hero becomes "Rest day — next: Friday, Full-body B" + text button "Train anyway") · empty first-run (hero shows first workout + "Your first session") · loading (skeleton hero) · error (banner "Couldn't load plan" + Retry, hero hidden)

### 03-Workout (full-screen, no bottom nav)
- TopBar: close ✕ (asks to save), workout timer "12:40", text button "Finish"
- Exercise header: name (2 lines max), "Exercise 2 of 5", ⓘ button, overflow (Skip / Swap)
- Progress dots for exercises (swipe left/right between exercises)
- Set list (3 rows): set # · weight (tappable) · × · reps (tappable) · big ✓ button (56dp) — current set highlighted, done sets dimmed with check
- "Last time: 40 kg × 8, 8, 7" helper line
- **Rest timer bar** (bottom, appears after ✓): countdown, −15 s / +15 s, Skip
- Primary bottom action when last set of last exercise done: "Finish workout"
States: empty n/a (workout always has exercises) · loading (skeleton set rows) · error (save failure → snackbar "Set not saved — Retry", set stays unchecked)

### 04-WorkoutSummary
- Celebration slot (small illustration area) + headline "Workout done!"
- Stat row (3 tiles): Duration · Volume · Sets
- PR list: "Squat +2.5 kg" rows (only if PRs)
- Streak line: "2 of 3 this week"
- Primary button "Done", text button "Add note"
States: no PRs (PR section replaced by "Next time: Squat 42.5 kg") · loading (stats skeleton) · error ("Couldn't save workout" + Retry — data kept locally)

### 05-History
- TopBar "History"
- Month calendar strip (training days marked)
- List grouped by week: row = date · workout name · duration · volume (trailing)
- BottomNav
States: empty ("Your workouts will show up here" + "Start today's workout" CTA) · loading (6 skeleton rows) · error (full-area + Retry)

### 06-SessionDetail
- TopBar: back, date, overflow (Delete)
- Summary row: duration · volume · sets
- Per exercise: name + set chips "40×8 · 40×8 · 40×7"
- Note block (if any)
States: loading skeleton · error + Retry · no note = hidden block

### 07-Progress
- TopBar "Progress"
- Lift chips: Squat · Bench · Row · Press · Deadlift
- Big number: current top set "45 kg" + "+10 kg since start"
- Line chart: top weight per session (last 12 weeks)
- PR list
- BottomNav
States: empty ("Finish 2 workouts to see progress" + progress bar 0/2) · loading · error + Retry

### 08-ExerciseInfo (bottom sheet from Workout)
- Drag handle, exercise name
- Image/diagram slot (own illustration)
- 3 numbered form cues, "Common mistake" row, muscles worked chips
- Close
States: loading skeleton · error "Couldn't load tips" (sheet still dismissible)

### 09-Settings
- TopBar "Settings"
- Rows: Units · Program · Default rest time · Reminders · Export data · About
- BottomNav
States: loading n/a · error per action → snackbar

## Self-check
- One primary action per screen ✓ · core action 1–2 taps ✓ · big ✓ targets (56dp) for sweaty, one-handed use ✓
- Bottom nav 4 items, hidden during workout ✓ (L-001)
- Every screen lists empty/loading/error ✓
- Open question: should rest days allow a free "custom workout"? (assumed: "Train anyway" repeats the next scheduled workout)

# Wireframes (grey boxes, 360×800)

### 01-Onboarding
- Skip (top-right text button)
- Illustration slot (~45% height)
- Headline "Log work expenses in seconds" + 1 line body
- Currency chips row (PKR · USD · EUR · GBP · More…)
- Primary button "Get started" (full width, bottom) + step dots
States: empty n/a · loading n/a · error: "Couldn't save settings" inline + Retry

### 02-Home
- TopBar: "November" with ◀ ▶ month switch, action: search
- Hero card: month total (large), "Billable 68% · Personal 32%" bar, "↑ 12% vs Oct"
- Section header "Recent" + "See all"
- List: 5 expense rows (category icon · title · client · amount)
- FAB "+ Add expense" (extended, bottom-right, above nav)
- BottomNav: Home · Expenses · Clients · Settings
States: empty (hero shows 0 + "Add your first expense" CTA) · loading (skeleton hero + 3 rows) · error (cached data + banner Retry)

### 03-AddExpense
- TopBar: close ✕, title "New expense"
- Amount field (very large, numeric keyboard, auto-focus)
- Category chips (horizontal scroll, last used first)
- Client chip row ("No client" · recent clients · "+ New")
- Billable switch (default ON when client set)
- Date row (default Today) · Note row ("Add note") · Receipt row (camera/gallery)
- Save button pinned above keyboard (disabled until amount > 0)
States: empty = default form · loading = Save shows progress · error = field errors under fields; save failure snackbar + Retry

### 04-Expenses
- TopBar "Expenses" + search icon
- Filter chips: Client ▾ · Category ▾ · Billable · This month ▾
- Grouped list by date with sticky headers (row = icon · title · client · amount)
- FAB "+"
- BottomNav
States: empty ("No expenses yet" + CTA) · empty search ("No results for '…'" + Clear filters) · loading (8 skeleton rows) · error (full-area + Retry)

### 05-ExpenseDetail
- TopBar: back, edit, overflow (Delete)
- Amount (large) + category + billable badge
- Receipt preview (tap → full screen)
- Fields group: Client, Date, Note
- (No bottom primary action — edit is in TopBar)
States: loading (skeleton) · error ("Couldn't load expense" + Retry) · missing receipt = "Add receipt" slot

### 06-Clients
- TopBar "Clients"
- List rows: avatar initials · client name · "Rs 12,400 unbilled" (trailing)
- FAB "+ Add client"
- BottomNav
States: empty ("Add clients to track billable expenses" + CTA) · loading · error

### 07-ClientDetail
- TopBar: back, client name, overflow (Edit, Delete)
- Hero: unbilled total + count of expenses
- Segmented button: Unbilled · Billed
- Expense list
- Bottom primary button "Export for invoice"
States: empty ("No unbilled expenses") · loading · error · export failure snackbar

### 08-Settings
- TopBar "Settings"
- Rows: Currency · Categories · Export all data · Backup · About
- BottomNav
States: loading n/a · error per row action (snackbar)

## Self-check
- One primary action per screen ✓ · core action ≤ 3 taps ✓ · bottom nav 4 items ✓ (L-001)
- Every screen lists empty/loading/error ✓
- Open question for user: should income tracking be in v1? (assumed no)

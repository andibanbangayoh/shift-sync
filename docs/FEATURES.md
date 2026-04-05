# Feature Details

Detailed documentation of ShiftSync's major feature areas.

---

## Role-Based Dashboard

### Admin Dashboard

- 4 stat cards: On Duty Now, Overtime Alerts, Pending Swaps, Unassigned Shifts
- Live On Duty panel with staff names, locations, shift end times
- Overtime progress bars (staff at ≥35h toward 40h limit)
- Upcoming Shifts with headcount badges — green = full, orange = open slots
- Recent Notifications with real-time push via WebSocket

### Manager Dashboard

- Same layout, scoped to managed locations only
- My Locations panel showing assigned restaurants with timezones

### Staff Dashboard

- Upcoming Shifts (own shifts only), Hours This Week vs desired target
- Pending Swaps count, Certified Locations with timezone info
- My Skills badges, personal notifications

---

## Schedule Page

### Weekly Calendar

- 7-day column grid (Mon–Sun) with week navigation and "Today" highlight
- **Drag-and-drop** shift cards between days (reschedule with optimistic locking)
- Click empty day to create a new shift pre-filled with that date
- Click shift card to view details, assign/unassign staff, publish, or delete
- **Recurring shifts** — create daily or weekly repeating shifts in one action
- **Location filter** — Admin sees all, Managers see their locations, Staff sees published only

### 48-Hour Edit Cutoff

- Published shifts starting within 48 hours are locked from editing
- Drag handle hidden, assign/unassign/publish/delete buttons disabled
- Amber notice card explains the lockout reason

### What-If Impact Preview

- When selecting a staff member for assignment, the impact panel shows:
  - Current → projected daily and weekly hours
  - Overtime hours and estimated cost impact
  - Warning indicators for constraint violations
  - Whether the assignment would be blocked

---

## Shift Swapping & Coverage

### Workflow

1. Staff A requests a swap (with Staff B) or drop
2. Staff B accepts/rejects the swap
3. Manager approves/rejects the final change
4. All parties notified at each step via WebSocket

### Edge Cases Handled

- **Auto-cancel on shift edit:** Pending swaps are automatically cancelled when the manager edits the shift's time or date, with notifications sent to all parties
- **3-request limit:** Staff cannot have more than 3 pending swap/drop requests at once; the UI shows a "Your Pending: X / 3" indicator
- **Drop expiry:** Drop requests expire 24 hours before the shift starts

---

## Real-Time Features

- **Socket.IO WebSocket gateway** with JWT-authenticated connections
- Per-user rooms — `sendToUser(userId, notification)` delivers targeted push
- Schedule publishes, swap requests, and assignment changes trigger instant notifications
- Notification bell badge updates in real-time without page refresh

---

## Timezone Handling

- All shift times stored as UTC `DateTime` in PostgreSQL
- Display formatting applies the location's IANA timezone at the UI layer
- Shift cards show times in the shift's location timezone (e.g., "2:00 PM" at Downtown NYC = Eastern)
- Overnight shifts (11pm–3am) handled as a single shift crossing midnight
- Staff availability uses **clock time** — "9am–5pm" applies as local time at each location
- DST transitions handled by JavaScript `Date` arithmetic

---

## Audit Trail

- Every create, update, delete, assign, unassign, and swap action is logged
- Before/after state stored as JSONB snapshots for full diff visibility
- Filterable by action type, user, date range
- CSV export available (Admin only) for compliance reporting
- Auto-cancel events logged as `SWAP_AUTO_CANCELLED` with reason

---

## Analytics & Fairness

- **Hours Distribution** — Bar chart showing total hours per staff member over a selected period
- **Premium Shift Tracking** — Friday/Saturday evening shifts tracked separately with fairness scores
- **Desired vs. Actual** — Compare each staff member's scheduled hours to their desired weekly hours
- **Overtime Monitoring** — Dashboard widget shows all staff approaching the 40h limit with visual progress bars

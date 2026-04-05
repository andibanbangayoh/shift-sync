# Design Decisions

This document records every design decision made where the requirements were ambiguous, unspecified, or required a judgment call. Grouped by domain.

---

## Timezone & Calendar

### Clock-Time Availability

The requirements state staff set availability as "9am–5pm" but don't specify what this means for staff certified at locations in different timezones.

**Resolution:** Availability is stored as clock time and interpreted relative to the shift's location timezone. A staff member available "9am–5pm" is available 9am–5pm Eastern at NYC and 9am–5pm Pacific at LA — these are different absolute windows. The `assignStaff()` method converts shift UTC timestamps to the location's IANA timezone via `Intl.DateTimeFormat`, extracts local HH:MM, and compares against stored windows.

This matches the user mental model: people think "I'm available mornings," not "I'm available 14:00–22:00 UTC." It also handles DST transitions automatically since we use IANA timezone identifiers rather than fixed UTC offsets.

The alternative — storing availability in UTC or per-location — was rejected because it would require staff to manage separate availability for each location and manually update windows during DST transitions.

### One Timezone Per Location

The requirements ask how to handle a location spanning a timezone boundary. Each location stores exactly one IANA timezone string. For edge cases (restaurant near a state line), the solution is to create two locations in the system. Staff can be certified for both, and schedules are managed independently. A shift must have one unambiguous start time.

### Overnight Shifts

Shifts like 11pm–3am use full UTC `DateTime` values for both `startTime` and `endTime`. Since `endTime` is always a later UTC instant than `startTime`, there's no special midnight-crossing logic needed. Duration is `(endTime - startTime) / 3600000`, overlap detection is a simple UTC range comparison, and rest period is the gap between one shift's `endTime` and the next shift's `startTime`.

---

## Scheduling Constraints

### Soft vs. Hard Classification

The requirements distinguish between warnings, blocks, and overridable constraints. The implementation maps these to three tiers:

**Hard blocks** — Double-booking, 10h rest, skill match, location certification, availability windows, 40h/week, 12h/day. Assignment is rejected with a message explaining the specific violation.

**Warnings** — 8h daily, 35h weekly, 6th consecutive day. Assignment proceeds but returns a warning banner. The UI displays these prominently so the manager makes a conscious decision.

**Overridable** — 7th consecutive day only. Blocked unless the client provides an `overrideReason` string. The reason is recorded in the audit log, creating an accountability trail for labor law compliance.

### Consecutive Day Counting

The requirements ask whether a 1-hour shift counts the same as an 11-hour shift for consecutive-day tracking.

**Resolution:** Yes. The system builds a `Set` of UTC day-of-week values from all assignments in the Mon–Sun week, counts unique days worked, and triggers at 6 (warning) or 7 (block). Duration is irrelevant. This aligns with California IWC orders which define "day of work" as any day with work performed regardless of length. It also eliminates edge-case ambiguity ("does 2.5 hours count?").

### 48-Hour Edit Cutoff

The cutoff is computed dynamically as `startTime - 48 hours` rather than stored as a database field (though `editCutoffAt` exists in the schema, it's unused). Enforcement happens at two levels: the backend throws `BadRequestException` in both `updateShift()` and `moveShift()`, and the frontend computes `isWithin48h` to disable edit controls and show an explanatory notice. Only `PUBLISHED` shifts are affected — drafts can always be edited.

### Alternative Staff Suggestions

Rather than returning alternatives alongside a constraint error, the `GET /shifts/eligible-staff` endpoint serves as the suggestion mechanism. It returns all candidates for a location + skill, each marked with `available: true/false` and a human-readable `conflict` string (e.g., "Available only 09:00–14:00", "Overlapping shift at Midtown NYC", "Needs 10h rest between shifts"). Results are sorted available-first, so the UI naturally shows viable alternatives at the top.

---

## Availability System

### Exception-First Priority

When checking availability during assignment, the system follows a strict hierarchy:

1. **Check `AvailabilityException` for the exact date first.** If `isAvailable = false` → hard block. If `isAvailable = true` with time windows → custom window for that date. If `isAvailable = true` without times → all day available, skip recurring check.
2. **Only if no exception exists**, fall back to recurring `Availability` by day-of-week.

This ensures one-off overrides always win ("I'm available this Monday even though I'm usually off").

### Open-by-Default

If a staff member has no recurring availability defined for a given day of the week, they are treated as unrestricted (available). The system is opt-in constraining. This prevents the onboarding problem of "new staff can't be assigned until they've configured all 7 days."

---

## Data Integrity

### Historical Preservation (De-Certification)

The requirements ask what happens to historical data when a staff member is de-certified.

**Resolution:** `StaffLocationCertification` uses a `revokedAt` timestamp (soft delete). Past `ShiftAssignment` records are completely untouched — no cascade delete, no status change. All certification checks filter by `revokedAt: null` to block future assignments while preserving history. Re-certification upserts the same record with `revokedAt: null`.

This ensures audit compliance (labor law requires shift records to be retained), payroll integrity (past shifts stay for payment processing), and reporting accuracy (overtime/fairness calculations need complete history).

### Concurrent Operation Safety

The requirements specify that two managers assigning the same staff simultaneously should result in one seeing a conflict. Four layers handle this:

1. **Optimistic locking** — `Shift` and `ShiftAssignment` both have a `version` column. Updates compare and increment atomically. Stale version → `ConflictException`.
2. **Prisma interactive transaction** — The entire `assignStaff()` flow (overlap check, rest check, hours check, create) runs inside `prisma.$transaction()`, serializing concurrent operations.
3. **Database unique constraint** — `@@unique([shiftId, userId])` makes double-assignment impossible at the DB level.
4. **WebSocket push** — Socket.IO emits the updated state, so the second manager's UI reflects the change immediately.

### Soft Deletes

Users have `deletedAt DateTime?`, certifications have `revokedAt DateTime?`. No data is permanently destroyed. The JWT strategy re-validates user existence and `isActive` on every request, so deactivation takes effect within 15 minutes (access token lifetime).

---

## Swap & Coverage Workflow

### Auto-Cancel on Shift Edit

The requirements ask what happens when a shift is edited after a swap is approved but before it occurs.

**Resolution:** Any pending or accepted swap is auto-cancelled when the shift's `startTime`, `endTime`, or `date` changes. The swap status becomes `CANCELLED` with reason "Shift was modified by management." Both the requestor and target receive WebSocket notifications, and the cancellation is logged in the audit trail as `SWAP_AUTO_CANCELLED`. Already-completed or already-rejected swaps are not affected.

The rationale is that a swap request for "Tuesday 9am–5pm" is invalid if the manager changes the shift to "Tuesday 2pm–10pm." Auto-cancelling forces re-evaluation under the new parameters.

### Drop Expiry Enforcement

Drop requests expire 24 hours before the shift starts, enforced at three levels:

1. **At creation** — If the shift starts within 24 hours, creation is blocked with `BadRequestException`.
2. **At response/resolve** — Before processing any action, the system checks `expiresAt <= now()` and auto-expires if needed.
3. **Lazy batch** — Every time the swap list or stats are queried, `expireStaleRequests()` bulk-updates all stale records to `EXPIRED` status.

This three-layer approach avoids the need for background cron jobs while ensuring no expired request is ever actionable.

### Swap Partner Eligibility

The coworker endpoint returns staff who have active location certification and no overlapping assignment. It intentionally **does not** filter by skill match, availability windows, or overtime limits. These are left to manager discretion during approval. The reasoning is that managers have context the system doesn't ("I know Alex can cover grill even though they're officially listed as a server"). Hard constraints are still enforced when the swap is actually executed.

---

## Authentication & Security

### JWT Refresh Token Rotation

Access tokens last 15 minutes (signed with `JWT_SECRET`). Refresh tokens last 7 days (signed with separate `JWT_REFRESH_SECRET`). Refresh tokens are SHA-256 hashed before storage — the database never contains a usable token. On each refresh, the old token is revoked (`revokedAt = now()`) and a new pair is issued. This is single-use rotation: replaying a consumed token fails.

Validation is three-layered: (1) verify JWT signature and expiry, (2) look up the token hash in DB and confirm it's not revoked or expired, (3) confirm the userId matches the JWT `sub` claim to prevent cross-user token theft.

### WebSocket Authentication

Socket.IO connections are authenticated using the same `JWT_SECRET`. The gateway accepts tokens via the `auth` object or `Authorization` header. Invalid or missing tokens cause immediate disconnect. Each authenticated connection joins a `user:{id}` room.

---

## Scheduling Features

### Recurring Shifts

Recurring shifts (daily or weekly) create independent shift records — each is a standalone entity with its own audit trail. There is no "series" concept. The maximum is 84 occurrences (12 weeks of daily shifts). This avoids the complexity of bulk-edit semantics ("edit this shift only vs. all future") and partial publishing across a series.

### Desired Hours vs. Availability

The requirements leave the interaction between "desired hours" and "availability windows" unspecified.

**Resolution:** Availability windows are hard constraints — the system blocks assignments outside them. Desired weekly hours (`desiredWeeklyHours`) are soft targets used only in fairness analytics. They appear in the analytics dashboard as over/under-scheduling indicators but never block an assignment. This gives managers flexibility (staff wanting extra hours aren't artificially capped) while surfacing systematic patterns over time.

---

## Notification System

All 15 notification types are persisted in the `Notification` table and delivered via Socket.IO WebSocket push to per-user rooms. Read/unread tracking with a bell badge in the UI. Email delivery is simulated — the system creates records and logs them, but doesn't send actual emails. Production would swap in SendGrid or AWS SES with no architecture changes needed.

The frontend uses edge middleware to check for the `accessToken` cookie presence (not validity — that's too expensive at the edge). Invalid tokens are caught by API calls returning 401, which triggers the frontend logout flow.

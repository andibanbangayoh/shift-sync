# ShiftSync

> Multi-location workforce scheduling platform for Coastal Eats — a restaurant group spanning 4 locations and 2 US timezones.

Handles shift creation, staff assignment with 8-constraint enforcement, swap/drop workflows, real-time notifications, overtime compliance, and fairness analytics. Built as a monorepo with NestJS (API) and Next.js (UI).

**Live Demo:**

[![Watch Demo](docs/shiftsync-demo.png)](https://www.loom.com/share/c7c5e48ac9c14cd1beed4246d188a5f4)

---

## Getting Started

Log in with any account below. **Password for all accounts:** `Password123!`

> The login page also has **demo account pills** — click any pill to auto-fill credentials.

**Admin** — `corporate@coastaleats.com` — Full access, all 4 locations

**Managers:**

- `james.wilson@coastaleats.com` — Downtown NYC + Midtown NYC
- `sarah.chen@coastaleats.com` — Westside LA + Marina LA

**Staff (selected):**

- `mike.johnson@coastaleats.com` — Bartender/Server, certified at Downtown + Midtown
- `emily.davis@coastaleats.com` — Server/Host, Downtown only
- `carlos.garcia@coastaleats.com` — Line Cook/Prep, cross-timezone (Midtown + Westside)

12 more staff accounts are seeded — see all of them on the login page.

**Pages:** Dashboard (`/`), Schedule (`/schedule`), Swaps (`/swaps`), Staff (`/staff`), Analytics (`/analytics`), Audit (`/audit`), Settings (`/settings`)

---

## Architecture

```
┌─────────────────┐       WebSocket (Socket.IO)       ┌──────────────────┐
│   Next.js 14    │◄────────────────────────────────►  │    NestJS 10     │
│   App Router    │         REST API (/api)            │  Modular Backend │
│                 │◄────────────────────────────────►  │                  │
│  Redux Toolkit  │                                    │  Prisma 5 ORM   │
│  RTK Query      │                                    │  Passport + JWT  │
│  shadcn/ui      │                                    │  class-validator │
│  Socket.IO      │                                    │  Socket.IO GW    │
└─────────────────┘                                    └────────┬─────────┘
                                                                │
                                                       ┌────────▼─────────┐
                                                       │   PostgreSQL     │
                                                       │   (Neon / Docker)│
                                                       │   15 models      │
                                                       │   6 enums        │
                                                       └──────────────────┘
```

**Monorepo:** pnpm workspaces — `apps/backend` (NestJS, port 8000) + `apps/frontend` (Next.js, port 3000)

**Auth flow:** Access token (15m, `JWT_SECRET`) + refresh token (7d, `JWT_REFRESH_SECRET`, SHA-256 hashed in DB). Single-use rotation on every refresh. Three-layer validation: JWT signature → DB lookup → userId match.

**Real-time:** Socket.IO gateway with JWT-authenticated connections. Per-user rooms (`user:{id}`) for targeted push. Schedule publishes, swaps, and assignments all trigger instant notifications.

**Database:** 15 Prisma models across 4 domains — Auth (`User`, `RefreshToken`), Organization (`Location`, `Skill`, `ManagerLocation`, `StaffSkill`, `StaffLocationCertification`), Scheduling (`Shift`, `ShiftAssignment`, `Availability`, `AvailabilityException`, `SwapRequest`), System (`Notification`, `AuditLog`).

---

## What's Implemented

**Scheduling** — Weekly calendar with drag-and-drop. Create one-off or recurring shifts (daily/weekly, up to 84 occurrences). Multi-step wizard: location → skill → time → headcount. Publish/unpublish with 48h cutoff. What-if impact preview before assignment.

**8 Constraints** — Hard-enforced at the API level with clear violation messages and alternative staff suggestions via the eligible-staff endpoint:

1. No double-booking (cross-location overlap detection)
2. 10-hour minimum rest between shifts
3. Skill requirement matching
4. Location certification check (soft-revoke aware)
5. Availability window enforcement (exception-first, open-by-default)
6. 40h weekly cap (warning at 35h)
7. 12h daily cap (warning at 8h)
8. 7th consecutive day block (overridable with documented reason)

**Swaps & Coverage** — Staff request swaps or drops → counterparty accepts → manager approves. 3 pending request cap. Drop expiry 24h before shift (three-layer enforcement). Auto-cancel on shift edit with notifications.

**Analytics** — Hours distribution per staff, premium shift (Fri/Sat evening) fairness scores, desired vs. actual hours comparison. Admin/Manager scoped.

**Audit Trail** — Every change logged with before/after JSONB snapshots. Filterable by action, user, date. CSV export (Admin).

**Notifications** — 15 types persisted in DB. WebSocket push to per-user rooms. Bell badge with unread count. Notification preferences (in-app toggle, email simulated).

**Timezone** — All storage in UTC. Display in location's IANA timezone. Overnight shifts (11pm–3am) handled natively via UTC DateTime range. Availability is clock-time — "9am–5pm" means local at each location.

---

## Handling the Evaluation Scenarios

**Coverage emergency (Sunday Night Chaos):** Open shift → unassign caller → eligible staff list shows qualified, available replacements with real-time constraint validation → assign in 2-3 clicks → replacement gets instant WebSocket notification.

**Overtime trap (52-Hour Week):** Dashboard overtime widget shows staff at ≥35h with progress bars. What-If panel previews projected hours, cost, and warnings before confirming assignment. 40h+ blocked with clear error.

**Timezone tangle (Multi-TZ Availability):** "9am–5pm" is clock-time — resolved as 9am–5pm Eastern at NYC, 9am–5pm Pacific at LA. Constraint engine converts shift UTC to location timezone before checking.

**Race condition (Simultaneous Assignment):** `@@unique([shiftId, userId])` at DB level + `$transaction` serialization + optimistic locking (`version` column). Second manager sees conflict error immediately; WebSocket pushes updated state.

**Fairness complaint (Saturday Nights):** Analytics page shows hours distribution + premium shift tracking + fairness scores. Compare actual vs. desired hours over any period.

**Regret swap:** Staff A cancels pending swap → original assignment unchanged → Staff B and manager get `SWAP_CANCELLED` notification. 3-request limit frees a slot.

---

## Constraint Enforcement Details

| Constraint     | Classification        | Trigger                          | System Response                                               |
| -------------- | --------------------- | -------------------------------- | ------------------------------------------------------------- |
| Double-booking | Hard block            | Overlapping times, any location  | Assignment rejected; shows conflicting shift details          |
| 10h rest       | Hard block            | < 10h gap between shifts         | Blocked; shows when rest period ends                          |
| Skill mismatch | Hard block            | Staff lacks required skill       | Blocked; eligible staff endpoint shows qualified alternatives |
| Location cert  | Hard block            | No active certification          | Blocked; checks `revokedAt: null`                             |
| Availability   | Hard block            | Outside availability window      | Blocked; shows staff's available hours for that day           |
| Weekly 40h     | Hard block (35h warn) | Would exceed 40h in Mon–Sun week | Warning banner at 35h; hard block at 40h+                     |
| Daily 12h      | Hard block (8h warn)  | Would exceed 12h in one day      | Warning at 8h; hard block at 12h+                             |
| 7th day        | Override              | 7th unique day worked in week    | Blocked unless `overrideReason` provided; logged in audit     |

---

## Testing

132 tests across 7 files — all passing:

```
 auth.service.spec.ts  — 14 unit tests  (login, tokens, refresh, logout)
 auth.e2e.spec.ts      — 19 E2E tests   (all auth endpoints + error cases)
 dashboard.e2e.spec.ts — 10 E2E tests   (role-scoped stats)
 shifts.e2e.spec.ts    — 29 E2E tests   (CRUD, assignments, constraints, drag-drop)
 swaps.e2e.spec.ts     — 22 E2E tests   (full lifecycle + edge cases)
 users.e2e.spec.ts     — 25 E2E tests   (staff CRUD, skills, certifications)
 audit.e2e.spec.ts     — 13 E2E tests   (logging, filtering, role access)
```

```bash
pnpm test             # from root
cd apps/backend && npm test  # backend only
```

---

## API Overview

48 endpoints across 7 controllers — full tables in [docs/API_REFERENCE.md](docs/API_REFERENCE.md).

| Controller    | Count | Scope                                                          |
| ------------- | ----- | -------------------------------------------------------------- |
| Auth          | 12    | Login, JWT rotation, profile, availability, skills, exceptions |
| Shifts        | 11    | CRUD, publish, assign, move, eligible-staff, what-if           |
| Swaps         | 7     | Request, respond, resolve, cancel, stats, coworkers            |
| Users         | 10    | CRUD, skills, certifications, availability                     |
| Dashboard     | 2     | Stats, analytics                                               |
| Notifications | 4     | List, unread count, mark read                                  |
| Audit         | 2     | Logs, CSV export                                               |

---

## Design Decisions

18 documented decisions resolving every ambiguity in the requirements — full writeup in [docs/DESIGN_DECISIONS.md](docs/DESIGN_DECISIONS.md).

**Ambiguity resolutions (from the requirements "Intentional Ambiguities" section):**

- **De-certification history** — Soft-revoke via `revokedAt` timestamp. All past assignments preserved for audit/payroll. Re-certification restores the same record.
- **Desired hours vs. availability** — Availability = hard constraint (blocks assignment). Desired hours = soft target (fairness analytics only, never blocks).
- **Consecutive day counting** — Any shift, any duration, counts as a worked day. Aligns with California IWC "day of work" definition.
- **Swap + shift edit conflict** — Pending/accepted swaps auto-cancelled when shift time/date changes. All parties notified. Audit logged as `SWAP_AUTO_CANCELLED`.
- **Timezone boundary locations** — One IANA timezone per location. Near a state line? Create two locations; staff can be certified for both.

**Technical decisions:**

- **Availability checking** — Exceptions override recurring rules (exception-first). No availability set = unrestricted (open-by-default).
- **Overnight shifts** — Full UTC DateTime columns for both start and end. No special midnight logic needed.
- **48h cutoff** — Computed dynamically (`startTime - 48h`), not stored. Enforced in both backend (throws) and frontend (disables controls).
- **Concurrent safety** — Four layers: optimistic locking (version column) + Prisma `$transaction` + DB unique constraints + WebSocket push.
- **JWT security** — Refresh tokens SHA-256 hashed in DB. Single-use rotation. Dual signing secrets. User re-validated from DB on every request.
- **Alternative suggestions** — Eligible-staff endpoint returns all candidates sorted available-first with structured conflict reasons (acts as the suggestion mechanism).
- **Drop expiry** — Three-layer enforcement: blocked at creation if <24h, checked at response, lazy batch expiry on list queries.
- **Recurring shifts** — Each occurrence is independent (no series group). Simplifies editing — no "this shift only vs. all future" complexity.
- **Swap partner matching** — Coworker endpoint checks location cert + no time conflict only. Skill/overtime deferred to manager approval.

---

## Seed Data

Realistic Coastal Eats scenario pre-built:

- 1 admin, 2 managers, 12 staff — varied skills, availability, desired hours (20h–40h)
- 4 locations: Downtown NYC, Midtown NYC (Eastern) / Westside LA, Marina LA (Pacific)
- 3 cross-timezone staff (certified NYC + LA)
- Past-week shifts seeding some staff at 36h+ (triggers overtime warnings)
- Active in-progress shifts (populates "on-duty now" dashboard)
- Pre-created swap/drop requests demonstrating the workflow pipeline

---

## Local Development

**Prerequisites:** Node.js 20+, pnpm 9+, PostgreSQL (Docker or Neon)

```bash
git clone https://github.com/enochkambale/shift-sync.git
cd shift-sync && pnpm install
```

**Environment:**

```bash
# apps/backend/.env
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000

# apps/frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**Database:**

```bash
cd apps/backend
npx prisma db push && npx prisma db seed
```

**Run:**

```bash
pnpm dev                # both apps
pnpm dev:backend        # API only (localhost:8000)
pnpm dev:frontend       # UI only (localhost:3000)
docker-compose up --build  # full stack via Docker
```

---

## Known Limitations

- Email notifications simulated (DB records only — production would use SendGrid/SES)
- UI is responsive but not mobile-optimized
- Schedule view optimized for weekly ranges, not year-long queries
- Requires active internet connection (no offline mode)

---

## Repository Layout

```
shift-sync/
├── apps/
│   ├── backend/                  # NestJS API
│   │   ├── src/modules/
│   │   │   ├── auth/             # JWT, profile, availability, skills
│   │   │   ├── shifts/           # CRUD, assignments, constraints
│   │   │   ├── swaps/            # Swap/drop lifecycle
│   │   │   ├── users/            # Staff management
│   │   │   ├── dashboard/        # Stats + analytics
│   │   │   ├── notifications/    # WebSocket gateway + CRUD
│   │   │   └── audit/            # Logging + CSV export
│   │   ├── common/               # Guards, decorators, filters
│   │   ├── prisma/               # DB service
│   │   └── test/                 # 132 tests
│   └── frontend/                 # Next.js UI
│       ├── app/(dashboard)/      # All protected pages
│       ├── store/api/            # RTK Query endpoints
│       └── components/ui/        # shadcn/ui library
├── docs/                         # Extended documentation
│   ├── DESIGN_DECISIONS.md       # 18 documented decisions
│   ├── API_REFERENCE.md          # Full endpoint tables
│   └── FEATURES.md               # Feature deep-dives
├── docker-compose.yml
└── README.md
```

---

Built by **Emmanuel Agba**

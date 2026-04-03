# ShiftSync — Multi-Location Staff Scheduling Platform

A full-stack workforce scheduling system built for **Coastal Eats**, a fictional restaurant group operating 4 locations across 2 US timezones. Built as a 72-hour assessment project for Priority Soft.

---

## Quick Start

### Test Credentials

**Password for all accounts:** `Password123!`

| Role    | Email                              | Access                               |
| ------- | ---------------------------------- | ------------------------------------ |
| Admin   | `corporate@coastaleats.com`        | All locations, full system oversight |
| Manager | `james.wilson@coastaleats.com`     | Downtown NYC + Midtown NYC           |
| Manager | `sarah.chen@coastaleats.com`       | Westside LA + Marina LA              |
| Staff   | `mike.johnson@coastaleats.com`     | Bartender/Server — Downtown, Midtown |
| Staff   | `emily.davis@coastaleats.com`      | Server/Host — Downtown               |
| Staff   | `carlos.garcia@coastaleats.com`    | Line Cook/Prep — Midtown, Westside   |
| Staff   | `jessica.martinez@coastaleats.com` | Bartender — Westside, Marina         |
| Staff   | `david.kim@coastaleats.com`        | Server/Host — Marina                 |

8 more staff accounts available — see seed data for full list.

---

## Feature Status

### Core Requirements

| Feature                     | Status         | Notes                                                    |
| --------------------------- | -------------- | -------------------------------------------------------- |
| User Roles & Permissions    | ✅ Complete    | Admin, Manager (multi-location), Staff                   |
| JWT Authentication          | ✅ Complete    | Access + refresh token rotation                          |
| Role-Based Dashboard        | ✅ Complete    | Separate views for Admin, Manager, Staff with live data  |
| On Duty Now (live)          | ✅ Complete    | Active shifts with pulsing live indicator                |
| Overtime Tracking           | ✅ Complete    | Alerts at ≥35 h/week with progress bars                  |
| Unassigned Shift Detection  | ✅ Complete    | Published shifts where `assignments < headcount`         |
| Upcoming Shifts (next 24 h) | ✅ Complete    | With assignee count badges and location/skill info       |
| Notification Center         | ✅ Complete    | Per-user, color-coded by type, unread count              |
| Shift Swap / Drop Requests  | 🚧 In Progress | Pending swap count tracked; approval workflow UI pending |
| Shift Scheduling (CRUD)     | ✅ Complete    | Weekly calendar with drag-and-drop, role-scoped views    |
| Fairness Analytics          | 🚧 In Progress | Backend data available; dashboard view pending           |
| Audit Trail                 | 🚧 In Progress | Schema defined; logging hooks pending                    |

### Constraints Planned

1. No double-booking — same person, overlapping times, across locations
2. 10-hour minimum rest between shifts
3. Skill matching — shifts require specific skills
4. Location certification — staff work only at certified locations
5. Availability windows — recurring + one-off exceptions
6. 40-hour weekly limit — warning at 35 h
7. 12-hour daily shift cap
8. 7th consecutive day requires manager override

---

## Technology Stack

### Backend (`apps/backend` — port `8000`)

| Layer      | Technology                                   |
| ---------- | -------------------------------------------- |
| Framework  | NestJS 10 (TypeScript, modular architecture) |
| ORM        | Prisma 5 with PostgreSQL                     |
| Auth       | Passport.js + JWT (access + refresh tokens)  |
| Validation | class-validator + class-transformer          |
| Testing    | Vitest + Supertest (unit + E2E)              |

### Frontend (`apps/frontend` — port `3000`)

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Framework | Next.js 14 (App Router, TypeScript) |
| State     | Redux Toolkit + RTK Query           |
| UI        | Tailwind CSS + shadcn/ui            |
| Forms     | React Hook Form + Zod               |
| Icons     | Lucide React                        |

### Infrastructure

| Layer      | Technology                |
| ---------- | ------------------------- |
| Database   | PostgreSQL 16 (Docker)    |
| Monorepo   | pnpm workspaces           |
| Runner     | concurrently (dev server) |
| Containers | Docker + docker-compose   |

---

## Project Structure

```
shift-sync/
├── apps/
│   ├── backend/                     # NestJS API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/            # Login, refresh, JWT strategy
│   │   │   │   ├── dashboard/       # GET /api/dashboard/stats (role-scoped)
│   │   │   │   ├── shifts/          # Shift CRUD, assignments, constraints
│   │   │   │   └── users/           # User profile & management
│   │   │   ├── common/              # Guards, decorators, interceptors
│   │   │   └── prisma/              # Prisma service
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Database schema (13 models)
│   │   │   └── seed.ts              # Realistic test data
│   │   └── test/
│   │       ├── auth/                # Auth unit + E2E tests
│   │       ├── dashboard/           # Dashboard E2E tests
│   │       └── helpers/             # Prisma mock, test utilities
│   └── frontend/                    # Next.js UI
│       ├── app/
│       │   ├── (auth)/              # Login page
│       │   └── (dashboard)/         # Protected dashboard shell
│       │       ├── _components/     # Role-specific dashboard views + widgets
│       │       └── schedule/        # Weekly calendar page + shift dialogs
│       ├── store/
│       │   ├── api/                 # RTK Query endpoints (auth, dashboard, shifts)
│       │   └── slices/              # Redux state (auth slice)
│       └── components/
│           └── ui/                  # shadcn/ui component library
└── docker-compose.yml               # PostgreSQL + full stack containers
```

---

## Database Schema

**13 models across 3 domains:**

**Auth & Users**

- `User` — authentication, role, desired weekly hours
- `RefreshToken` — token rotation with upsert-safe uniqueness

**Scheduling**

- `Location` — 4 Coastal Eats locations with IANA timezones
- `Skill` — bartender, server, line_cook, host, prep_cook, dishwasher
- `Shift` — date, start/end time (UTC), headcount, status (DRAFT/PUBLISHED/CANCELLED)
- `ShiftAssignment` — staff ↔ shift join with status (ASSIGNED/CONFIRMED/CANCELLED)
- `ManagerLocation` — which managers oversee which locations
- `StaffSkill` — which skills each staff member holds
- `StaffLocationCertification` — which locations each staff member is certified for

**Scheduling Policies**

- `Availability` — recurring weekly windows (e.g., Mon–Fri 9am–5pm)
- `AvailabilityException` — one-off date overrides
- `SwapRequest` — SWAP or DROP workflow (PENDING → ACCEPTED → MANAGER_APPROVED)
- `Notification` — 15 notification types with read/unread tracking
- `AuditLog` — before/after change history for all mutations

---

## API Reference

### Auth

| Method | Endpoint            | Description                                   | Auth   |
| ------ | ------------------- | --------------------------------------------- | ------ |
| POST   | `/api/auth/login`   | Returns `accessToken` + `refreshToken` + user | None   |
| POST   | `/api/auth/refresh` | Rotates access token using refresh token      | None   |
| POST   | `/api/auth/logout`  | Invalidates refresh token                     | Bearer |
| GET    | `/api/auth/me`      | Returns current authenticated user            | Bearer |

### Dashboard

| Method | Endpoint               | Description                        | Auth   |
| ------ | ---------------------- | ---------------------------------- | ------ |
| GET    | `/api/dashboard/stats` | Returns role-scoped dashboard data | Bearer |

### Shifts

| Method | Endpoint                           | Description                                  | Auth   | Roles         |
| ------ | ---------------------------------- | -------------------------------------------- | ------ | ------------- |
| GET    | `/api/shifts?weekStart=&weekEnd=`  | List shifts for the week (location-filtered) | Bearer | All           |
| GET    | `/api/shifts/locations`            | Locations accessible to the current user     | Bearer | All           |
| GET    | `/api/shifts/skills`               | All available skills                         | Bearer | All           |
| GET    | `/api/shifts/eligible-staff`       | Staff eligible at a location (+ skill)       | Bearer | Admin/Manager |
| POST   | `/api/shifts`                      | Create a shift                               | Bearer | Admin/Manager |
| PATCH  | `/api/shifts/:id`                  | Update shift details / publish               | Bearer | Admin/Manager |
| PATCH  | `/api/shifts/:id/move`             | Move shift via drag-and-drop                 | Bearer | Admin/Manager |
| POST   | `/api/shifts/:id/assign`           | Assign staff to a shift                      | Bearer | Admin/Manager |
| DELETE | `/api/shifts/:id/assign/:assignId` | Remove a staff assignment                    | Bearer | Admin/Manager |
| DELETE | `/api/shifts/:id`                  | Delete a draft shift                         | Bearer | Admin/Manager |

**`GET /api/dashboard/stats` response shape:**

```ts
{
  onDutyNow: OnDutyItem[];         // shifts active right now with assigned staff
  todaysOnDutyCount: number;       // total assigned staff across today's shifts
  unassignedCount: number;         // published future shifts where assignments < headcount
  overtimeAlerts: OvertimeAlert[]; // staff at ≥35 h this week (empty for STAFF role)
  pendingSwaps: number;            // pending swap/drop requests
  upcomingShifts: UpcomingShift[]; // next 24 h shifts (own shifts only for STAFF)
  recentNotifications: Notification[]; // last 5 for the requesting user
  unreadNotificationCount: number;
  myHoursThisWeek: number;         // scheduled hours this week (STAFF only)
}
```

**Role scoping:**

- `ADMIN` → all locations
- `MANAGER` → filtered to their `managedLocationIds`
- `STAFF` → upcoming shifts filtered to own assignments; overtime alerts not returned

---

## Role-Based Dashboard

Each role gets a distinct dashboard view with live data from the API:

### Admin Dashboard

- 4 stat cards: On Duty Now (green), Overtime Alerts (amber), Pending Swaps (blue), Unassigned Shifts (purple)
- On Duty Now panel — live staff with gradient initials, location, skill, shift end time
- Overtime Alerts — progress bars showing hours vs the 40 h limit
- Upcoming Shifts — next 24 h with assignee count badge (green = full, orange = open slots)
- Recent Notifications — color-coded by type
- Quick Actions panel + system status summary

### Manager Dashboard

- Same 4 stat cards — scoped to their managed locations only
- On Duty Now, Overtime Alerts, Upcoming Shifts, Notifications
- My Locations panel — lists managed locations with address and timezone

### Staff Dashboard

- 4 stat cards: Upcoming Shifts (purple), Hours This Week vs target (blue), Pending Swaps (amber), Certified Locations (green)
- Upcoming Shifts — own shifts only, no team headcount shown
- Notifications — personal notifications only
- My Skills — skill badges
- Certified Locations — with timezone info

---

## Schedule Page

The `/schedule` route provides a weekly calendar grid for viewing and managing shifts.

### Weekly Calendar

- **7-day grid** (Mon–Sun) — shifts grouped by day column, no fixed time-slot rows
- **Week navigation** — previous/next week buttons + "Today" shortcut
- **Today column** highlighted with accent background and "Today" badge
- **Drag-and-drop** — drag a shift card to a different day column to reschedule (preserves original time, uses optimistic locking via `version` field)
- **Click empty day** to create a new shift pre-filled with that date
- **Click shift card** to view details, assign/unassign staff, publish, or delete
- **Recurring shifts** — create daily or weekly repeating shifts in one action (up to 84 daily / 12 weekly occurrences)

### Role-Specific Behaviour

| Role    | Locations Visible                       | Staff Visible                                   | Can Create / Edit | Can Assign Staff                                     |
| ------- | --------------------------------------- | ----------------------------------------------- | ----------------- | ---------------------------------------------------- |
| Admin   | All locations + "All Locations" filter  | All staff across all locations                  | Yes               | Any certified staff at the shift's location          |
| Manager | Only their managed locations            | Only staff certified at their managed locations | Yes               | Any staff certified at their location (cross-branch) |
| Staff   | Published shifts at certified locations | N/A                                             | No (read-only)    | No                                                   |

**Key rules:**

- A manager CAN assign a staff member from another branch, as long as that person is certified at the manager's location. They CANNOT create shifts at locations they don't manage.
- Managers can only query eligible staff for locations they manage — the `GET /api/shifts/eligible-staff` endpoint enforces this.
- Staff only see **published** shifts; draft and cancelled shifts are hidden from the staff calendar.
- Selecting a required skill filters the eligible staff list to only show users who hold that skill.

### Constraint Enforcement

The backend validates the following before any assignment or shift change:

1. **No double-booking** — prevents assigning someone to overlapping shifts across locations
2. **10-hour rest** — checks that the staff member has ≥10 hours between shift end and next shift start
3. **Skill match** — the staff member must hold the required skill for the shift
4. **Location certification** — the staff member must be certified at the shift's location
5. **Headcount limit** — cannot exceed the shift's required headcount
6. **Weekly 40-hour limit** — hard block if assignment would push staff past 40 h/week
7. **Weekly 35-hour warning** — assignment succeeds but returns an overtime warning banner
8. **Daily 12-hour cap** — hard block if total daily hours for a staff member exceed 12 h
9. **Daily 8-hour warning** — assignment succeeds but warns if daily hours exceed 8 h
10. **48-hour cutoff** — published shifts starting within 48 hours cannot be edited (admin override pending)
11. **Optimistic locking** — concurrent edits are detected via `version` mismatch → 409 Conflict

### Components

| Component           | Path                                           | Description                                                                  |
| ------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| Weekly Calendar     | `schedule/_components/weekly-calendar.tsx`     | Main grid with navigation, location filter, drag-and-drop                    |
| Shift Card          | `schedule/_components/shift-card.tsx`          | Draggable card with inline preview — time, skill, location, assignment count |
| Create Shift Dialog | `schedule/_components/create-shift-dialog.tsx` | Form to create shifts with eligible staff preview                            |
| Shift Detail Dialog | `schedule/_components/shift-detail-dialog.tsx` | View shift info, assign/unassign, publish/delete                             |

---

## Setup & Development

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Docker (for PostgreSQL)

### 1. Clone and install

```bash
git clone https://github.com/your-username/shift-sync.git
cd shift-sync
pnpm install
```

### 2. Configure environment

```bash
# Backend environment
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shiftsync?schema=public
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000
```

Frontend environment (`apps/frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 3. Start the database

```bash
docker-compose up -d postgres
```

### 4. Run migrations and seed

```bash
pnpm db:push     # Apply schema to database
pnpm db:seed     # Populate with realistic test data
```

The seed creates:

- 1 admin, 2 managers, 12 staff across 4 locations
- 6 skills with staff assignments
- Location certifications (including cross-timezone staff)
- Weekly availability for all staff
- Active shifts (on duty right now), past-week shifts triggering overtime alerts
- Upcoming shifts with partial assignments (unassigned slots visible)
- Pending swap requests
- Notifications for all user types

### 5. Start development servers

```bash
pnpm dev
```

This starts both apps concurrently:

- Backend: [http://localhost:8000](http://localhost:8000)
- Frontend: [http://localhost:3000](http://localhost:3000)

Or start individually:

```bash
pnpm dev:backend
pnpm dev:frontend
```

---

## Running Tests

```bash
# All tests (from root)
pnpm test

# From backend directory
cd apps/backend
npm test          # 43 tests: 14 unit + 29 E2E
npm run test:cov  # With coverage report
```

**Test suite breakdown:**

| File                                   | Type | Count | Coverage                                               |
| -------------------------------------- | ---- | ----- | ------------------------------------------------------ |
| `test/auth/auth.service.spec.ts`       | Unit | 14    | AuthService — login, token generation, refresh, logout |
| `test/auth/auth.e2e.spec.ts`           | E2E  | 19    | POST /login, /refresh, /logout, /me                    |
| `test/dashboard/dashboard.e2e.spec.ts` | E2E  | 10    | GET /dashboard/stats — all 3 roles + scoping           |

---

## Docker (Full Stack)

To run the entire stack in containers:

```bash
docker-compose up --build
```

Services:

- `postgres` — PostgreSQL 16 on port 5432
- `backend` — NestJS API on port 8000
- `frontend` — Next.js on port 3000

---

## Key Design Decisions

### Timezone storage

Shift times are stored as UTC `DateTime` in PostgreSQL. Display formatting applies the location's IANA timezone at the UI layer. This avoids DST edge cases at the database level while correctly rendering local times for each location.

### Staff availability

Availability windows use "clock time" — a staff member available "9am–5pm" means 9am–5pm local time at whichever location's shift they're being assigned to. This matches the mental model of staff setting their own availability without needing to think in UTC.

### JWT token rotation

Refresh tokens use `upsert` rather than `create` — this prevents unique constraint violations when the same JWT payload is generated within the same second (reproducible in fast test runs). The old token is replaced atomically.

### Role scoping at the service layer

All role-based data filtering happens inside `DashboardService.getStats()`, not in the controller or frontend. This means the frontend can call a single endpoint regardless of role — the backend returns only what that role is authorised to see.

### Historical data on de-certification

If a staff member is de-certified from a location, their historical `ShiftAssignment` records are preserved unchanged. Only future assignments at that location are blocked. This maintains audit integrity and labour law compliance.

### Consecutive day calculation

Any shift of any length counts as a worked day. A 1-hour opening shift on Sunday counts the same as an 11-hour Saturday close. This is the safest interpretation for labour compliance purposes.

---

## Evaluation Scenarios

### 1. Sunday Night Chaos (coverage emergency)

> A staff member calls out at 6pm for a 7pm shift.

The On Duty Now panel on the manager dashboard shows current shift coverage in real time. The Upcoming Shifts widget highlights the open slot (orange badge = headcount not met). From there the manager opens the assignment flow, which will validate skill match, location certification, availability, and rest period before confirming.

### 2. The Overtime Trap (52-hour week)

> A manager inadvertently schedules someone into overtime.

The Overtime Alerts card and widget show all staff at ≥35 h this week with a progress bar toward the 40 h threshold. Carlos Garcia and Ryan Taylor are pre-seeded into an overtime state so this is visible immediately after login.

### 3. The Timezone Tangle

> Staff certified at EST and PST locations sets "9am–5pm" availability.

Availability is stored as clock time. When assigning to Downtown NYC (America/New_York), "9am" means 9am Eastern. When assigning to Westside LA (America/Los_Angeles), "9am" means 9am Pacific. The constraint engine resolves each assignment to the shift location's timezone before checking availability.

### 4. Simultaneous Assignment (race condition)

> Two managers try to assign the same bartender at the same time.

`ShiftAssignment` has a `@@unique([shiftId, userId])` constraint at the database level. The second write will fail with a unique constraint error, which the API surfaces as a 409 conflict. The `version` field on both `Shift` and `ShiftAssignment` enables optimistic locking for concurrent edits to the same record.

### 5. The Fairness Complaint (Saturday night distribution)

> An employee claims they never get the desirable shifts.

The backend tracks all assignments with timestamps. The fairness analytics dashboard (in progress) will aggregate hours and premium-shift counts per staff member over a selected period, surfacing the distribution variance versus desired hours.

### 6. The Regret Swap (cancelling a pending swap)

> Staff A wants to cancel a swap before the manager approves.

Staff can cancel their own `PENDING` swap requests. The original `ShiftAssignment` record is untouched until `MANAGER_APPROVED`. All parties receive a `SWAP_CANCELLED` notification. The 3-concurrent-request limit is enforced at creation.

---

## Known Limitations

- **No real-time push yet** — dashboard data requires a manual refresh; WebSocket/SSE integration is planned
- **Shift CRUD UI** — weekly calendar with drag-and-drop is complete; availability window checking during assignment is not yet wired
- **Email notifications** — notification records are created in the database; external delivery (e.g., SendGrid) is not wired up
- **Fairness & audit UI** — data models and backend queries exist; frontend pages not yet built
- **No mobile optimisation** — the UI is responsive but not specifically designed for small screens

---

**Built by Enoch Kambale**

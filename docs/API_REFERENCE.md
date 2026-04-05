# API Reference

**40+ endpoints across 7 controllers.** All endpoints are prefixed with `/api`.

---

## Auth (`/api/auth`) — 12 endpoints

| Method | Endpoint                               | Description                            |
| ------ | -------------------------------------- | -------------------------------------- |
| POST   | `/auth/login`                          | Login, returns access + refresh tokens |
| POST   | `/auth/refresh`                        | Rotate access token                    |
| POST   | `/auth/logout`                         | Invalidate refresh token               |
| GET    | `/auth/me`                             | Get authenticated user profile         |
| PATCH  | `/auth/me`                             | Update settings                        |
| POST   | `/auth/me/availability`                | Set recurring day availability         |
| DELETE | `/auth/me/availability/:day`           | Clear day availability                 |
| GET    | `/auth/me/availability-exceptions`     | List date exceptions                   |
| POST   | `/auth/me/availability-exceptions`     | Add date exception                     |
| DELETE | `/auth/me/availability-exceptions/:id` | Remove date exception                  |
| POST   | `/auth/me/skills`                      | Add skill                              |
| DELETE | `/auth/me/skills/:skillId`             | Remove skill                           |

---

## Shifts (`/api/shifts`) — 11 endpoints

| Method | Endpoint                           | Description                         |
| ------ | ---------------------------------- | ----------------------------------- |
| GET    | `/shifts?weekStart=&weekEnd=`      | List shifts (location-filtered)     |
| GET    | `/shifts/locations`                | User's accessible locations         |
| GET    | `/shifts/skills`                   | All available skills                |
| GET    | `/shifts/eligible-staff`           | Eligible staff for a location+skill |
| POST   | `/shifts`                          | Create shift                        |
| PATCH  | `/shifts/:id`                      | Update / publish / unpublish        |
| PATCH  | `/shifts/:id/move`                 | Drag-and-drop reschedule            |
| POST   | `/shifts/:id/assign`               | Assign staff with constraint checks |
| DELETE | `/shifts/:id/assign/:assignmentId` | Unassign staff                      |
| DELETE | `/shifts/:id`                      | Delete draft shift                  |
| GET    | `/shifts/:id/what-if/:userId`      | What-if impact preview              |

---

## Swaps (`/api/swaps`) — 7 endpoints

| Method | Endpoint             | Description                      |
| ------ | -------------------- | -------------------------------- |
| GET    | `/swaps`             | List swap/drop requests          |
| GET    | `/swaps/stats`       | Pending/approved/rejected counts |
| GET    | `/swaps/coworkers`   | Eligible swap partners           |
| POST   | `/swaps`             | Create swap or drop request      |
| PATCH  | `/swaps/:id/respond` | Staff B accepts/rejects swap     |
| PATCH  | `/swaps/:id/resolve` | Manager approves/rejects         |
| PATCH  | `/swaps/:id/cancel`  | Requestor cancels                |

---

## Users (`/api/users`) — 10 endpoints

| Method | Endpoint                           | Description                    |
| ------ | ---------------------------------- | ------------------------------ |
| GET    | `/users`                           | List staff (location-filtered) |
| GET    | `/users/:id`                       | Get staff detail               |
| POST   | `/users`                           | Create staff member            |
| PATCH  | `/users/:id`                       | Update staff member            |
| DELETE | `/users/:id`                       | Delete staff member            |
| POST   | `/users/:id/skills`                | Add skill to staff             |
| DELETE | `/users/:id/skills/:skillId`       | Remove skill from staff        |
| POST   | `/users/:id/certifications`        | Add location certification     |
| DELETE | `/users/:id/certifications/:locId` | Revoke location certification  |
| GET    | `/users/:id/availability`          | Get staff availability         |

---

## Dashboard (`/api/dashboard`) — 2 endpoints

| Method | Endpoint               | Description                             |
| ------ | ---------------------- | --------------------------------------- |
| GET    | `/dashboard/stats`     | Role-scoped dashboard statistics        |
| GET    | `/dashboard/analytics` | Fairness analytics with hours breakdown |

---

## Notifications (`/api/notifications`) — 4 endpoints

| Method | Endpoint                      | Description                |
| ------ | ----------------------------- | -------------------------- |
| GET    | `/notifications`              | List notifications (paged) |
| GET    | `/notifications/unread-count` | Unread notification count  |
| PATCH  | `/notifications/:id/read`     | Mark single as read        |
| PATCH  | `/notifications/read-all`     | Mark all as read           |

---

## Audit (`/api/audit`) — 2 endpoints

| Method | Endpoint        | Description                           |
| ------ | --------------- | ------------------------------------- |
| GET    | `/audit/logs`   | Paginated audit logs (filtered)       |
| GET    | `/audit/export` | CSV export of audit logs (Admin only) |

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/prisma/prisma.service";
import * as bcrypt from "bcryptjs";

describe("Shifts E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let manager2Token: string;
  let staffToken: string;

  const TEST_LOCATION_1 = "E2E Shift Location 1";
  const TEST_LOCATION_2 = "E2E Shift Location 2";
  const emails = {
    admin: "e2e-shift-admin@coastaleats.com",
    manager: "e2e-shift-manager@coastaleats.com",
    manager2: "e2e-shift-manager2@coastaleats.com",
    staff: "e2e-shift-staff@coastaleats.com",
  };

  let location1Id: string;
  let location2Id: string;
  let skillId: string;
  let staffUserId: string;
  let managerUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix("api");
    await app.init();

    prisma = app.get(PrismaService);
    const passwordHash = await bcrypt.hash("Password123!", 4);

    // ── Cleanup stale data ───────────────────────────────────────────────
    const staleUsers = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    if (staleUsers.length) {
      const ids = staleUsers.map((u) => u.id);
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.shiftAssignment.deleteMany({
        where: {
          OR: [{ userId: { in: ids } }, { assignedById: { in: ids } }],
        },
      });
      await prisma.staffSkill.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.staffLocationCertification.deleteMany({
        where: { userId: { in: ids } },
      });
    }
    for (const locName of [TEST_LOCATION_1, TEST_LOCATION_2]) {
      const loc = await prisma.location.findFirst({
        where: { name: locName },
      });
      if (loc) {
        await prisma.shift.deleteMany({ where: { locationId: loc.id } });
        await prisma.managerLocation.deleteMany({
          where: { locationId: loc.id },
        });
        await prisma.location.delete({ where: { id: loc.id } });
      }
    }
    if (staleUsers.length) {
      await prisma.user.deleteMany({
        where: { id: { in: staleUsers.map((u) => u.id) } },
      });
    }

    // ── Create test users ────────────────────────────────────────────────
    const adminUser = await prisma.user.create({
      data: {
        email: emails.admin,
        passwordHash,
        firstName: "Shift",
        lastName: "Admin",
        role: "ADMIN",
      },
    });
    const managerUser = await prisma.user.create({
      data: {
        email: emails.manager,
        passwordHash,
        firstName: "Shift",
        lastName: "Manager",
        role: "MANAGER",
      },
    });
    managerUserId = managerUser.id;
    const manager2User = await prisma.user.create({
      data: {
        email: emails.manager2,
        passwordHash,
        firstName: "Shift",
        lastName: "Manager2",
        role: "MANAGER",
      },
    });
    const staffUser = await prisma.user.create({
      data: {
        email: emails.staff,
        passwordHash,
        firstName: "Shift",
        lastName: "Staff",
        role: "STAFF",
      },
    });
    staffUserId = staffUser.id;

    // ── Create locations ─────────────────────────────────────────────────
    const loc1 = await prisma.location.create({
      data: {
        name: TEST_LOCATION_1,
        address: "1 Test St",
        timezone: "America/New_York",
      },
    });
    location1Id = loc1.id;

    const loc2 = await prisma.location.create({
      data: {
        name: TEST_LOCATION_2,
        address: "2 Test St",
        timezone: "America/Los_Angeles",
      },
    });
    location2Id = loc2.id;

    // ── Manager manages location 1 only ──────────────────────────────────
    await prisma.managerLocation.create({
      data: { userId: managerUser.id, locationId: loc1.id },
    });
    // Manager2 manages location 2 only
    await prisma.managerLocation.create({
      data: { userId: manager2User.id, locationId: loc2.id },
    });

    // ── Skill ────────────────────────────────────────────────────────────
    const skill = await prisma.skill.upsert({
      where: { name: "server" },
      update: {},
      create: { name: "server" },
    });
    skillId = skill.id;

    // Staff has skill + certified at location 1
    await prisma.staffSkill.create({
      data: { userId: staffUser.id, skillId: skill.id },
    });
    await prisma.staffLocationCertification.create({
      data: { userId: staffUser.id, locationId: loc1.id },
    });

    // ── Login all ────────────────────────────────────────────────────────
    const [adminRes, managerRes, manager2Res, staffRes] = await Promise.all([
      request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: emails.admin, password: "Password123!" }),
      request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: emails.manager, password: "Password123!" }),
      request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: emails.manager2, password: "Password123!" }),
      request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: emails.staff, password: "Password123!" }),
    ]);

    adminToken = adminRes.body.accessToken;
    managerToken = managerRes.body.accessToken;
    manager2Token = manager2Res.body.accessToken;
    staffToken = staffRes.body.accessToken;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);

    await prisma.refreshToken.deleteMany({
      where: { userId: { in: ids } },
    });
    await prisma.shiftAssignment.deleteMany({
      where: {
        OR: [{ userId: { in: ids } }, { assignedById: { in: ids } }],
      },
    });
    await prisma.staffSkill.deleteMany({
      where: { userId: { in: ids } },
    });
    await prisma.staffLocationCertification.deleteMany({
      where: { userId: { in: ids } },
    });

    for (const locName of [TEST_LOCATION_1, TEST_LOCATION_2]) {
      const loc = await prisma.location.findFirst({
        where: { name: locName },
      });
      if (loc) {
        await prisma.shift.deleteMany({ where: { locationId: loc.id } });
        await prisma.managerLocation.deleteMany({
          where: { locationId: loc.id },
        });
        await prisma.location.delete({ where: { id: loc.id } });
      }
    }

    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH & ROLE GUARDS
  // ══════════════════════════════════════════════════════════════════════════

  it("GET /api/shifts → 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/shifts?weekStart=2026-04-06&weekEnd=2026-04-12")
      .expect(401);
  });

  it("POST /api/shifts → 403 for STAFF", async () => {
    await request(app.getHttpServer())
      .post("/api/shifts")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        locationId: location1Id,
        date: "2026-04-10T00:00:00.000Z",
        startTime: "2026-04-10T09:00:00.000Z",
        endTime: "2026-04-10T17:00:00.000Z",
        requiredSkillId: skillId,
        headcount: 1,
      })
      .expect(403);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CRUD — CREATE
  // ══════════════════════════════════════════════════════════════════════════

  let createdShiftId: string;

  it("POST /api/shifts → admin creates a shift", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/shifts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        locationId: location1Id,
        date: "2026-04-10T00:00:00.000Z",
        startTime: "2026-04-10T09:00:00.000Z",
        endTime: "2026-04-10T17:00:00.000Z",
        requiredSkillId: skillId,
        headcount: 2,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe("DRAFT");
    expect(res.body.headcount).toBe(2);
    expect(res.body.location.name).toBe(TEST_LOCATION_1);
    createdShiftId = res.body.id;
  });

  it("POST /api/shifts → manager creates at own location", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/shifts")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        locationId: location1Id,
        date: "2026-04-11T00:00:00.000Z",
        startTime: "2026-04-11T10:00:00.000Z",
        endTime: "2026-04-11T18:00:00.000Z",
        requiredSkillId: skillId,
        headcount: 1,
      })
      .expect(201);

    expect(res.body.status).toBe("DRAFT");
  });

  it("POST /api/shifts → manager CANNOT create at unmanaged location", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/shifts")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        locationId: location2Id,
        date: "2026-04-11T00:00:00.000Z",
        startTime: "2026-04-11T10:00:00.000Z",
        endTime: "2026-04-11T18:00:00.000Z",
        requiredSkillId: skillId,
        headcount: 1,
      })
      .expect(403);

    expect(res.body.message).toContain("do not manage");
  });

  // ══════════════════════════════════════════════════════════════════════════
  // RECURRING SHIFTS
  // ══════════════════════════════════════════════════════════════════════════

  it("POST /api/shifts → recurring daily creates multiple shifts", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/shifts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        locationId: location1Id,
        date: "2026-04-13T00:00:00.000Z",
        startTime: "2026-04-13T09:00:00.000Z",
        endTime: "2026-04-13T15:00:00.000Z",
        requiredSkillId: skillId,
        headcount: 1,
        recurrence: "daily",
        recurrenceCount: 3,
      })
      .expect(201);

    // Should return an array of 3 shifts
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);

    // Dates should be consecutive
    const dates = res.body.map(
      (s: any) => new Date(s.date).toISOString().split("T")[0],
    );
    expect(dates).toContain("2026-04-13");
    expect(dates).toContain("2026-04-14");
    expect(dates).toContain("2026-04-15");
  });

  it("POST /api/shifts → recurring weekly creates multiple shifts", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/shifts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        locationId: location1Id,
        date: "2026-04-20T00:00:00.000Z",
        startTime: "2026-04-20T08:00:00.000Z",
        endTime: "2026-04-20T16:00:00.000Z",
        requiredSkillId: skillId,
        headcount: 1,
        recurrence: "weekly",
        recurrenceCount: 2,
      })
      .expect(201);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LIST / FILTER
  // ══════════════════════════════════════════════════════════════════════════

  it("GET /api/shifts → admin sees all shifts for the week", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/shifts?weekStart=2026-04-06&weekEnd=2026-04-12")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2); // admin + manager created shifts
  });

  it("GET /api/shifts → manager sees only shifts at managed locations", async () => {
    // Manager manages location 1, so should see shifts there
    const res = await request(app.getHttpServer())
      .get("/api/shifts?weekStart=2026-04-06&weekEnd=2026-04-12")
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(200);

    // All returned shifts should be at location 1
    for (const shift of res.body) {
      expect(shift.locationId).toBe(location1Id);
    }
  });

  it("GET /api/shifts → staff sees only PUBLISHED shifts", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/shifts?weekStart=2026-04-06&weekEnd=2026-04-12")
      .set("Authorization", `Bearer ${staffToken}`)
      .expect(200);

    for (const shift of res.body) {
      expect(shift.status).toBe("PUBLISHED");
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LOCATIONS / SKILLS / ELIGIBLE-STAFF
  // ══════════════════════════════════════════════════════════════════════════

  it("GET /api/shifts/locations → admin sees all locations", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/shifts/locations")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const names = res.body.map((l: any) => l.name);
    expect(names).toContain(TEST_LOCATION_1);
    expect(names).toContain(TEST_LOCATION_2);
  });

  it("GET /api/shifts/locations → manager sees only managed locations", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/shifts/locations")
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(200);

    const names = res.body.map((l: any) => l.name);
    expect(names).toContain(TEST_LOCATION_1);
    expect(names).not.toContain(TEST_LOCATION_2);
  });

  it("GET /api/shifts/eligible-staff → returns certified+skilled staff", async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/api/shifts/eligible-staff?locationId=${location1Id}&skillId=${skillId}`,
      )
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const staffEmails = res.body.map((s: any) => s.email);
    expect(staffEmails).toContain(emails.staff);
  });

  it("GET /api/shifts/eligible-staff → manager can query own location", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/shifts/eligible-staff?locationId=${location1Id}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/shifts/eligible-staff → manager CANNOT query unmanaged location", async () => {
    await request(app.getHttpServer())
      .get(`/api/shifts/eligible-staff?locationId=${location2Id}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(403);
  });

  it("GET /api/shifts/eligible-staff → 403 for STAFF role", async () => {
    await request(app.getHttpServer())
      .get(`/api/shifts/eligible-staff?locationId=${location1Id}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .expect(403);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ASSIGN / UNASSIGN — constraint validation
  // ══════════════════════════════════════════════════════════════════════════

  let assignmentId: string;

  it("POST /api/shifts/:id/assign → assigns staff to shift", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/shifts/${createdShiftId}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: staffUserId })
      .expect(201);

    expect(res.body.user.email).toBe(emails.staff);
    expect(res.body.status).toBe("ASSIGNED");
    assignmentId = res.body.id;
  });

  it("POST /api/shifts/:id/assign → rejects duplicate assignment", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/shifts/${createdShiftId}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: staffUserId })
      .expect(400);

    // Either a double-booking or unique constraint message
    expect(res.body.message).toBeDefined();
  });

  it("POST /api/shifts/:id/assign → rejects uncertified location", async () => {
    // Create a shift at location 2 where staff is NOT certified
    const shiftRes = await request(app.getHttpServer())
      .post("/api/shifts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        locationId: location2Id,
        date: "2026-04-12T00:00:00.000Z",
        startTime: "2026-04-12T09:00:00.000Z",
        endTime: "2026-04-12T17:00:00.000Z",
        requiredSkillId: skillId,
        headcount: 1,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/shifts/${shiftRes.body.id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: staffUserId })
      .expect(400);

    expect(res.body.message).toContain("not certified");
  });

  it("POST /api/shifts/:id/assign → rejects overlapping shift (double-booking)", async () => {
    // Create an overlapping shift at location 1 same time as the assigned one
    const overlap = await request(app.getHttpServer())
      .post("/api/shifts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        locationId: location1Id,
        date: "2026-04-10T00:00:00.000Z",
        startTime: "2026-04-10T10:00:00.000Z",
        endTime: "2026-04-10T14:00:00.000Z",
        requiredSkillId: skillId,
        headcount: 1,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/shifts/${overlap.body.id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: staffUserId })
      .expect(400);

    expect(res.body.message).toContain("overlapping");
  });

  it("POST /api/shifts/:id/assign → rejects 10-hour rest violation", async () => {
    // Staff is assigned 9am-5pm on Apr 10. Create a shift at 11pm same day (only 6h gap).
    const tooClose = await request(app.getHttpServer())
      .post("/api/shifts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        locationId: location1Id,
        date: "2026-04-10T00:00:00.000Z",
        startTime: "2026-04-10T23:00:00.000Z",
        endTime: "2026-04-11T03:00:00.000Z",
        requiredSkillId: skillId,
        headcount: 1,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/shifts/${tooClose.body.id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: staffUserId })
      .expect(400);

    expect(res.body.message).toContain("10 hours rest");
  });

  it("DELETE /api/shifts/:id/assign/:assignmentId → unassigns staff", async () => {
    await request(app.getHttpServer())
      .delete(`/api/shifts/${createdShiftId}/assign/${assignmentId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLISH / UPDATE / MOVE
  // ══════════════════════════════════════════════════════════════════════════

  it("PATCH /api/shifts/:id → publish a draft shift", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/shifts/${createdShiftId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "PUBLISHED", version: 1 })
      .expect(200);

    expect(res.body.status).toBe("PUBLISHED");
    expect(res.body.version).toBe(2);
  });

  it("PATCH /api/shifts/:id → rejects stale version (optimistic locking)", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/shifts/${createdShiftId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "DRAFT", version: 1 }) // stale version
      .expect(409);

    expect(res.body.message).toContain("modified by someone else");
  });

  it("PATCH /api/shifts/:id/move → move shift to a different day", async () => {
    // First get the current version
    const listRes = await request(app.getHttpServer())
      .get("/api/shifts?weekStart=2026-04-06&weekEnd=2026-04-12")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const shift = listRes.body.find((s: any) => s.id === createdShiftId);

    const res = await request(app.getHttpServer())
      .patch(`/api/shifts/${createdShiftId}/move`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        startTime: "2026-04-09T09:00:00.000Z",
        endTime: "2026-04-09T17:00:00.000Z",
        date: "2026-04-09T00:00:00.000Z",
        version: shift.version,
      })
      .expect(200);

    expect(new Date(res.body.date).toISOString()).toContain("2026-04-09");
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════════════════════════════

  it("DELETE /api/shifts/:id → cannot delete published shift", async () => {
    // Shift is published from earlier test; need to unpublish first
    const listRes = await request(app.getHttpServer())
      .get("/api/shifts?weekStart=2026-04-06&weekEnd=2026-04-12")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const shift = listRes.body.find((s: any) => s.id === createdShiftId);
    if (shift.status === "PUBLISHED") {
      await request(app.getHttpServer())
        .delete(`/api/shifts/${createdShiftId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);
    }
  });

  it("DELETE /api/shifts/:id → can delete a draft shift", async () => {
    // Create a new draft shift just for deletion
    const newShift = await request(app.getHttpServer())
      .post("/api/shifts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        locationId: location1Id,
        date: "2026-04-12T00:00:00.000Z",
        startTime: "2026-04-12T18:00:00.000Z",
        endTime: "2026-04-12T22:00:00.000Z",
        requiredSkillId: skillId,
        headcount: 1,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/shifts/${newShift.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // OVERTIME / HOURS ENFORCEMENT
  // ══════════════════════════════════════════════════════════════════════════

  it("POST /api/shifts/:id/assign → warns when approaching 40h/week", async () => {
    // Clean slate for this test
    await prisma.shiftAssignment.deleteMany({
      where: { userId: staffUserId },
    });

    // Create 5 × 7h shifts Mon–Fri in June week 1
    const shifts: string[] = [];
    for (let day = 1; day <= 5; day++) {
      const d = String(day).padStart(2, "0");
      const s = await request(app.getHttpServer())
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          locationId: location1Id,
          date: `2026-06-${d}T00:00:00.000Z`,
          startTime: `2026-06-${d}T08:00:00.000Z`,
          endTime: `2026-06-${d}T15:00:00.000Z`,
          requiredSkillId: skillId,
          headcount: 1,
        })
        .expect(201);
      shifts.push(s.body.id);
    }

    // Assign all 5 (5 × 7h = 35h)
    for (const sid of shifts) {
      await request(app.getHttpServer())
        .post(`/api/shifts/${sid}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: staffUserId })
        .expect(201);
    }

    // 6th shift → 42h → hard-blocked at 40h
    const extra = await request(app.getHttpServer())
      .post("/api/shifts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        locationId: location1Id,
        date: "2026-06-06T00:00:00.000Z",
        startTime: "2026-06-06T08:00:00.000Z",
        endTime: "2026-06-06T15:00:00.000Z",
        requiredSkillId: skillId,
        headcount: 1,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/shifts/${extra.body.id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: staffUserId })
      .expect(400);

    expect(res.body.message).toContain("40-hour");
  });

  it("POST /api/shifts/:id/assign → blocks 12h daily cap", async () => {
    // Create a 13-hour shift
    const longShift = await request(app.getHttpServer())
      .post("/api/shifts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        locationId: location1Id,
        date: "2026-06-11T00:00:00.000Z",
        startTime: "2026-06-11T06:00:00.000Z",
        endTime: "2026-06-11T19:00:00.000Z", // 13h
        requiredSkillId: skillId,
        headcount: 1,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/shifts/${longShift.body.id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: staffUserId })
      .expect(400);

    expect(res.body.message).toContain("12-hour");
  });
});

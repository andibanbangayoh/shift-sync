import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/prisma/prisma.service";
import * as bcrypt from "bcryptjs";

describe("Dashboard E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let staffToken: string;

  const TEST_LOCATION_NAME = "E2E Test Dash Location";
  const emails = {
    admin: "e2e-dash-admin@coastaleats.com",
    manager: "e2e-dash-manager@coastaleats.com",
    staff: "e2e-dash-staff@coastaleats.com",
  };

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

    // ── Wipe any leftovers from a prior interrupted run ──────────────────
    const staleUsers = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    if (staleUsers.length) {
      const staleIds = staleUsers.map((u) => u.id);
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: staleIds } },
      });
      await prisma.notification.deleteMany({
        where: { userId: { in: staleIds } },
      });
      await prisma.swapRequest.deleteMany({
        where: { requestorUserId: { in: staleIds } },
      });
      await prisma.shiftAssignment.deleteMany({
        where: { userId: { in: staleIds } },
      });
    }
    const staleLocation = await prisma.location.findFirst({
      where: { name: TEST_LOCATION_NAME },
    });
    if (staleLocation) {
      await prisma.shift.deleteMany({
        where: { locationId: staleLocation.id },
      });
      await prisma.managerLocation.deleteMany({
        where: { locationId: staleLocation.id },
      });
      await prisma.location.delete({ where: { id: staleLocation.id } });
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
        firstName: "Dash",
        lastName: "Admin",
        role: "ADMIN",
      },
    });
    const managerUser = await prisma.user.create({
      data: {
        email: emails.manager,
        passwordHash,
        firstName: "Dash",
        lastName: "Manager",
        role: "MANAGER",
      },
    });
    const staffUser = await prisma.user.create({
      data: {
        email: emails.staff,
        passwordHash,
        firstName: "Dash",
        lastName: "Staff",
        role: "STAFF",
      },
    });

    // ── Shared test location + skill ─────────────────────────────────────
    const testLocation = await prisma.location.create({
      data: {
        name: TEST_LOCATION_NAME,
        address: "1 E2E Test St",
        timezone: "UTC",
      },
    });

    // Use the seeded "server" skill if available, otherwise create a temp one
    const testSkill = await prisma.skill.upsert({
      where: { name: "server" },
      update: {},
      create: { name: "server" },
    });

    // Manager manages the test location
    await prisma.managerLocation.create({
      data: { userId: managerUser.id, locationId: testLocation.id },
    });

    // ── Active shift (started 2 h ago, ends in 4 h) ──────────────────────
    const now = new Date();
    const shift = await prisma.shift.create({
      data: {
        locationId: testLocation.id,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate()), // midnight local
        startTime: new Date(now.getTime() - 2 * 3_600_000),
        endTime: new Date(now.getTime() + 4 * 3_600_000),
        requiredSkillId: testSkill.id,
        headcount: 2,
        status: "PUBLISHED",
        createdById: adminUser.id,
      },
    });

    // Staff is assigned and confirmed on the active shift
    await prisma.shiftAssignment.create({
      data: {
        shiftId: shift.id,
        userId: staffUser.id,
        assignedById: adminUser.id,
        status: "CONFIRMED",
      },
    });

    // Notification for the staff user
    await prisma.notification.create({
      data: {
        userId: staffUser.id,
        type: "SHIFT_ASSIGNED",
        title: "Shift Assigned",
        message: "You have been assigned a bartender shift.",
        isRead: false,
      },
    });

    // ── Login all three ──────────────────────────────────────────────────
    const [adminRes, managerRes, staffRes] = await Promise.all([
      request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: emails.admin, password: "Password123!" }),
      request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: emails.manager, password: "Password123!" }),
      request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: emails.staff, password: "Password123!" }),
    ]);

    adminToken = adminRes.body.accessToken;
    managerToken = managerRes.body.accessToken;
    staffToken = staffRes.body.accessToken;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    await prisma.refreshToken.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.swapRequest.deleteMany({
      where: { requestorUserId: { in: userIds } },
    });
    await prisma.shiftAssignment.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
    });

    const loc = await prisma.location.findFirst({
      where: { name: TEST_LOCATION_NAME },
    });
    if (loc) {
      await prisma.shift.deleteMany({ where: { locationId: loc.id } });
      await prisma.managerLocation.deleteMany({
        where: { locationId: loc.id },
      });
      await prisma.location.delete({ where: { id: loc.id } });
    }

    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  // ── Unauthenticated ──────────────────────────────────────────────────────
  it("GET /api/dashboard/stats → 401 without token", async () => {
    await request(app.getHttpServer()).get("/api/dashboard/stats").expect(401);
  });

  // ── ADMIN ────────────────────────────────────────────────────────────────
  describe("ADMIN role", () => {
    it("returns 200 with correct response shape", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.onDutyNow)).toBe(true);
      expect(typeof res.body.todaysOnDutyCount).toBe("number");
      expect(typeof res.body.unassignedCount).toBe("number");
      expect(Array.isArray(res.body.overtimeAlerts)).toBe(true);
      expect(typeof res.body.pendingSwaps).toBe("number");
      expect(Array.isArray(res.body.upcomingShifts)).toBe(true);
      expect(Array.isArray(res.body.recentNotifications)).toBe(true);
      expect(typeof res.body.unreadNotificationCount).toBe("number");
      expect(typeof res.body.myHoursThisWeek).toBe("number");
    });

    it("includes the active test shift in onDutyNow", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const onDuty: any[] = res.body.onDutyNow;
      const entry = onDuty.find((item) => item.user.email === emails.staff);
      expect(entry).toBeDefined();
      expect(entry.location.name).toBe(TEST_LOCATION_NAME);
      expect(entry.endTime).toBeDefined();
    });

    it("onDutyNow items have the expected shape", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const first = res.body.onDutyNow[0];
      if (first) {
        expect(first).toHaveProperty("id");
        expect(first).toHaveProperty("user");
        expect(first).toHaveProperty("shiftId");
        expect(first).toHaveProperty("location");
        expect(first).toHaveProperty("skill");
        expect(first).toHaveProperty("endTime");
      }
    });
  });

  // ── MANAGER ──────────────────────────────────────────────────────────────
  describe("MANAGER role", () => {
    it("returns 200 with correct response shape", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);

      expect(Array.isArray(res.body.onDutyNow)).toBe(true);
      expect(typeof res.body.todaysOnDutyCount).toBe("number");
      expect(typeof res.body.unassignedCount).toBe("number");
      expect(Array.isArray(res.body.overtimeAlerts)).toBe(true);
      expect(typeof res.body.pendingSwaps).toBe("number");
      expect(Array.isArray(res.body.upcomingShifts)).toBe(true);
    });

    it("scopes onDutyNow to managed location only", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);

      const onDuty: any[] = res.body.onDutyNow;
      // Every on-duty entry must belong to a location this manager manages
      expect(
        onDuty.every((item) => item.location.name === TEST_LOCATION_NAME),
      ).toBe(true);

      // The active test shift should appear here
      const entry = onDuty.find((item) => item.user.email === emails.staff);
      expect(entry).toBeDefined();
    });
  });

  // ── STAFF ────────────────────────────────────────────────────────────────
  describe("STAFF role", () => {
    it("returns 200 with correct response shape", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body.onDutyNow)).toBe(true);
      expect(typeof res.body.todaysOnDutyCount).toBe("number");
      expect(typeof res.body.unassignedCount).toBe("number");
      expect(typeof res.body.pendingSwaps).toBe("number");
      expect(Array.isArray(res.body.upcomingShifts)).toBe(true);
      expect(Array.isArray(res.body.recentNotifications)).toBe(true);
      expect(typeof res.body.unreadNotificationCount).toBe("number");
      expect(typeof res.body.myHoursThisWeek).toBe("number");
    });

    it("myHoursThisWeek reflects the 6 h active shift", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      // Active shift is 6 h long (started 2 h ago, ends in 4 h)
      expect(res.body.myHoursThisWeek).toBe(6);
    });

    it("recentNotifications contains the seeded notification", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      const notifs: any[] = res.body.recentNotifications;
      expect(notifs.length).toBeGreaterThan(0);
      expect(notifs[0]).toHaveProperty("id");
      expect(notifs[0]).toHaveProperty("type");
      expect(notifs[0]).toHaveProperty("title");
      expect(notifs[0]).toHaveProperty("message");
    });

    it("unreadNotificationCount matches unread notifications", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      // We seeded 1 unread notification for the staff user
      expect(res.body.unreadNotificationCount).toBeGreaterThanOrEqual(1);
    });
  });
});

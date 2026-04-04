import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/prisma/prisma.service";
import * as bcrypt from "bcryptjs";

describe("Audit & Analytics E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let staffToken: string;
  let adminId: string;
  let managerId: string;
  let staffId: string;
  let locationId: string;
  let skillId: string;

  const emails = {
    admin: "e2e-audit-admin@coastaleats.com",
    manager: "e2e-audit-manager@coastaleats.com",
    staff: "e2e-audit-staff@coastaleats.com",
  };
  const TEST_LOC = "E2E Audit Location";

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

    // ── Cleanup stale data ───────────────────────────────────────────
    const staleUsers = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    if (staleUsers.length) {
      const ids = staleUsers.map((u) => u.id);
      await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
      await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
      await prisma.swapRequest.deleteMany({
        where: {
          OR: [
            { requestorUserId: { in: ids } },
            { targetUserId: { in: ids } },
            { resolvedById: { in: ids } },
          ],
        },
      });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
      await prisma.shiftAssignment.deleteMany({
        where: { OR: [{ userId: { in: ids } }, { assignedById: { in: ids } }] },
      });
      await prisma.staffSkill.deleteMany({ where: { userId: { in: ids } } });
      await prisma.staffLocationCertification.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.managerLocation.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.shift.deleteMany({
        where: { createdById: { in: ids } },
      });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }

    const loc = await prisma.location.findFirst({ where: { name: TEST_LOC } });
    if (loc) {
      await prisma.shift.deleteMany({ where: { locationId: loc.id } });
      await prisma.managerLocation.deleteMany({
        where: { locationId: loc.id },
      });
      await prisma.location.delete({ where: { id: loc.id } });
    }

    // ── Seed ─────────────────────────────────────────────────────────
    const admin = await prisma.user.create({
      data: {
        email: emails.admin,
        passwordHash,
        firstName: "Audit",
        lastName: "Admin",
        role: "ADMIN",
      },
    });
    adminId = admin.id;

    const location = await prisma.location.create({
      data: {
        name: TEST_LOC,
        address: "1 Audit St",
        timezone: "America/New_York",
      },
    });
    locationId = location.id;

    const manager = await prisma.user.create({
      data: {
        email: emails.manager,
        passwordHash,
        firstName: "Audit",
        lastName: "Manager",
        role: "MANAGER",
      },
    });
    managerId = manager.id;

    await prisma.managerLocation.create({
      data: { userId: managerId, locationId },
    });

    const skill = await prisma.skill.upsert({
      where: { name: "server" },
      update: {},
      create: { name: "server" },
    });
    skillId = skill.id;

    const staff = await prisma.user.create({
      data: {
        email: emails.staff,
        passwordHash,
        firstName: "Audit",
        lastName: "Staff",
        role: "STAFF",
        desiredWeeklyHours: 30,
      },
    });
    staffId = staff.id;

    await prisma.staffLocationCertification.create({
      data: { userId: staffId, locationId },
    });
    await prisma.staffSkill.create({
      data: { userId: staffId, skillId },
    });

    // Login
    const loginAdmin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: emails.admin, password: "Password123!" });
    adminToken = loginAdmin.body.accessToken;

    const loginManager = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: emails.manager, password: "Password123!" });
    managerToken = loginManager.body.accessToken;

    const loginStaff = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: emails.staff, password: "Password123!" });
    staffToken = loginStaff.body.accessToken;
  });

  afterAll(async () => {
    const ids = [adminId, managerId, staffId].filter(Boolean);
    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.swapRequest.deleteMany({
      where: {
        OR: [{ requestorUserId: { in: ids } }, { targetUserId: { in: ids } }],
      },
    });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.shiftAssignment.deleteMany({
      where: { OR: [{ userId: { in: ids } }, { assignedById: { in: ids } }] },
    });
    await prisma.staffSkill.deleteMany({ where: { userId: { in: ids } } });
    await prisma.staffLocationCertification.deleteMany({
      where: { userId: { in: ids } },
    });
    await prisma.managerLocation.deleteMany({ where: { userId: { in: ids } } });
    await prisma.shift.deleteMany({ where: { createdById: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.location.delete({ where: { id: locationId } });
    await app.close();
  });

  // ════════════════════════════════════════════════════════════════════════
  // AUDIT — create a shift so audit logs exist, then query them
  // ════════════════════════════════════════════════════════════════════════

  let shiftId: string;

  it("POST /api/shifts → creates shift (generates audit log)", async () => {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const date = tomorrow.toISOString().split("T")[0];

    const res = await request(app.getHttpServer())
      .post("/api/shifts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        locationId,
        date,
        startTime: `${date}T09:00:00.000Z`,
        endTime: `${date}T17:00:00.000Z`,
        requiredSkillId: skillId,
        headcount: 2,
      })
      .expect(201);

    shiftId = res.body.id;
    expect(shiftId).toBeDefined();
  });

  it("POST /api/shifts/:id/assign → assign staff (generates audit log)", async () => {
    await request(app.getHttpServer())
      .post(`/api/shifts/${shiftId}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: staffId })
      .expect(201);
  });

  it("GET /api/audit/logs → admin sees audit logs", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/audit/logs")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.meta).toBeDefined();
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    // Verify structure
    const log = res.body.data[0];
    expect(log.user).toBeDefined();
    expect(log.action).toBeDefined();
    expect(log.entityType).toBeDefined();
    expect(log.createdAt).toBeDefined();
  });

  it("GET /api/audit/logs?entityType=SHIFT → filter by entity", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/audit/logs")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ entityType: "SHIFT" })
      .expect(200);

    expect(res.body.data.every((l: any) => l.entityType === "SHIFT")).toBe(
      true,
    );
  });

  it("GET /api/audit/logs?action=SHIFT_CREATED → filter by action", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/audit/logs")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ action: "SHIFT_CREATED" })
      .expect(200);

    expect(res.body.data.every((l: any) => l.action === "SHIFT_CREATED")).toBe(
      true,
    );
  });

  it("GET /api/audit/logs → manager sees logs for their locations", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/audit/logs")
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
  });

  it("GET /api/audit/logs → 403 for STAFF", async () => {
    await request(app.getHttpServer())
      .get("/api/audit/logs")
      .set("Authorization", `Bearer ${staffToken}`)
      .expect(403);
  });

  it("GET /api/audit/logs → pagination works", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/audit/logs")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ limit: "1", page: "1" })
      .expect(200);

    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.meta.limit).toBe(1);
    expect(res.body.meta.page).toBe(1);
  });

  // ════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ════════════════════════════════════════════════════════════════════════

  it("GET /api/dashboard/analytics → admin gets analytics", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/dashboard/analytics")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.period).toBeDefined();
    expect(res.body.summary).toBeDefined();
    expect(res.body.staff).toBeDefined();
    expect(typeof res.body.summary.avgWeeklyHours).toBe("number");
    expect(typeof res.body.summary.fairnessScore).toBe("number");
    expect(typeof res.body.summary.totalPremiumShifts).toBe("number");
  });

  it("GET /api/dashboard/analytics?locationId → filter by location", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/dashboard/analytics")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ locationId })
      .expect(200);

    expect(res.body.period).toBeDefined();
    // All returned staff should have shifts at this location
    expect(res.body.staff).toBeDefined();
  });

  it("GET /api/dashboard/analytics → manager sees scoped data", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/dashboard/analytics")
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(200);

    expect(res.body.summary).toBeDefined();
    expect(res.body.staff).toBeDefined();
  });

  it("GET /api/dashboard/analytics → 403 for STAFF", async () => {
    await request(app.getHttpServer())
      .get("/api/dashboard/analytics")
      .set("Authorization", `Bearer ${staffToken}`)
      .expect(403);
  });

  it("GET /api/dashboard/analytics → custom date range", async () => {
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const to = new Date();

    const res = await request(app.getHttpServer())
      .get("/api/dashboard/analytics")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
      })
      .expect(200);

    expect(res.body.period.weeks).toBeGreaterThanOrEqual(1);
  });
});

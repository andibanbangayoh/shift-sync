import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/prisma/prisma.service";
import * as bcrypt from "bcryptjs";

describe("Users (Staff Management) E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let staffToken: string;

  const emails = {
    admin: "e2e-users-admin@coastaleats.com",
    manager: "e2e-users-manager@coastaleats.com",
    staff: "e2e-users-staff@coastaleats.com",
  };

  let adminId: string;
  let managerId: string;
  let staffId: string;
  let locationId: string;
  let skillId: string;

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

    // ── Cleanup ──────────────────────────────────────────────────────────
    const staleUsers = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    if (staleUsers.length) {
      const ids = staleUsers.map((u) => u.id);
      await prisma.notification.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.swapRequest.deleteMany({
        where: {
          OR: [
            { requestorUserId: { in: ids } },
            { targetUserId: { in: ids } },
            { resolvedById: { in: ids } },
          ],
        },
      });
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.availability.deleteMany({
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
      await prisma.managerLocation.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: ids } },
      });
    }

    const TEST_LOC = "E2E Users Location";
    const loc = await prisma.location.findFirst({
      where: { name: TEST_LOC },
    });
    if (loc) {
      await prisma.shift.deleteMany({ where: { locationId: loc.id } });
      await prisma.managerLocation.deleteMany({
        where: { locationId: loc.id },
      });
      await prisma.location.delete({ where: { id: loc.id } });
    }

    // ── Seed ─────────────────────────────────────────────────────────────
    const admin = await prisma.user.create({
      data: {
        email: emails.admin,
        passwordHash,
        firstName: "Users",
        lastName: "Admin",
        role: "ADMIN",
      },
    });
    adminId = admin.id;

    const location = await prisma.location.create({
      data: {
        name: TEST_LOC,
        address: "1 Test St",
        timezone: "America/New_York",
      },
    });
    locationId = location.id;

    const manager = await prisma.user.create({
      data: {
        email: emails.manager,
        passwordHash,
        firstName: "Users",
        lastName: "Manager",
        role: "MANAGER",
      },
    });
    managerId = manager.id;

    await prisma.managerLocation.create({
      data: { userId: managerId, locationId },
    });

    const staff = await prisma.user.create({
      data: {
        email: emails.staff,
        passwordHash,
        firstName: "Users",
        lastName: "Staff",
        role: "STAFF",
      },
    });
    staffId = staff.id;

    // Certify staff at the location
    await prisma.staffLocationCertification.create({
      data: { userId: staffId, locationId },
    });

    const skill = await prisma.skill.upsert({
      where: { name: "bartender" },
      update: {},
      create: { name: "bartender" },
    });
    skillId = skill.id;

    // Login tokens
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

    // Clean up any users we created during tests
    const createdEmails = [
      "new-staff@coastaleats.com",
      "new-mgr@coastaleats.com",
    ];
    const extraUsers = await prisma.user.findMany({
      where: { email: { in: createdEmails } },
      select: { id: true },
    });
    ids.push(...extraUsers.map((u) => u.id));

    await prisma.availability.deleteMany({
      where: { userId: { in: ids } },
    });
    await prisma.auditLog.deleteMany({
      where: { userId: { in: ids } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: ids } },
    });
    await prisma.swapRequest.deleteMany({
      where: {
        OR: [{ requestorUserId: { in: ids } }, { targetUserId: { in: ids } }],
      },
    });
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
    await prisma.managerLocation.deleteMany({
      where: { userId: { in: ids } },
    });
    await prisma.shift.deleteMany({ where: { locationId } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.location.delete({ where: { id: locationId } });

    await app.close();
  });

  // ════════════════════════════════════════════════════════════════════════
  // AUTH & ACCESS CONTROL
  // ════════════════════════════════════════════════════════════════════════

  it("GET /api/users → 401 without token", async () => {
    await request(app.getHttpServer()).get("/api/users").expect(401);
  });

  it("GET /api/users → 403 for STAFF", async () => {
    await request(app.getHttpServer())
      .get("/api/users")
      .set("Authorization", `Bearer ${staffToken}`)
      .expect(403);
  });

  it("GET /api/users → admin sees all users", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(3);
    // Verify the response includes skills, certifications, availabilities
    const staffMember = res.body.find((u: any) => u.email === emails.staff);
    expect(staffMember).toBeDefined();
    expect(staffMember.skills).toBeDefined();
    expect(staffMember.certifications).toBeDefined();
  });

  it("GET /api/users → manager sees staff at their locations", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/users")
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(200);

    // Manager should see the e2e staff (certified at their location)
    const found = res.body.find((u: any) => u.email === emails.staff);
    expect(found).toBeDefined();
  });

  it("GET /api/users?search=Users → search works", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ search: "Users" })
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  // ════════════════════════════════════════════════════════════════════════
  // CREATE STAFF
  // ════════════════════════════════════════════════════════════════════════

  let newStaffId: string;

  it("POST /api/users → admin creates STAFF", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: "new-staff@coastaleats.com",
        password: "Password123!",
        firstName: "New",
        lastName: "Staffer",
        role: "STAFF",
        desiredWeeklyHours: 30,
      })
      .expect(201);

    expect(res.body.email).toBe("new-staff@coastaleats.com");
    expect(res.body.role).toBe("STAFF");
    expect(res.body.desiredWeeklyHours).toBe(30);
    expect(res.body.passwordHash).toBeUndefined();
    newStaffId = res.body.id;
  });

  it("POST /api/users → admin creates MANAGER", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: "new-mgr@coastaleats.com",
        password: "Password123!",
        firstName: "New",
        lastName: "Manager",
        role: "MANAGER",
      })
      .expect(201);

    expect(res.body.role).toBe("MANAGER");
  });

  it("POST /api/users → manager can only create STAFF", async () => {
    await request(app.getHttpServer())
      .post("/api/users")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        email: "mgr-attempt@coastaleats.com",
        password: "Password123!",
        firstName: "Fail",
        lastName: "Manager",
        role: "MANAGER",
      })
      .expect(403);
  });

  it("POST /api/users → duplicate email → 409", async () => {
    await request(app.getHttpServer())
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: "new-staff@coastaleats.com",
        password: "Password123!",
        firstName: "Dup",
        lastName: "User",
        role: "STAFF",
      })
      .expect(409);
  });

  // ════════════════════════════════════════════════════════════════════════
  // UPDATE STAFF
  // ════════════════════════════════════════════════════════════════════════

  it("PATCH /api/users/:id → update profile", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/users/${newStaffId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ phone: "555-1234", desiredWeeklyHours: 35 })
      .expect(200);

    expect(res.body.phone).toBe("555-1234");
    expect(res.body.desiredWeeklyHours).toBe(35);
  });

  it("PATCH /api/users/:id → deactivate", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/users/${newStaffId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200);

    expect(res.body.isActive).toBe(false);

    // Reactivate for next tests
    await request(app.getHttpServer())
      .patch(`/api/users/${newStaffId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isActive: true });
  });

  // ════════════════════════════════════════════════════════════════════════
  // SKILLS
  // ════════════════════════════════════════════════════════════════════════

  it("POST /api/users/:id/skills → add skill", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/users/${newStaffId}/skills`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ skillId })
      .expect(201);

    expect(res.body.skill.name).toBe("bartender");
  });

  it("DELETE /api/users/:id/skills/:skillId → remove skill", async () => {
    await request(app.getHttpServer())
      .delete(`/api/users/${newStaffId}/skills/${skillId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
  });

  // ════════════════════════════════════════════════════════════════════════
  // CERTIFICATIONS (LOCATIONS)
  // ════════════════════════════════════════════════════════════════════════

  it("POST /api/users/:id/certifications → certify at location", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/users/${newStaffId}/certifications`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ locationId })
      .expect(201);

    expect(res.body.location).toBeDefined();
  });

  it("DELETE /api/users/:id/certifications/:locId → revoke", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/users/${newStaffId}/certifications/${locationId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.revokedAt).toBeDefined();
  });

  // ════════════════════════════════════════════════════════════════════════
  // WEEKLY AVAILABILITY
  // ════════════════════════════════════════════════════════════════════════

  let availId: string;

  it("POST /api/users/:id/availability → add slot", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/users/${newStaffId}/availability`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" })
      .expect(201);

    expect(res.body.dayOfWeek).toBe(1);
    expect(res.body.startTime).toBe("09:00");
    availId = res.body.id;
  });

  it("POST /api/users/:id/availability → invalid day → 400", async () => {
    await request(app.getHttpServer())
      .post(`/api/users/${newStaffId}/availability`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ dayOfWeek: 7, startTime: "09:00", endTime: "17:00" })
      .expect(400);
  });

  it("POST /api/users/:id/availability → start >= end → 400", async () => {
    await request(app.getHttpServer())
      .post(`/api/users/${newStaffId}/availability`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ dayOfWeek: 2, startTime: "17:00", endTime: "09:00" })
      .expect(400);
  });

  it("DELETE /api/users/:id/availability/:avId → remove slot", async () => {
    await request(app.getHttpServer())
      .delete(`/api/users/${newStaffId}/availability/${availId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
  });

  // ════════════════════════════════════════════════════════════════════════
  // DETAIL
  // ════════════════════════════════════════════════════════════════════════

  it("GET /api/users/:id → returns full detail", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/users/${staffId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.email).toBe(emails.staff);
    expect(res.body.skills).toBeDefined();
    expect(res.body.certifications).toBeDefined();
    expect(res.body.availabilities).toBeDefined();
    expect(res.body.passwordHash).toBeUndefined();
  });

  // ════════════════════════════════════════════════════════════════════════
  // MANAGER SCOPING — managers can only access staff at their locations
  // ════════════════════════════════════════════════════════════════════════

  it("GET /api/users/:id → manager can view staff at their location", async () => {
    await request(app.getHttpServer())
      .get(`/api/users/${staffId}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(200);
  });

  it("GET /api/users/:id → manager cannot view users outside their locations", async () => {
    // newStaffId was created via API but has no certification at manager's location
    await request(app.getHttpServer())
      .get(`/api/users/${newStaffId}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(403);
  });

  it("PATCH /api/users/:id → manager can update staff at their location", async () => {
    await request(app.getHttpServer())
      .patch(`/api/users/${staffId}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ phone: "555-9999" })
      .expect(200);
  });

  it("PATCH /api/users/:id → manager cannot update staff outside their locations", async () => {
    await request(app.getHttpServer())
      .patch(`/api/users/${newStaffId}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ phone: "555-0000" })
      .expect(403);
  });

  it("GET /api/users?role=ADMIN → manager cannot filter to see admins", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/users")
      .set("Authorization", `Bearer ${managerToken}`)
      .query({ role: "ADMIN" })
      .expect(200);

    const admins = res.body.filter((u: any) => u.role === "ADMIN");
    expect(admins.length).toBe(0);
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/prisma/prisma.service";
import * as bcrypt from "bcryptjs";

describe("Swaps E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let staffAToken: string;
  let staffBToken: string;

  const TEST_LOCATION = "E2E Swap Location";
  const emails = {
    admin: "e2e-swap-admin@coastaleats.com",
    manager: "e2e-swap-manager@coastaleats.com",
    staffA: "e2e-swap-staffa@coastaleats.com",
    staffB: "e2e-swap-staffb@coastaleats.com",
  };

  let locationId: string;
  let skillId: string;
  let staffAId: string;
  let staffBId: string;
  let adminId: string;
  let managerId: string;

  // Shift & assignment ids created during tests
  let shiftAId: string;
  let shiftBId: string;
  let assignmentAId: string;
  let assignmentBId: string;

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
    const loc = await prisma.location.findFirst({
      where: { name: TEST_LOCATION },
    });
    if (loc) {
      await prisma.shift.deleteMany({ where: { locationId: loc.id } });
      await prisma.managerLocation.deleteMany({
        where: { locationId: loc.id },
      });
      await prisma.location.delete({ where: { id: loc.id } });
    }
    if (staleUsers.length) {
      const staleIds = staleUsers.map((u) => u.id);
      await prisma.auditLog.deleteMany({
        where: { userId: { in: staleIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: staleIds } },
      });
    }

    // ── Users ────────────────────────────────────────────────────────────
    const admin = await prisma.user.create({
      data: {
        email: emails.admin,
        passwordHash,
        firstName: "Swap",
        lastName: "Admin",
        role: "ADMIN",
      },
    });
    adminId = admin.id;

    const manager = await prisma.user.create({
      data: {
        email: emails.manager,
        passwordHash,
        firstName: "Swap",
        lastName: "Manager",
        role: "MANAGER",
      },
    });
    managerId = manager.id;

    const staffA = await prisma.user.create({
      data: {
        email: emails.staffA,
        passwordHash,
        firstName: "Alice",
        lastName: "Staff",
        role: "STAFF",
      },
    });
    staffAId = staffA.id;

    const staffB = await prisma.user.create({
      data: {
        email: emails.staffB,
        passwordHash,
        firstName: "Bob",
        lastName: "Staff",
        role: "STAFF",
      },
    });
    staffBId = staffB.id;

    // ── Location ─────────────────────────────────────────────────────────
    const location = await prisma.location.create({
      data: {
        name: TEST_LOCATION,
        address: "1 Test St",
        timezone: "America/New_York",
      },
    });
    locationId = location.id;

    await prisma.managerLocation.create({
      data: { userId: managerId, locationId },
    });

    // ── Skill + certs ────────────────────────────────────────────────────
    const skill = await prisma.skill.upsert({
      where: { name: "server" },
      update: {},
      create: { name: "server" },
    });
    skillId = skill.id;

    await prisma.staffSkill.createMany({
      data: [
        { userId: staffAId, skillId },
        { userId: staffBId, skillId },
      ],
      skipDuplicates: true,
    });
    await prisma.staffLocationCertification.createMany({
      data: [
        { userId: staffAId, locationId },
        { userId: staffBId, locationId },
      ],
      skipDuplicates: true,
    });

    // ── Create 2 future shifts ───────────────────────────────────────────
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split("T")[0];

    const shiftA = await prisma.shift.create({
      data: {
        locationId,
        date: new Date(dateStr),
        startTime: new Date(`${dateStr}T09:00:00.000Z`),
        endTime: new Date(`${dateStr}T17:00:00.000Z`),
        requiredSkillId: skillId,
        headcount: 1,
        status: "PUBLISHED",
        createdById: adminId,
      },
    });
    shiftAId = shiftA.id;

    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 8);
    const dateStr2 = futureDate2.toISOString().split("T")[0];

    const shiftB = await prisma.shift.create({
      data: {
        locationId,
        date: new Date(dateStr2),
        startTime: new Date(`${dateStr2}T10:00:00.000Z`),
        endTime: new Date(`${dateStr2}T18:00:00.000Z`),
        requiredSkillId: skillId,
        headcount: 1,
        status: "PUBLISHED",
        createdById: adminId,
      },
    });
    shiftBId = shiftB.id;

    // ── Assign staff A to shift A, staff B to shift B ────────────────────
    const asgA = await prisma.shiftAssignment.create({
      data: {
        shiftId: shiftAId,
        userId: staffAId,
        assignedById: adminId,
      },
    });
    assignmentAId = asgA.id;

    const asgB = await prisma.shiftAssignment.create({
      data: {
        shiftId: shiftBId,
        userId: staffBId,
        assignedById: adminId,
      },
    });
    assignmentBId = asgB.id;

    // ── Login ────────────────────────────────────────────────────────────
    const [adminRes, managerRes, staffARes, staffBRes] = await Promise.all([
      request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: emails.admin, password: "Password123!" }),
      request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: emails.manager, password: "Password123!" }),
      request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: emails.staffA, password: "Password123!" }),
      request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: emails.staffB, password: "Password123!" }),
    ]);

    adminToken = adminRes.body.accessToken;
    managerToken = managerRes.body.accessToken;
    staffAToken = staffARes.body.accessToken;
    staffBToken = staffBRes.body.accessToken;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);

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

    const loc = await prisma.location.findFirst({
      where: { name: TEST_LOCATION },
    });
    if (loc) {
      await prisma.shift.deleteMany({ where: { locationId: loc.id } });
      await prisma.managerLocation.deleteMany({
        where: { locationId: loc.id },
      });
      await prisma.location.delete({ where: { id: loc.id } });
    }

    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  // ════════════════════════════════════════════════════════════════════════
  // AUTH GUARDS
  // ════════════════════════════════════════════════════════════════════════

  it("GET /api/swaps → 401 without token", async () => {
    await request(app.getHttpServer()).get("/api/swaps").expect(401);
  });

  it("GET /api/swaps/stats → 401 without token", async () => {
    await request(app.getHttpServer()).get("/api/swaps/stats").expect(401);
  });

  // ════════════════════════════════════════════════════════════════════════
  // DROP FLOW
  // ════════════════════════════════════════════════════════════════════════

  let dropRequestId: string;

  it("POST /api/swaps → staff A creates a DROP request", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/swaps")
      .set("Authorization", `Bearer ${staffAToken}`)
      .send({
        requestorAssignmentId: assignmentAId,
        type: "DROP",
      })
      .expect(201);

    expect(res.body.type).toBe("DROP");
    expect(res.body.status).toBe("PENDING");
    expect(res.body.requestor.id).toBe(staffAId);
    dropRequestId = res.body.id;
  });

  it("GET /api/swaps → staff A sees their drop request", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/swaps")
      .set("Authorization", `Bearer ${staffAToken}`)
      .expect(200);

    expect(res.body.some((s: any) => s.id === dropRequestId)).toBe(true);
  });

  it("GET /api/swaps/stats → returns correct counts", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/swaps/stats")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.pending).toBeGreaterThanOrEqual(1);
    expect(res.body.needsAction).toBeGreaterThanOrEqual(1);
  });

  it("PATCH /api/swaps/:id/resolve → manager approves DROP", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/swaps/${dropRequestId}/resolve`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ action: "approve" })
      .expect(200);

    expect(res.body.status).toBe("MANAGER_APPROVED");

    // Verify the assignment was cancelled (removed from schedule)
    const asg = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentAId },
    });
    expect(asg!.status).toBe("CANCELLED");
  });

  // ════════════════════════════════════════════════════════════════════════
  // SWAP FLOW
  // ════════════════════════════════════════════════════════════════════════

  let swapRequestId: string;
  let swapAssignmentAId: string;
  let swapAssignmentBId: string;

  it("Setup: create new assignments for swap test", async () => {
    // Create a fresh assignment for staff A on shift B and staff B on shift A
    const futureDate3 = new Date();
    futureDate3.setDate(futureDate3.getDate() + 10);
    const dateStr3 = futureDate3.toISOString().split("T")[0];

    const shiftC = await prisma.shift.create({
      data: {
        locationId,
        date: new Date(dateStr3),
        startTime: new Date(`${dateStr3}T08:00:00.000Z`),
        endTime: new Date(`${dateStr3}T16:00:00.000Z`),
        requiredSkillId: skillId,
        headcount: 1,
        status: "PUBLISHED",
        createdById: adminId,
      },
    });

    const futureDate4 = new Date();
    futureDate4.setDate(futureDate4.getDate() + 11);
    const dateStr4 = futureDate4.toISOString().split("T")[0];

    const shiftD = await prisma.shift.create({
      data: {
        locationId,
        date: new Date(dateStr4),
        startTime: new Date(`${dateStr4}T09:00:00.000Z`),
        endTime: new Date(`${dateStr4}T17:00:00.000Z`),
        requiredSkillId: skillId,
        headcount: 1,
        status: "PUBLISHED",
        createdById: adminId,
      },
    });

    const asgA2 = await prisma.shiftAssignment.create({
      data: {
        shiftId: shiftC.id,
        userId: staffAId,
        assignedById: adminId,
      },
    });
    swapAssignmentAId = asgA2.id;

    const asgB2 = await prisma.shiftAssignment.create({
      data: {
        shiftId: shiftD.id,
        userId: staffBId,
        assignedById: adminId,
      },
    });
    swapAssignmentBId = asgB2.id;

    expect(asgA2.id).toBeDefined();
    expect(asgB2.id).toBeDefined();
  });

  it("POST /api/swaps → staff A creates a SWAP request (targetUserId only)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/swaps")
      .set("Authorization", `Bearer ${staffAToken}`)
      .send({
        requestorAssignmentId: swapAssignmentAId,
        type: "SWAP",
        targetUserId: staffBId,
      })
      .expect(201);

    expect(res.body.type).toBe("SWAP");
    expect(res.body.status).toBe("PENDING");
    expect(res.body.targetUser.id).toBe(staffBId);
    swapRequestId = res.body.id;
  });

  it("POST /api/swaps → cannot create for someone else's assignment", async () => {
    await request(app.getHttpServer())
      .post("/api/swaps")
      .set("Authorization", `Bearer ${staffBToken}`)
      .send({
        requestorAssignmentId: swapAssignmentAId,
        type: "DROP",
      })
      .expect(400);
  });

  it("PATCH /api/swaps/:id/respond → staff B accepts the swap", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/swaps/${swapRequestId}/respond`)
      .set("Authorization", `Bearer ${staffBToken}`)
      .send({ action: "accept" })
      .expect(200);

    expect(res.body.status).toBe("ACCEPTED");
  });

  it("PATCH /api/swaps/:id/resolve → admin approves the swap", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/swaps/${swapRequestId}/resolve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ action: "approve" })
      .expect(200);

    expect(res.body.status).toBe("MANAGER_APPROVED");

    // Verify the assignment was transferred to Staff B
    const asgA = await prisma.shiftAssignment.findUnique({
      where: { id: swapAssignmentAId },
    });
    expect(asgA!.userId).toBe(staffBId);
  });

  // ════════════════════════════════════════════════════════════════════════
  // REJECTION FLOW
  // ════════════════════════════════════════════════════════════════════════

  let rejectRequestId: string;
  let rejectAssignmentId: string;

  it("Setup: create assignment for reject test", async () => {
    const futureDate5 = new Date();
    futureDate5.setDate(futureDate5.getDate() + 12);
    const dateStr5 = futureDate5.toISOString().split("T")[0];

    const shiftE = await prisma.shift.create({
      data: {
        locationId,
        date: new Date(dateStr5),
        startTime: new Date(`${dateStr5}T09:00:00.000Z`),
        endTime: new Date(`${dateStr5}T17:00:00.000Z`),
        requiredSkillId: skillId,
        headcount: 1,
        status: "PUBLISHED",
        createdById: adminId,
      },
    });

    const asg = await prisma.shiftAssignment.create({
      data: {
        shiftId: shiftE.id,
        userId: staffAId,
        assignedById: adminId,
      },
    });
    rejectAssignmentId = asg.id;
    expect(asg.id).toBeDefined();
  });

  it("POST + PATCH → manager rejects a drop request", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/api/swaps")
      .set("Authorization", `Bearer ${staffAToken}`)
      .send({
        requestorAssignmentId: rejectAssignmentId,
        type: "DROP",
      })
      .expect(201);

    rejectRequestId = createRes.body.id;

    const res = await request(app.getHttpServer())
      .patch(`/api/swaps/${rejectRequestId}/resolve`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ action: "reject", reason: "Understaffed this day" })
      .expect(200);

    expect(res.body.status).toBe("REJECTED");
    expect(res.body.cancellationReason).toBe("Understaffed this day");
  });

  // ════════════════════════════════════════════════════════════════════════
  // CANCEL FLOW
  // ════════════════════════════════════════════════════════════════════════

  let cancelAssignmentId: string;

  it("Staff can cancel their own pending request", async () => {
    const futureDate6 = new Date();
    futureDate6.setDate(futureDate6.getDate() + 13);
    const dateStr6 = futureDate6.toISOString().split("T")[0];

    const shiftF = await prisma.shift.create({
      data: {
        locationId,
        date: new Date(dateStr6),
        startTime: new Date(`${dateStr6}T09:00:00.000Z`),
        endTime: new Date(`${dateStr6}T17:00:00.000Z`),
        requiredSkillId: skillId,
        headcount: 1,
        status: "PUBLISHED",
        createdById: adminId,
      },
    });

    const asg = await prisma.shiftAssignment.create({
      data: {
        shiftId: shiftF.id,
        userId: staffBId,
        assignedById: adminId,
      },
    });
    cancelAssignmentId = asg.id;

    const createRes = await request(app.getHttpServer())
      .post("/api/swaps")
      .set("Authorization", `Bearer ${staffBToken}`)
      .send({
        requestorAssignmentId: cancelAssignmentId,
        type: "DROP",
      })
      .expect(201);

    const cancelRes = await request(app.getHttpServer())
      .patch(`/api/swaps/${createRes.body.id}/cancel`)
      .set("Authorization", `Bearer ${staffBToken}`)
      .expect(200);

    expect(cancelRes.body.status).toBe("CANCELLED");
  });

  it("Staff cannot cancel someone else's request", async () => {
    // Use the rejected request id from manager rejection test - it's already resolved
    // Create a new pending request for staffA
    const futureDate7 = new Date();
    futureDate7.setDate(futureDate7.getDate() + 14);
    const dateStr7 = futureDate7.toISOString().split("T")[0];

    const shiftG = await prisma.shift.create({
      data: {
        locationId,
        date: new Date(dateStr7),
        startTime: new Date(`${dateStr7}T09:00:00.000Z`),
        endTime: new Date(`${dateStr7}T17:00:00.000Z`),
        requiredSkillId: skillId,
        headcount: 1,
        status: "PUBLISHED",
        createdById: adminId,
      },
    });

    const asg = await prisma.shiftAssignment.create({
      data: {
        shiftId: shiftG.id,
        userId: staffAId,
        assignedById: adminId,
      },
    });

    const createRes = await request(app.getHttpServer())
      .post("/api/swaps")
      .set("Authorization", `Bearer ${staffAToken}`)
      .send({
        requestorAssignmentId: asg.id,
        type: "DROP",
      })
      .expect(201);

    // Staff B tries to cancel Staff A's request
    await request(app.getHttpServer())
      .patch(`/api/swaps/${createRes.body.id}/cancel`)
      .set("Authorization", `Bearer ${staffBToken}`)
      .expect(403);
  });

  // ════════════════════════════════════════════════════════════════════════
  // ROLE-SCOPED VISIBILITY
  // ════════════════════════════════════════════════════════════════════════

  it("STAFF only sees their own requests", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/swaps")
      .set("Authorization", `Bearer ${staffBToken}`)
      .expect(200);

    // Staff B should only see requests where they are requestor or target
    for (const s of res.body) {
      const involves =
        s.requestor.id === staffBId ||
        (s.targetUser && s.targetUser.id === staffBId);
      expect(involves).toBe(true);
    }
  });

  it("ADMIN sees all requests", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/swaps")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  it("STAFF cannot resolve a swap request", async () => {
    // Try to resolve any request as staff - should 403
    const list = await request(app.getHttpServer())
      .get("/api/swaps")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const pendingReq = list.body.find((s: any) => s.status === "PENDING");
    if (pendingReq) {
      await request(app.getHttpServer())
        .patch(`/api/swaps/${pendingReq.id}/resolve`)
        .set("Authorization", `Bearer ${staffAToken}`)
        .send({ action: "approve" })
        .expect(403);
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  // COWORKERS ENDPOINT
  // ════════════════════════════════════════════════════════════════════════

  it("GET /api/swaps/coworkers → returns coworkers with availability", async () => {
    // Use shift A's times (staffB has an overlapping shift on shift B day, not shift A day)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split("T")[0];

    const res = await request(app.getHttpServer())
      .get("/api/swaps/coworkers")
      .set("Authorization", `Bearer ${staffAToken}`)
      .query({
        locationId,
        shiftStart: `${dateStr}T09:00:00.000Z`,
        shiftEnd: `${dateStr}T17:00:00.000Z`,
      })
      .expect(200);

    // Staff A should not appear in their own coworker list
    expect(res.body.every((c: any) => c.id !== staffAId)).toBe(true);
    // Staff B should appear (certified at location)
    expect(res.body.some((c: any) => c.id === staffBId)).toBe(true);
    // Each coworker has available & conflictReason fields
    for (const c of res.body) {
      expect(typeof c.available).toBe("boolean");
      expect(c.firstName).toBeDefined();
      expect(c.lastName).toBeDefined();
    }
  });

  it("GET /api/swaps/coworkers → 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/swaps/coworkers")
      .query({ locationId, shiftStart: "x", shiftEnd: "x" })
      .expect(401);
  });

  // ════════════════════════════════════════════════════════════════════════
  // EXPIRY HANDLING
  // ════════════════════════════════════════════════════════════════════════

  it("expired requests are auto-marked EXPIRED on list", async () => {
    // Create a shift starting > 24h from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const dateStr = futureDate.toISOString().split("T")[0];

    const shift = await prisma.shift.create({
      data: {
        locationId,
        date: new Date(dateStr),
        startTime: new Date(`${dateStr}T09:00:00.000Z`),
        endTime: new Date(`${dateStr}T17:00:00.000Z`),
        requiredSkillId: skillId,
        headcount: 1,
        status: "PUBLISHED",
        createdById: adminId,
      },
    });

    const asg = await prisma.shiftAssignment.create({
      data: { shiftId: shift.id, userId: staffAId, assignedById: adminId },
    });

    // Create a request then manually set expiresAt to the past
    const swapReq = await prisma.swapRequest.create({
      data: {
        type: "DROP",
        requestorUserId: staffAId,
        requestorAssignmentId: asg.id,
        status: "PENDING",
        expiresAt: new Date(Date.now() - 60_000), // already expired
      },
    });

    // Fetching the list should auto-expire it
    const res = await request(app.getHttpServer())
      .get("/api/swaps")
      .set("Authorization", `Bearer ${staffAToken}`)
      .expect(200);

    const found = res.body.find((s: any) => s.id === swapReq.id);
    expect(found).toBeDefined();
    expect(found.status).toBe("EXPIRED");
  });

  it("PATCH /api/swaps/:id/resolve → rejects expired request", async () => {
    // Find the expired request from the previous test
    const expired = await prisma.swapRequest.findFirst({
      where: { requestorUserId: staffAId, status: "EXPIRED" },
      orderBy: { requestedAt: "desc" },
    });

    if (expired) {
      // Reset to PENDING to test the resolve-time check
      await prisma.swapRequest.update({
        where: { id: expired.id },
        data: { status: "PENDING" },
      });

      await request(app.getHttpServer())
        .patch(`/api/swaps/${expired.id}/resolve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ action: "approve" })
        .expect(400);
    }
  });
});

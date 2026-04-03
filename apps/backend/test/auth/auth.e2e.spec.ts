import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/prisma/prisma.service";
import * as bcrypt from "bcryptjs";

describe("Auth E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;

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

    // Clean up any leftover refresh tokens from previous runs
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          email: {
            in: [
              "e2e-test@coastaleats.com",
              "e2e-staff@coastaleats.com",
              "e2e-new@coastaleats.com",
            ],
          },
        },
      },
    });

    // Seed a test user
    const passwordHash = await bcrypt.hash("Password123!", 4);
    await prisma.user.upsert({
      where: { email: "e2e-test@coastaleats.com" },
      update: { passwordHash, isActive: true, deletedAt: null },
      create: {
        email: "e2e-test@coastaleats.com",
        passwordHash,
        firstName: "E2E",
        lastName: "Test",
        role: "ADMIN",
      },
    });

    await prisma.user.upsert({
      where: { email: "e2e-staff@coastaleats.com" },
      update: { passwordHash, isActive: true, deletedAt: null },
      create: {
        email: "e2e-staff@coastaleats.com",
        passwordHash,
        firstName: "E2E",
        lastName: "Staff",
        role: "STAFF",
      },
    });
  });

  afterAll(async () => {
    // Clean up test users
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          email: {
            in: [
              "e2e-test@coastaleats.com",
              "e2e-staff@coastaleats.com",
              "e2e-new@coastaleats.com",
            ],
          },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "e2e-test@coastaleats.com",
            "e2e-staff@coastaleats.com",
            "e2e-new@coastaleats.com",
          ],
        },
      },
    });
    await app.close();
  });

  describe("POST /api/auth/login", () => {
    it("should return 200 with tokens for valid credentials", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "e2e-test@coastaleats.com", password: "Password123!" })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe("e2e-test@coastaleats.com");
      expect(res.body.user.role).toBe("ADMIN");
      expect(res.body.user).not.toHaveProperty("passwordHash");

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it("should return 401 for invalid password", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "e2e-test@coastaleats.com", password: "WrongPass!" })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it("should return 401 for non-existent email", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "nobody@coastaleats.com", password: "Password123!" })
        .expect(401);
    });

    it("should return 400 for missing fields", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "" })
        .expect(400);
    });

    it("should return 400 for invalid email format", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "not-an-email", password: "Password123!" })
        .expect(400);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return 200 with user profile for valid token", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe("e2e-test@coastaleats.com");
      expect(res.body.role).toBe("ADMIN");
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("should return 401 without token", async () => {
      await request(app.getHttpServer()).get("/api/auth/me").expect(401);
    });

    it("should return 401 with invalid token", async () => {
      await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should return 200 with new tokens for valid refresh token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({ refreshToken })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe("e2e-test@coastaleats.com");

      // Update tokens for subsequent tests
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it("should return 401 for used (rotated) refresh token", async () => {
      // The old refresh token was rotated in the previous test
      await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({ refreshToken: "old-rotated-token" })
        .expect(401);
    });

    it("should return 400 for missing refresh token", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({})
        .expect(400);
    });
  });

  describe("POST /api/auth/register (Admin only)", () => {
    it("should return 201 when admin creates a new user", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          email: "e2e-new@coastaleats.com",
          password: "NewPass123!",
          firstName: "New",
          lastName: "Employee",
          role: "STAFF",
        })
        .expect(201);

      expect(res.body.email).toBe("e2e-new@coastaleats.com");
      expect(res.body.role).toBe("STAFF");
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("should return 409 for duplicate email", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          email: "e2e-new@coastaleats.com",
          password: "NewPass123!",
          firstName: "Dup",
          lastName: "User",
          role: "STAFF",
        })
        .expect(409);
    });

    it("should return 403 when staff tries to register", async () => {
      // Login as staff first
      const loginRes = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "e2e-staff@coastaleats.com", password: "Password123!" });

      await request(app.getHttpServer())
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${loginRes.body.accessToken}`)
        .send({
          email: "another@coastaleats.com",
          password: "NewPass123!",
          firstName: "Another",
          lastName: "User",
          role: "STAFF",
        })
        .expect(403);
    });

    it("should return 401 without authentication", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/register")
        .send({
          email: "noauth@coastaleats.com",
          password: "NewPass123!",
          firstName: "No",
          lastName: "Auth",
          role: "STAFF",
        })
        .expect(401);
    });

    it("should return 400 for invalid input", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          email: "not-valid",
          password: "123",
          firstName: "",
          role: "SUPERADMIN",
        })
        .expect(400);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should return 200 and invalidate refresh token", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Refresh should no longer work
      await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe("Role-based access", () => {
    it("should allow admin to access users list", async () => {
      const loginRes = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "e2e-test@coastaleats.com", password: "Password123!" });

      await request(app.getHttpServer())
        .get("/api/users")
        .set("Authorization", `Bearer ${loginRes.body.accessToken}`)
        .expect(200);
    });

    it("should deny staff access to users list", async () => {
      const loginRes = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "e2e-staff@coastaleats.com", password: "Password123!" });

      await request(app.getHttpServer())
        .get("/api/users")
        .set("Authorization", `Bearer ${loginRes.body.accessToken}`)
        .expect(403);
    });
  });
});

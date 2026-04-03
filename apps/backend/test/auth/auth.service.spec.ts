import { describe, it, expect, beforeEach, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { AuthService } from "../../src/modules/auth/auth.service";
import { PrismaService } from "../../src/prisma/prisma.service";
import { mockPrismaService, resetPrismaMocks } from "../helpers/prisma.mock";
import * as bcrypt from "bcryptjs";

describe("AuthService", () => {
  let authService: AuthService;
  let jwtService: JwtService;

  const mockUser = {
    id: "user-1",
    email: "test@coastaleats.com",
    passwordHash: "", // set in beforeEach
    firstName: "Test",
    lastName: "User",
    role: "STAFF",
    phone: null,
    desiredWeeklyHours: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockJwtService = {
    sign: vi.fn().mockReturnValue("mock-token"),
    verify: vi.fn().mockReturnValue({ sub: "user-1" }),
  };

  const mockConfigService = {
    get: vi.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: "test-jwt-secret",
        JWT_REFRESH_SECRET: "test-refresh-secret",
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    resetPrismaMocks();

    mockUser.passwordHash = await bcrypt.hash("Password123!", 4); // Low rounds for speed

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe("login", () => {
    it("should return tokens and user for valid credentials", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await authService.login({
        email: "test@coastaleats.com",
        password: "Password123!",
      });

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("user");
      expect(result.user.email).toBe("test@coastaleats.com");
      expect(result.user).not.toHaveProperty("passwordHash");
      expect(result.user).not.toHaveProperty("deletedAt");
    });

    it("should throw UnauthorizedException for non-existent email", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: "nobody@coastaleats.com",
          password: "Password123!",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for wrong password", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.login({
          email: "test@coastaleats.com",
          password: "WrongPass123!",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for deleted user", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await expect(
        authService.login({
          email: "test@coastaleats.com",
          password: "Password123!",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for deactivated user", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        authService.login({
          email: "test@coastaleats.com",
          password: "Password123!",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("register", () => {
    it("should create a user and return sanitized data", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await authService.register({
        email: "new@coastaleats.com",
        password: "Password123!",
        firstName: "New",
        lastName: "User",
        role: "STAFF" as any,
      });

      expect(result).not.toHaveProperty("passwordHash");
      expect(mockPrismaService.user.create).toHaveBeenCalledOnce();
    });

    it("should throw ConflictException for duplicate email", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: "test@coastaleats.com",
          password: "Password123!",
          firstName: "Dup",
          lastName: "User",
          role: "STAFF" as any,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("refresh", () => {
    it("should return new tokens for valid refresh token", async () => {
      const storedToken = {
        id: "token-1",
        tokenHash: "hash",
        userId: "user-1",
        user: mockUser,
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
        revokedAt: null,
        createdAt: new Date(),
      };

      mockJwtService.verify.mockReturnValue({ sub: "user-1" });
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await authService.refresh("valid-refresh-token");

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("user");
      // Old token should be revoked
      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "token-1" },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it("should throw UnauthorizedException for expired refresh token", async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error("jwt expired");
      });

      await expect(authService.refresh("expired-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException for revoked refresh token", async () => {
      mockJwtService.verify.mockReturnValue({ sub: "user-1" });
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: "token-1",
        tokenHash: "hash",
        userId: "user-1",
        user: mockUser,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: new Date(), // Already revoked
        createdAt: new Date(),
      });

      await expect(authService.refresh("revoked-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("logout", () => {
    it("should revoke the refresh token", async () => {
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await authService.logout("user-1", "some-refresh-token");

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
            revokedAt: null,
          }),
          data: expect.objectContaining({
            revokedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe("getProfile", () => {
    it("should return user with relations", async () => {
      const userWithRelations = {
        ...mockUser,
        managedLocations: [],
        skills: [{ id: "ss-1", skill: { id: "s-1", name: "bartender" } }],
        certifications: [
          {
            id: "c-1",
            location: {
              id: "loc-1",
              name: "Downtown",
              address: "123 Main St",
              timezone: "America/New_York",
              isActive: true,
            },
            certifiedAt: new Date(),
          },
        ],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithRelations);

      const result = await authService.getProfile("user-1");

      expect(result).not.toHaveProperty("passwordHash");
      expect(result.skills).toHaveLength(1);
      expect(result.certifications).toHaveLength(1);
    });

    it("should throw NotFoundException for non-existent user", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException for deleted user", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await expect(authService.getProfile("user-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { User } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash } from "crypto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        phone: dto.phone,
      },
    });

    return this.sanitizeUser(user);
  }

  async refresh(refreshToken: string) {
    // Verify the JWT structure of the refresh token
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    if (storedToken.userId !== payload.sub) {
      throw new UnauthorizedException("Token mismatch");
    }

    // Revoke old refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new token pair
    const tokens = await this.generateTokens(storedToken.user);
    await this.storeRefreshToken(storedToken.user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(storedToken.user),
    };
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        managedLocations: {
          include: { location: true },
        },
        skills: {
          include: { skill: true },
        },
        certifications: {
          where: { revokedAt: null },
          include: { location: true },
        },
        availabilities: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException("User not found");
    }

    return this.sanitizeUserWithRelations(user);
  }

  async updateSettings(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      notifyInApp?: boolean;
      notifyEmail?: boolean;
      desiredWeeklyHours?: number | null;
    },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: {
        managedLocations: {
          include: { location: true },
        },
        skills: {
          include: { skill: true },
        },
        certifications: {
          where: { revokedAt: null },
          include: { location: true },
        },
        availabilities: true,
      },
    });

    return this.sanitizeUserWithRelations(user);
  }

  async setMyDayAvailability(
    userId: string,
    data: { dayOfWeek: number; startTime: string; endTime: string },
  ) {
    // Remove existing slots for this day
    await this.prisma.availability.deleteMany({
      where: { userId, dayOfWeek: data.dayOfWeek },
    });

    return this.prisma.availability.create({
      data: { userId, ...data },
    });
  }

  async clearMyDayAvailability(userId: string, dayOfWeek: number) {
    await this.prisma.availability.deleteMany({
      where: { userId, dayOfWeek },
    });
    return { success: true };
  }

  // ── Availability Exceptions (one-off date overrides) ──────────────────

  async listMyExceptions(userId: string) {
    return this.prisma.availabilityException.findMany({
      where: { userId, date: { gte: new Date() } },
      orderBy: { date: "asc" },
    });
  }

  async addMyException(
    userId: string,
    data: {
      date: string;
      isAvailable: boolean;
      startTime?: string;
      endTime?: string;
      reason?: string;
    },
  ) {
    // Upsert by userId + date
    const dateObj = new Date(data.date);
    dateObj.setUTCHours(0, 0, 0, 0);

    const existing = await this.prisma.availabilityException.findFirst({
      where: { userId, date: dateObj },
    });

    if (existing) {
      return this.prisma.availabilityException.update({
        where: { id: existing.id },
        data: {
          isAvailable: data.isAvailable,
          startTime: data.startTime ?? null,
          endTime: data.endTime ?? null,
          reason: data.reason ?? null,
        },
      });
    }

    return this.prisma.availabilityException.create({
      data: {
        userId,
        date: dateObj,
        isAvailable: data.isAvailable,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        reason: data.reason ?? null,
      },
    });
  }

  async removeMyException(userId: string, exceptionId: string) {
    const record = await this.prisma.availabilityException.findFirst({
      where: { id: exceptionId, userId },
    });
    if (!record) throw new NotFoundException("Exception not found");

    await this.prisma.availabilityException.delete({
      where: { id: exceptionId },
    });
    return { success: true };
  }

  async addMySkill(userId: string, skillId: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
    });
    if (!skill) throw new NotFoundException("Skill not found");

    return this.prisma.staffSkill.upsert({
      where: { userId_skillId: { userId, skillId } },
      create: { userId, skillId },
      update: {},
      include: { skill: true },
    });
  }

  async removeMySkill(userId: string, skillId: string) {
    const record = await this.prisma.staffSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });
    if (!record) throw new NotFoundException("Skill not found");

    await this.prisma.staffSkill.delete({
      where: { userId_skillId: { userId, skillId } },
    });
    return { success: true };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>("JWT_SECRET"),
      expiresIn: "15m",
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.config.get<string>("JWT_REFRESH_SECRET"),
        expiresIn: "7d",
      },
    );

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, token: string) {
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.upsert({
      where: { tokenHash },
      update: { userId, expiresAt, revokedAt: null },
      create: { tokenHash, userId, expiresAt },
    });
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private sanitizeUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, deletedAt, ...result } = user;
    return result;
  }

  private sanitizeUserWithRelations(user: any) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, deletedAt, ...result } = user;
    return result;
  }
}

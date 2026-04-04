import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ──────────────────────────────────────────────────────────

  private async getManagedLocationIds(userId: string): Promise<string[]> {
    const locs = await this.prisma.managerLocation.findMany({
      where: { userId },
      select: { locationId: true },
    });
    return locs.map((l) => l.locationId);
  }

  // ── List ─────────────────────────────────────────────────────────────

  async findAll(
    callerId: string,
    callerRole: UserRole,
    filters: { role?: UserRole; search?: string },
  ) {
    const where: any = { deletedAt: null };

    // MANAGER only sees staff certified at their locations
    if (callerRole === "MANAGER") {
      const locIds = await this.getManagedLocationIds(callerId);
      where.OR = [
        {
          certifications: {
            some: { locationId: { in: locIds }, revokedAt: null },
          },
        },
        // Also show direct reports (staff with no certifications yet if created by this manager)
        { id: callerId },
      ];
      // Managers should not see admins
      where.role = { in: ["MANAGER", "STAFF"] };
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.search) {
      const term = filters.search;
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
          ],
        },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        desiredWeeklyHours: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        skills: { include: { skill: true } },
        certifications: {
          where: { revokedAt: null },
          include: { location: { select: { id: true, name: true } } },
        },
        availabilities: {
          select: { dayOfWeek: true, startTime: true, endTime: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return users;
  }

  // ── Detail ───────────────────────────────────────────────────────────

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        managedLocations: { include: { location: true } },
        skills: { include: { skill: true } },
        certifications: {
          where: { revokedAt: null },
          include: { location: true },
        },
        availabilities: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException("User not found");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, deletedAt, ...result } = user;
    return result;
  }

  // ── Create Staff ─────────────────────────────────────────────────────

  async createStaff(
    callerRole: UserRole,
    dto: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      phone?: string;
      desiredWeeklyHours?: number;
    },
  ) {
    // Enforce role hierarchy
    if (callerRole === "MANAGER" && dto.role !== "STAFF") {
      throw new ForbiddenException("Managers can only create STAFF accounts");
    }
    if (callerRole === "ADMIN" && dto.role === "ADMIN") {
      throw new ForbiddenException(
        "Cannot create ADMIN accounts via this endpoint",
      );
    }

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
        desiredWeeklyHours: dto.desiredWeeklyHours,
      },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  // ── Update Staff ─────────────────────────────────────────────────────

  async updateStaff(
    id: string,
    dto: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      desiredWeeklyHours?: number;
      isActive?: boolean;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException("User not found");
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    const { passwordHash: _, deletedAt: __, ...result } = updated;
    return result;
  }

  // ── Skills ───────────────────────────────────────────────────────────

  async addSkill(userId: string, skillId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

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

  async removeSkill(userId: string, skillId: string) {
    const record = await this.prisma.staffSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });
    if (!record) throw new NotFoundException("Staff skill not found");

    await this.prisma.staffSkill.delete({
      where: { userId_skillId: { userId, skillId } },
    });
    return { success: true };
  }

  // ── Location Certifications ──────────────────────────────────────────

  async addCertification(userId: string, locationId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });
    if (!location) throw new NotFoundException("Location not found");

    // Upsert — re-certify if previously revoked
    return this.prisma.staffLocationCertification.upsert({
      where: { userId_locationId: { userId, locationId } },
      create: { userId, locationId },
      update: { revokedAt: null, certifiedAt: new Date() },
      include: { location: true },
    });
  }

  async removeCertification(userId: string, locationId: string) {
    const record = await this.prisma.staffLocationCertification.findUnique({
      where: { userId_locationId: { userId, locationId } },
    });
    if (!record) throw new NotFoundException("Certification not found");

    return this.prisma.staffLocationCertification.update({
      where: { userId_locationId: { userId, locationId } },
      data: { revokedAt: new Date() },
      include: { location: true },
    });
  }

  // ── Weekly Availability ──────────────────────────────────────────────

  async addAvailability(
    userId: string,
    dto: { dayOfWeek: number; startTime: string; endTime: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    if (dto.dayOfWeek < 0 || dto.dayOfWeek > 6) {
      throw new BadRequestException("dayOfWeek must be 0-6");
    }
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException("startTime must be before endTime");
    }

    return this.prisma.availability.create({
      data: {
        userId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  async removeAvailability(availabilityId: string) {
    const record = await this.prisma.availability.findUnique({
      where: { id: availabilityId },
    });
    if (!record) throw new NotFoundException("Availability slot not found");

    await this.prisma.availability.delete({ where: { id: availabilityId } });
    return { success: true };
  }
}

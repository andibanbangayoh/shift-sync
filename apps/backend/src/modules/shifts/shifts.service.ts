import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole, ShiftStatus } from "@prisma/client";
import {
  CreateShiftDto,
  UpdateShiftDto,
  AssignStaffDto,
  MoveShiftDto,
} from "./shifts.dto";

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  /** Resolve location IDs a user is allowed to see/manage. */
  private async getAccessibleLocationIds(
    userId: string,
    role: UserRole,
  ): Promise<string[] | null> {
    if (role === "ADMIN") return null; // null = all locations

    if (role === "MANAGER") {
      const managed = await this.prisma.managerLocation.findMany({
        where: { userId },
        select: { locationId: true },
      });
      return managed.map((m) => m.locationId);
    }

    // STAFF — locations they're certified for
    const certs = await this.prisma.staffLocationCertification.findMany({
      where: { userId, revokedAt: null },
      select: { locationId: true },
    });
    return certs.map((c) => c.locationId);
  }

  /**
   * List shifts for a given week.
   * Optionally filter by a single location.
   */
  async listShifts(
    userId: string,
    role: UserRole,
    weekStart: string,
    weekEnd: string,
    locationId?: string,
  ) {
    const accessibleIds = await this.getAccessibleLocationIds(userId, role);

    const locationFilter: any = {};
    if (locationId) {
      // If a specific location was requested, ensure access
      if (accessibleIds && !accessibleIds.includes(locationId)) {
        throw new ForbiddenException("You do not have access to this location");
      }
      locationFilter.locationId = locationId;
    } else if (accessibleIds) {
      locationFilter.locationId = { in: accessibleIds };
    }

    // Staff only see published shifts; admins/managers see all non-cancelled
    const statusFilter =
      role === "STAFF"
        ? { status: "PUBLISHED" as const }
        : { status: { not: "CANCELLED" as const } };

    const shifts = await this.prisma.shift.findMany({
      where: {
        ...locationFilter,
        ...statusFilter,
        date: {
          gte: new Date(weekStart),
          lte: new Date(weekEnd),
        },
      },
      include: {
        location: {
          select: { id: true, name: true, timezone: true },
        },
        requiredSkill: { select: { id: true, name: true } },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignments: {
          where: { status: { in: ["ASSIGNED", "CONFIRMED"] } },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return shifts;
  }

  /** Get locations the user may view/manage (for the filter dropdown). */
  async getLocations(userId: string, role: UserRole) {
    const accessibleIds = await this.getAccessibleLocationIds(userId, role);

    const where = accessibleIds
      ? { id: { in: accessibleIds }, isActive: true }
      : { isActive: true };

    return this.prisma.location.findMany({
      where,
      select: { id: true, name: true, timezone: true },
      orderBy: { name: "asc" },
    });
  }

  /** Get skills (for the create-shift dialog). */
  async getSkills() {
    return this.prisma.skill.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Get staff who are eligible for assignment at a given location
   * and optionally match a required skill.
   * Managers can only query locations they manage.
   */
  async getEligibleStaff(
    userId: string,
    role: UserRole,
    locationId: string,
    skillId?: string,
  ) {
    // Ensure the requesting user has access to this location
    await this.assertLocationAccess(userId, role, locationId);

    const certified = await this.prisma.staffLocationCertification.findMany({
      where: { locationId, revokedAt: null },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
            skills: { include: { skill: true } },
          },
        },
      },
    });

    let eligible = certified.map((c) => c.user).filter((u) => u.isActive);

    if (skillId) {
      eligible = eligible.filter((u) =>
        u.skills.some((s) => s.skillId === skillId),
      );
    }

    return eligible.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      skills: u.skills.map((s) => ({ id: s.skill.id, name: s.skill.name })),
    }));
  }

  /** Create a new shift (optionally recurring). */
  async createShift(userId: string, role: UserRole, dto: CreateShiftDto) {
    await this.assertLocationAccess(userId, role, dto.locationId);

    const recurrence = dto.recurrence || "none";
    const count = Math.min(dto.recurrenceCount || 1, 84); // max 12 weeks of daily
    const dayStep =
      recurrence === "daily" ? 1 : recurrence === "weekly" ? 7 : 0;

    const shiftInclude = {
      location: { select: { id: true, name: true, timezone: true } },
      requiredSkill: { select: { id: true, name: true } },
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    };

    const baseDate = new Date(dto.date);
    const baseStart = new Date(dto.startTime);
    const baseEnd = new Date(dto.endTime);
    const created: any[] = [];

    for (let i = 0; i < (dayStep > 0 ? count : 1); i++) {
      const offsetMs = i * dayStep * 86400000;
      const shift = await this.prisma.shift.create({
        data: {
          locationId: dto.locationId,
          date: new Date(baseDate.getTime() + offsetMs),
          startTime: new Date(baseStart.getTime() + offsetMs),
          endTime: new Date(baseEnd.getTime() + offsetMs),
          requiredSkillId: dto.requiredSkillId,
          headcount: dto.headcount,
          createdById: userId,
          status: "DRAFT",
        },
        include: shiftInclude,
      });
      created.push(shift);
    }

    // Return first shift for single, array for recurring
    return created.length === 1 ? created[0] : created;
  }

  /** Update shift (with optimistic locking via version). */
  async updateShift(
    userId: string,
    role: UserRole,
    shiftId: string,
    dto: UpdateShiftDto,
  ) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });
    if (!shift) throw new NotFoundException("Shift not found");

    await this.assertLocationAccess(userId, role, shift.locationId);

    if (shift.version !== dto.version) {
      throw new ConflictException(
        "This shift was modified by someone else. Please refresh.",
      );
    }

    // Enforce 48h edit cutoff for published shifts
    if (shift.status === "PUBLISHED") {
      const cutoff = new Date(shift.startTime.getTime() - 48 * 3600000);
      if (new Date() > cutoff) {
        throw new BadRequestException(
          "Cannot edit a published shift within 48 hours of start time",
        );
      }
    }

    const { version, ...updateData } = dto;
    const data: any = { ...updateData, version: shift.version + 1 };
    if (dto.date) data.date = new Date(dto.date);
    if (dto.startTime) data.startTime = new Date(dto.startTime);
    if (dto.endTime) data.endTime = new Date(dto.endTime);
    if (dto.status === "PUBLISHED" && !shift.publishedAt) {
      data.publishedAt = new Date();
    }

    return this.prisma.shift.update({
      where: { id: shiftId },
      data,
      include: {
        location: { select: { id: true, name: true, timezone: true } },
        requiredSkill: { select: { id: true, name: true } },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignments: {
          where: { status: { in: ["ASSIGNED", "CONFIRMED"] } },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /** Move a shift to a new timeslot (drag-and-drop). */
  async moveShift(
    userId: string,
    role: UserRole,
    shiftId: string,
    dto: MoveShiftDto,
  ) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });
    if (!shift) throw new NotFoundException("Shift not found");

    await this.assertLocationAccess(userId, role, shift.locationId);

    if (shift.version !== dto.version) {
      throw new ConflictException(
        "This shift was modified by someone else. Please refresh.",
      );
    }

    if (shift.status === "PUBLISHED") {
      const cutoff = new Date(shift.startTime.getTime() - 48 * 3600000);
      if (new Date() > cutoff) {
        throw new BadRequestException(
          "Cannot move a published shift within 48 hours of start time",
        );
      }
    }

    return this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        date: new Date(dto.date),
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        version: shift.version + 1,
      },
      include: {
        location: { select: { id: true, name: true, timezone: true } },
        requiredSkill: { select: { id: true, name: true } },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignments: {
          where: { status: { in: ["ASSIGNED", "CONFIRMED"] } },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /** Assign a staff member to a shift. */
  async assignStaff(
    userId: string,
    role: UserRole,
    shiftId: string,
    dto: AssignStaffDto,
  ) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        assignments: {
          where: { status: { in: ["ASSIGNED", "CONFIRMED"] } },
        },
        requiredSkill: true,
      },
    });
    if (!shift) throw new NotFoundException("Shift not found");

    await this.assertLocationAccess(userId, role, shift.locationId);

    // Check headcount
    if (shift.assignments.length >= shift.headcount) {
      throw new BadRequestException("Shift is fully staffed");
    }

    // Validate location certification
    const cert = await this.prisma.staffLocationCertification.findUnique({
      where: {
        userId_locationId: {
          userId: dto.userId,
          locationId: shift.locationId,
        },
      },
    });
    if (!cert || cert.revokedAt) {
      throw new BadRequestException(
        "Staff member is not certified for this location",
      );
    }

    // Validate skill match
    const hasSkill = await this.prisma.staffSkill.findUnique({
      where: {
        userId_skillId: {
          userId: dto.userId,
          skillId: shift.requiredSkillId,
        },
      },
    });
    if (!hasSkill) {
      throw new BadRequestException(
        "Staff member does not have the required skill",
      );
    }

    // Check double-booking (overlapping published/draft shifts)
    const overlapping = await this.prisma.shiftAssignment.findFirst({
      where: {
        userId: dto.userId,
        status: { in: ["ASSIGNED", "CONFIRMED"] },
        shift: {
          status: { not: "CANCELLED" },
          startTime: { lt: shift.endTime },
          endTime: { gt: shift.startTime },
        },
      },
      include: {
        shift: {
          include: {
            location: { select: { name: true } },
          },
        },
      },
    });
    if (overlapping) {
      throw new BadRequestException(
        `Staff member has an overlapping shift at ${overlapping.shift.location.name} ` +
          `(${overlapping.shift.startTime.toISOString()} – ${overlapping.shift.endTime.toISOString()})`,
      );
    }

    // Check 10-hour rest period
    const tenHoursBefore = new Date(shift.startTime.getTime() - 10 * 3600000);
    const tenHoursAfter = new Date(shift.endTime.getTime() + 10 * 3600000);

    const restViolation = await this.prisma.shiftAssignment.findFirst({
      where: {
        userId: dto.userId,
        status: { in: ["ASSIGNED", "CONFIRMED"] },
        shift: {
          status: { not: "CANCELLED" },
          OR: [
            { endTime: { gt: tenHoursBefore, lte: shift.startTime } },
            { startTime: { gte: shift.endTime, lt: tenHoursAfter } },
          ],
        },
      },
      include: {
        shift: {
          include: { location: { select: { name: true } } },
        },
      },
    });
    if (restViolation) {
      throw new BadRequestException(
        `Staff member needs at least 10 hours rest. Conflicting shift at ` +
          `${restViolation.shift.location.name} ends/starts too close.`,
      );
    }

    // ── Overtime / daily-hour checks ────────────────────────────────────

    const shiftDurationHours =
      (shift.endTime.getTime() - shift.startTime.getTime()) / 3600000;

    // Hard block: 12-hour daily cap
    if (shiftDurationHours > 12) {
      throw new BadRequestException(
        `Shift duration (${shiftDurationHours.toFixed(1)}h) exceeds the 12-hour daily cap.`,
      );
    }

    // Check total hours on the same day (daily > 12h hard block)
    const dayStart = new Date(shift.date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const sameDayAssignments = await this.prisma.shiftAssignment.findMany({
      where: {
        userId: dto.userId,
        status: { in: ["ASSIGNED", "CONFIRMED"] },
        shift: {
          status: { not: "CANCELLED" },
          date: { gte: dayStart, lt: dayEnd },
        },
      },
      include: { shift: { select: { startTime: true, endTime: true } } },
    });

    const dailyHours =
      sameDayAssignments.reduce((sum, a) => {
        return (
          sum +
          (a.shift.endTime.getTime() - a.shift.startTime.getTime()) / 3600000
        );
      }, 0) + shiftDurationHours;

    if (dailyHours > 12) {
      throw new BadRequestException(
        `Assigning this shift would put the staff member at ${dailyHours.toFixed(1)} hours for the day, exceeding the 12-hour daily cap.`,
      );
    }

    // Weekly hours check (warning info included in response, hard at 40+)
    const weekStartDate = new Date(shift.date);
    const dayOfWeek = weekStartDate.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStartDate.setUTCDate(weekStartDate.getUTCDate() + mondayOffset);
    weekStartDate.setUTCHours(0, 0, 0, 0);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7);

    const weekAssignments = await this.prisma.shiftAssignment.findMany({
      where: {
        userId: dto.userId,
        status: { in: ["ASSIGNED", "CONFIRMED"] },
        shift: {
          status: { not: "CANCELLED" },
          date: { gte: weekStartDate, lt: weekEndDate },
        },
      },
      include: { shift: { select: { startTime: true, endTime: true } } },
    });

    const weeklyHours =
      weekAssignments.reduce((sum, a) => {
        return (
          sum +
          (a.shift.endTime.getTime() - a.shift.startTime.getTime()) / 3600000
        );
      }, 0) + shiftDurationHours;

    // Build warning string
    let overtimeWarning: string | null = null;
    if (weeklyHours >= 40) {
      throw new BadRequestException(
        `Assigning this shift would put the staff member at ${weeklyHours.toFixed(1)} hours this week, exceeding the 40-hour weekly limit.`,
      );
    } else if (weeklyHours >= 35) {
      overtimeWarning = `Warning: staff member will be at ${weeklyHours.toFixed(1)} hours this week (approaching 40h limit).`;
    }
    if (dailyHours > 8 && !overtimeWarning) {
      overtimeWarning = `Warning: staff member will work ${dailyHours.toFixed(1)} hours today (exceeds 8h guideline).`;
    }

    // Create assignment
    const assignment = await this.prisma.shiftAssignment.create({
      data: {
        shiftId,
        userId: dto.userId,
        assignedById: userId,
        status: "ASSIGNED",
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return { ...assignment, overtimeWarning };
  }

  /** Remove a staff assignment from a shift. */
  async unassignStaff(
    userId: string,
    role: UserRole,
    shiftId: string,
    assignmentId: string,
  ) {
    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: { shift: true },
    });
    if (!assignment || assignment.shiftId !== shiftId) {
      throw new NotFoundException("Assignment not found");
    }

    await this.assertLocationAccess(userId, role, assignment.shift.locationId);

    await this.prisma.shiftAssignment.update({
      where: { id: assignmentId },
      data: { status: "CANCELLED" },
    });

    return { success: true };
  }

  /** Delete a draft shift entirely. */
  async deleteShift(userId: string, role: UserRole, shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });
    if (!shift) throw new NotFoundException("Shift not found");

    await this.assertLocationAccess(userId, role, shift.locationId);

    if (shift.status === "PUBLISHED") {
      throw new BadRequestException(
        "Cannot delete a published shift. Cancel it instead.",
      );
    }

    await this.prisma.shift.delete({ where: { id: shiftId } });
    return { success: true };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private async assertLocationAccess(
    userId: string,
    role: UserRole,
    locationId: string,
  ) {
    if (role === "ADMIN") return;

    if (role === "STAFF") {
      throw new ForbiddenException("Staff cannot manage shifts");
    }

    // MANAGER — must manage this location
    const manages = await this.prisma.managerLocation.findUnique({
      where: {
        userId_locationId: { userId, locationId },
      },
    });
    if (!manages) {
      throw new ForbiddenException(
        "You do not manage the location for this shift",
      );
    }
  }
}

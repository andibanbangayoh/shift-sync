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
import { AuditService } from "../audit/audit.service";

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

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

    // Staff only see published shifts they're assigned to; admins/managers see all non-cancelled
    const statusFilter =
      role === "STAFF"
        ? { status: "PUBLISHED" as const }
        : { status: { not: "CANCELLED" as const } };

    // STAFF: only shifts where they have an active assignment
    const assignmentFilter =
      role === "STAFF"
        ? {
            assignments: {
              some: {
                userId,
                status: { in: ["ASSIGNED" as const, "CONFIRMED" as const] },
              },
            },
          }
        : {};

    const shifts = await this.prisma.shift.findMany({
      where: {
        ...locationFilter,
        ...statusFilter,
        ...assignmentFilter,
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
    shiftId?: string,
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

    // If a shiftId is provided, run constraint checks against each candidate
    let shift: any = null;
    if (shiftId) {
      shift = await this.prisma.shift.findUnique({
        where: { id: shiftId },
        include: {
          assignments: {
            where: { status: { in: ["ASSIGNED", "CONFIRMED"] } },
          },
          location: { select: { timezone: true } },
        },
      });
    }

    const results = await Promise.all(
      eligible.map(async (u) => {
        const base = {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          skills: u.skills.map((s) => ({
            id: s.skill.id,
            name: s.skill.name,
          })),
        };

        if (!shift) return { ...base, available: true, conflict: null };

        // Already assigned?
        if (shift.assignments.some((a: any) => a.userId === u.id)) {
          return {
            ...base,
            available: false,
            conflict: "Already assigned to this shift",
          };
        }

        // Check overlapping
        const overlapping = await this.prisma.shiftAssignment.findFirst({
          where: {
            userId: u.id,
            status: { in: ["ASSIGNED", "CONFIRMED"] },
            shift: {
              status: { not: "CANCELLED" },
              startTime: { lt: shift.endTime },
              endTime: { gt: shift.startTime },
            },
          },
          include: {
            shift: { include: { location: { select: { name: true } } } },
          },
        });
        if (overlapping) {
          return {
            ...base,
            available: false,
            conflict: `Overlapping shift at ${overlapping.shift.location.name}`,
          };
        }

        // Check 10h rest
        const tenHBefore = new Date(shift.startTime.getTime() - 10 * 3600000);
        const tenHAfter = new Date(shift.endTime.getTime() + 10 * 3600000);
        const restVio = await this.prisma.shiftAssignment.findFirst({
          where: {
            userId: u.id,
            status: { in: ["ASSIGNED", "CONFIRMED"] },
            shift: {
              status: { not: "CANCELLED" },
              OR: [
                { endTime: { gt: tenHBefore, lte: shift.startTime } },
                { startTime: { gte: shift.endTime, lt: tenHAfter } },
              ],
            },
          },
        });
        if (restVio) {
          return {
            ...base,
            available: false,
            conflict: "Needs 10h rest between shifts",
          };
        }

        return { ...base, available: true, conflict: null };
      }),
    );

    // Sort: available first, then alphabetically
    results.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return a.lastName.localeCompare(b.lastName);
    });

    return results;
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
    if (created.length === 1) {
      await this.audit.log({
        userId,
        action: "SHIFT_CREATED",
        entityType: "SHIFT",
        entityId: created[0].id,
        afterState: {
          locationId: dto.locationId,
          date: dto.date,
          startTime: dto.startTime,
          endTime: dto.endTime,
          headcount: dto.headcount,
        },
      });
      return created[0];
    }

    for (const s of created) {
      await this.audit.log({
        userId,
        action: "SHIFT_CREATED",
        entityType: "SHIFT",
        entityId: s.id,
        afterState: {
          locationId: dto.locationId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          headcount: dto.headcount,
          recurrence,
        },
      });
    }
    return created;
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

    const beforeState = {
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      status: shift.status,
      headcount: shift.headcount,
    };

    const updated = await this.prisma.shift.update({
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

    await this.audit.log({
      userId,
      action:
        dto.status === "PUBLISHED" && !shift.publishedAt
          ? "SHIFT_PUBLISHED"
          : "SHIFT_UPDATED",
      entityType: "SHIFT",
      entityId: shiftId,
      beforeState,
      afterState: {
        date: updated.date,
        startTime: updated.startTime,
        endTime: updated.endTime,
        status: updated.status,
        headcount: updated.headcount,
      },
    });

    return updated;
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

    const beforeMove = {
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
    };

    const moved = await this.prisma.shift.update({
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

    await this.audit.log({
      userId,
      action: "SHIFT_MOVED",
      entityType: "SHIFT",
      entityId: shiftId,
      beforeState: beforeMove,
      afterState: {
        date: moved.date,
        startTime: moved.startTime,
        endTime: moved.endTime,
      },
    });

    return moved;
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
        location: { select: { id: true, name: true, timezone: true } },
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

    // ── Availability check ──────────────────────────────────────────────
    const shiftTz = shift.location.timezone;
    const shiftStartLocal = new Date(
      shift.startTime.toLocaleString("en-US", { timeZone: shiftTz }),
    );
    const shiftEndLocal = new Date(
      shift.endTime.toLocaleString("en-US", { timeZone: shiftTz }),
    );
    const shiftDow = shiftStartLocal.getDay(); // 0=Sun

    // Check for availability exceptions on this date
    const exceptionDate = new Date(shift.date);
    const exception = await this.prisma.availabilityException.findFirst({
      where: { userId: dto.userId, date: exceptionDate },
    });
    if (exception) {
      if (!exception.isAvailable) {
        throw new BadRequestException(
          `Staff member is unavailable on this date${exception.reason ? ` (${exception.reason})` : ""}.`,
        );
      }
      // If isAvailable with time windows, check them
      if (exception.startTime && exception.endTime) {
        const startHHMM = `${String(shiftStartLocal.getHours()).padStart(2, "0")}:${String(shiftStartLocal.getMinutes()).padStart(2, "0")}`;
        const endHHMM = `${String(shiftEndLocal.getHours()).padStart(2, "0")}:${String(shiftEndLocal.getMinutes()).padStart(2, "0")}`;
        if (startHHMM < exception.startTime || endHHMM > exception.endTime) {
          throw new BadRequestException(
            `Shift time (${startHHMM}–${endHHMM}) falls outside the staff member's available exception window (${exception.startTime}–${exception.endTime}).`,
          );
        }
      }
      // Exception with isAvailable=true and no time limits = all day available, skip recurring check
    } else {
      // Check recurring availability for the shift's day of week
      const availSlots = await this.prisma.availability.findMany({
        where: {
          userId: dto.userId,
          dayOfWeek: shiftDow,
          effectiveFrom: { lte: shift.startTime },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: shift.startTime } },
          ],
        },
      });

      if (availSlots.length > 0) {
        const startHHMM = `${String(shiftStartLocal.getHours()).padStart(2, "0")}:${String(shiftStartLocal.getMinutes()).padStart(2, "0")}`;
        const endHHMM = `${String(shiftEndLocal.getHours()).padStart(2, "0")}:${String(shiftEndLocal.getMinutes()).padStart(2, "0")}`;

        const fitsSlot = availSlots.some(
          (slot) => startHHMM >= slot.startTime && endHHMM <= slot.endTime,
        );
        if (!fitsSlot) {
          const windows = availSlots
            .map((s) => `${s.startTime}–${s.endTime}`)
            .join(", ");
          throw new BadRequestException(
            `Shift time (${startHHMM}–${endHHMM}) falls outside the staff member's availability on ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][shiftDow]} (available: ${windows}).`,
          );
        }
      }
      // No availability slots on this day = no restriction set (staff hasn't defined availability for this day)
    }

    // ── Wrap conflict checks + insert in a transaction for race safety ──

    const result = await this.prisma.$transaction(async (tx) => {
      // Check double-booking (overlapping published/draft shifts)
      const overlapping = await tx.shiftAssignment.findFirst({
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

      const restViolation = await tx.shiftAssignment.findFirst({
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

      // ── Overtime / daily-hour checks ──────────────────────────────────

      const shiftDurationHours =
        (shift.endTime.getTime() - shift.startTime.getTime()) / 3600000;

      // Hard block: single shift > 12 hours
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

      const sameDayAssignments = await tx.shiftAssignment.findMany({
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

      // Weekly hours check
      const weekStartDate = new Date(shift.date);
      const dayOfWeek = weekStartDate.getUTCDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStartDate.setUTCDate(weekStartDate.getUTCDate() + mondayOffset);
      weekStartDate.setUTCHours(0, 0, 0, 0);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7);

      const weekAssignments = await tx.shiftAssignment.findMany({
        where: {
          userId: dto.userId,
          status: { in: ["ASSIGNED", "CONFIRMED"] },
          shift: {
            status: { not: "CANCELLED" },
            date: { gte: weekStartDate, lt: weekEndDate },
          },
        },
        include: {
          shift: { select: { startTime: true, endTime: true, date: true } },
        },
      });

      const weeklyHours =
        weekAssignments.reduce((sum, a) => {
          return (
            sum +
            (a.shift.endTime.getTime() - a.shift.startTime.getTime()) / 3600000
          );
        }, 0) + shiftDurationHours;

      // ── Consecutive day tracking ──────────────────────────────────────
      const workedDays = new Set<number>();
      for (const a of weekAssignments) {
        const d = new Date(a.shift.date);
        workedDays.add(d.getUTCDay());
      }
      workedDays.add(new Date(shift.date).getUTCDay());

      const consecutiveDays = workedDays.size;

      // 7th consecutive day → hard block unless manager override
      if (consecutiveDays >= 7 && !dto.overrideReason) {
        throw new BadRequestException(
          `This would be the staff member's 7th day working this week. ` +
            `A manager override with documented reason is required. ` +
            `Pass "overrideReason" to proceed.`,
        );
      }

      // Build warnings per REQUIREMENTS: warning at 35+ (approaching 40h), 40+ is overtime
      const warnings: string[] = [];

      if (weeklyHours >= 40) {
        warnings.push(
          `Staff member will be at ${weeklyHours.toFixed(1)} hours this week (overtime).`,
        );
      } else if (weeklyHours >= 35) {
        warnings.push(
          `Staff member will be at ${weeklyHours.toFixed(1)} hours this week (approaching 40h).`,
        );
      }
      if (dailyHours > 8) {
        warnings.push(
          `Staff member will work ${dailyHours.toFixed(1)} hours today (exceeds 8h guideline).`,
        );
      }
      if (consecutiveDays >= 7) {
        warnings.push(
          `7th consecutive day — override approved: "${dto.overrideReason}".`,
        );
      } else if (consecutiveDays >= 6) {
        warnings.push(
          `This is the staff member's 6th consecutive day working this week.`,
        );
      }

      // Create assignment inside the transaction
      const assignment = await tx.shiftAssignment.create({
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

      return {
        assignment,
        overtimeWarning: warnings.length > 0 ? warnings.join(" ") : null,
      };
    });

    await this.audit.log({
      userId,
      action: "STAFF_ASSIGNED",
      entityType: "SHIFT_ASSIGNMENT",
      entityId: result.assignment.id,
      afterState: {
        shiftId,
        staffUserId: dto.userId,
        assignedBy: userId,
        overrideReason: dto.overrideReason || undefined,
      },
    });

    return { ...result.assignment, overtimeWarning: result.overtimeWarning };
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

    await this.audit.log({
      userId,
      action: "STAFF_UNASSIGNED",
      entityType: "SHIFT_ASSIGNMENT",
      entityId: assignmentId,
      beforeState: {
        shiftId,
        staffUserId: assignment.userId,
        status: assignment.status,
      },
      afterState: { status: "CANCELLED" },
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

    await this.audit.log({
      userId,
      action: "SHIFT_DELETED",
      entityType: "SHIFT",
      entityId: shiftId,
      beforeState: {
        locationId: shift.locationId,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        status: shift.status,
      },
    });

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

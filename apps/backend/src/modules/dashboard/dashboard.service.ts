import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole } from "@prisma/client";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Schedule Fairness Analytics — hours distribution, premium shifts,
   * fairness scoring, over/under-scheduled staff.
   */
  async getAnalytics(
    callerId: string,
    callerRole: UserRole,
    filters: { from?: string; to?: string; locationId?: string },
  ) {
    // Date range defaults to last 4 weeks
    const to = filters.to ? new Date(filters.to) : new Date();
    const from = filters.from
      ? new Date(filters.from)
      : new Date(to.getTime() - 28 * 86400000);

    // Role-scoped location filter
    let managedLocationIds: string[] | null = null;
    if (callerRole === "MANAGER") {
      const managed = await this.prisma.managerLocation.findMany({
        where: { userId: callerId },
        select: { locationId: true },
      });
      managedLocationIds = managed.map((m) => m.locationId);
    }

    const locationWhere: any = {};
    if (filters.locationId) {
      locationWhere.locationId = filters.locationId;
    } else if (managedLocationIds) {
      locationWhere.locationId = { in: managedLocationIds };
    }

    // Fetch all active assignments in range
    const assignments = await this.prisma.shiftAssignment.findMany({
      where: {
        status: { in: ["ASSIGNED", "CONFIRMED"] },
        shift: {
          ...locationWhere,
          status: { not: "CANCELLED" },
          date: { gte: from, lte: to },
        },
      },
      include: {
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            date: true,
            locationId: true,
            location: { select: { name: true } },
            requiredSkill: { select: { name: true } },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            desiredWeeklyHours: true,
            role: true,
          },
        },
      },
    });

    // ── Hours Distribution ────────────────────────────────────────────
    const staffMap = new Map<
      string,
      {
        user: (typeof assignments)[0]["user"];
        totalHours: number;
        premiumShifts: number;
        regularShifts: number;
        shiftCount: number;
      }
    >();

    for (const a of assignments) {
      const hours =
        (a.shift.endTime.getTime() - a.shift.startTime.getTime()) / 3600000;

      // Premium = Friday/Saturday evenings (shift starts at 5pm or later)
      const dayOfWeek = a.shift.date.getUTCDay(); // 0=Sun .. 6=Sat
      const startHour = a.shift.startTime.getUTCHours();
      const isPremium = (dayOfWeek === 5 || dayOfWeek === 6) && startHour >= 17;

      const existing = staffMap.get(a.user.id);
      if (existing) {
        existing.totalHours += hours;
        existing.shiftCount += 1;
        if (isPremium) existing.premiumShifts += 1;
        else existing.regularShifts += 1;
      } else {
        staffMap.set(a.user.id, {
          user: a.user,
          totalHours: hours,
          shiftCount: 1,
          premiumShifts: isPremium ? 1 : 0,
          regularShifts: isPremium ? 0 : 1,
        });
      }
    }

    // Calculate weeks in range
    const weeksInRange = Math.max(
      1,
      Math.round((to.getTime() - from.getTime()) / (7 * 86400000)),
    );

    const staffAnalytics = Array.from(staffMap.values()).map((entry) => {
      const desired = (entry.user.desiredWeeklyHours ?? 40) * weeksInRange;
      const difference = Math.round((entry.totalHours - desired) * 10) / 10;
      return {
        id: entry.user.id,
        firstName: entry.user.firstName,
        lastName: entry.user.lastName,
        email: entry.user.email,
        role: entry.user.role,
        desiredWeeklyHours: entry.user.desiredWeeklyHours ?? 40,
        totalHours: Math.round(entry.totalHours * 10) / 10,
        avgWeeklyHours: Math.round((entry.totalHours / weeksInRange) * 10) / 10,
        desiredTotal: desired,
        difference,
        shiftCount: entry.shiftCount,
        premiumShifts: entry.premiumShifts,
        regularShifts: entry.regularShifts,
      };
    });

    // Sort by absolute difference for fairness review
    staffAnalytics.sort(
      (a, b) => Math.abs(b.difference) - Math.abs(a.difference),
    );

    // ── Summary Stats ─────────────────────────────────────────────────
    const totalStaff = staffAnalytics.length;
    const avgHours =
      totalStaff > 0
        ? Math.round(
            (staffAnalytics.reduce((s, a) => s + a.avgWeeklyHours, 0) /
              totalStaff) *
              10,
          ) / 10
        : 0;
    const overScheduled = staffAnalytics.filter((s) => s.difference > 0);
    const underScheduled = staffAnalytics.filter((s) => s.difference < 0);
    const balanced = staffAnalytics.filter((s) => s.difference === 0);

    // Premium fairness score (std deviation of premium shift counts)
    const premiumCounts = staffAnalytics.map((s) => s.premiumShifts);
    const avgPremium =
      premiumCounts.length > 0
        ? premiumCounts.reduce((a, b) => a + b, 0) / premiumCounts.length
        : 0;
    const premiumVariance =
      premiumCounts.length > 0
        ? premiumCounts.reduce((s, c) => s + Math.pow(c - avgPremium, 2), 0) /
          premiumCounts.length
        : 0;
    const premiumStdDev = Math.sqrt(premiumVariance);
    // Fairness: 100 = perfect, drops as std dev increases
    const fairnessScore = Math.max(
      0,
      Math.round((100 - premiumStdDev * 20) * 10) / 10,
    );

    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        weeks: weeksInRange,
      },
      summary: {
        totalStaff,
        avgWeeklyHours: avgHours,
        overScheduledCount: overScheduled.length,
        underScheduledCount: underScheduled.length,
        balancedCount: balanced.length,
        totalPremiumShifts: premiumCounts.reduce((a, b) => a + b, 0),
        fairnessScore,
      },
      staff: staffAnalytics,
    };
  }

  async getStats(userId: string, role: UserRole) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // Get location IDs the user manages (for MANAGER role)
    // or is certified at (for STAFF role)
    let managedLocationIds: string[] = [];
    if (role === "MANAGER") {
      const managed = await this.prisma.managerLocation.findMany({
        where: { userId },
        select: { locationId: true },
      });
      managedLocationIds = managed.map((m) => m.locationId);
    } else if (role === "STAFF") {
      const certs = await this.prisma.staffLocationCertification.findMany({
        where: { userId, revokedAt: null },
        select: { locationId: true },
      });
      managedLocationIds = certs.map((c) => c.locationId);
    }

    const locationFilter =
      role === "ADMIN" ? {} : { locationId: { in: managedLocationIds } };

    // On Duty Now — shifts happening right now with assigned staff
    const onDutyShifts = await this.prisma.shift.findMany({
      where: {
        ...locationFilter,
        startTime: { lte: now },
        endTime: { gte: now },
        status: "PUBLISHED",
      },
      include: {
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
        location: { select: { id: true, name: true, timezone: true } },
        requiredSkill: { select: { name: true } },
      },
    });

    // Flatten on-duty staff
    const onDutyNow = onDutyShifts.flatMap((shift) =>
      shift.assignments.map((a) => ({
        id: a.id,
        user: a.user,
        shiftId: shift.id,
        location: shift.location,
        skill: shift.requiredSkill.name,
        endTime: shift.endTime.toISOString(),
      })),
    );

    // Today's shifts with assignment counts
    const todaysShifts = await this.prisma.shift.findMany({
      where: {
        ...locationFilter,
        date: { gte: startOfDay, lte: endOfDay },
        status: { not: "CANCELLED" },
      },
      include: {
        assignments: {
          where: { status: { in: ["ASSIGNED", "CONFIRMED"] } },
        },
        location: { select: { id: true, name: true, timezone: true } },
        requiredSkill: { select: { name: true } },
      },
    });

    const todaysOnDutyCount = todaysShifts.reduce(
      (sum, s) => sum + s.assignments.length,
      0,
    );

    // Unassigned shifts — published shifts where assignments < headcount
    const unassignedShifts = await this.prisma.shift.findMany({
      where: {
        ...locationFilter,
        startTime: { gte: now },
        status: "PUBLISHED",
      },
      include: {
        assignments: {
          where: { status: { in: ["ASSIGNED", "CONFIRMED"] } },
        },
        location: { select: { id: true, name: true, timezone: true } },
        requiredSkill: { select: { name: true } },
      },
    });

    const unassignedCount = unassignedShifts.filter(
      (s) => s.assignments.length < s.headcount,
    ).length;

    // Overtime alerts — staff with > 35 hours this week
    const weekAssignments = await this.prisma.shiftAssignment.findMany({
      where: {
        status: { in: ["ASSIGNED", "CONFIRMED"] },
        shift: {
          ...locationFilter,
          date: { gte: startOfWeek, lt: endOfWeek },
          status: { not: "CANCELLED" },
        },
      },
      include: {
        shift: { select: { startTime: true, endTime: true } },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            desiredWeeklyHours: true,
          },
        },
      },
    });

    // Group hours by user
    const hoursByUser = new Map<
      string,
      {
        user: {
          id: string;
          firstName: string;
          lastName: string;
          desiredWeeklyHours: number | null;
        };
        hours: number;
      }
    >();
    for (const a of weekAssignments) {
      const hours =
        (a.shift.endTime.getTime() - a.shift.startTime.getTime()) / 3600000;
      const existing = hoursByUser.get(a.user.id);
      if (existing) {
        existing.hours += hours;
      } else {
        hoursByUser.set(a.user.id, { user: a.user, hours });
      }
    }

    // Calculate available hours from Availability model for each user
    const userIds = Array.from(hoursByUser.keys());
    const availabilities = await this.prisma.availability.findMany({
      where: {
        userId: { in: userIds },
        effectiveFrom: { lte: endOfWeek },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: startOfWeek } }],
      },
    });

    const availableHoursByUser = new Map<string, number>();
    for (const slot of availabilities) {
      const [startH, startM] = slot.startTime.split(":").map(Number);
      const [endH, endM] = slot.endTime.split(":").map(Number);
      const slotHours = endH + endM / 60 - (startH + startM / 60);
      const current = availableHoursByUser.get(slot.userId) || 0;
      availableHoursByUser.set(slot.userId, current + slotHours);
    }

    // Overtime alerts per REQUIREMENTS: warning at 35+ hours (approaching 40h)
    // Also flag when assigned hours exceed the staff member's total available hours
    const overtimeAlerts = Array.from(hoursByUser.values())
      .filter((entry) => {
        const available = availableHoursByUser.get(entry.user.id);
        return (
          entry.hours >= 35 ||
          (available !== undefined && entry.hours > available)
        );
      })
      .map((entry) => ({
        userId: entry.user.id,
        firstName: entry.user.firstName,
        lastName: entry.user.lastName,
        hoursAssigned: Math.round(entry.hours * 10) / 10,
        desiredHours: entry.user.desiredWeeklyHours || 40,
        availableHours:
          availableHoursByUser.get(entry.user.id) !== undefined
            ? Math.round(
                (availableHoursByUser.get(entry.user.id) as number) * 10,
              ) / 10
            : null,
      }))
      .sort((a, b) => b.hoursAssigned - a.hoursAssigned);

    // Pending swap requests
    const swapFilter =
      role === "STAFF"
        ? { requestorUserId: userId }
        : role === "MANAGER"
          ? {
              requestorAssignment: {
                shift: { locationId: { in: managedLocationIds } },
              },
            }
          : {};

    const pendingSwaps = await this.prisma.swapRequest.count({
      where: { ...swapFilter, status: "PENDING" },
    });

    // Upcoming shifts (next 24h)
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcomingFilter =
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

    const upcomingShifts = await this.prisma.shift.findMany({
      where: {
        ...locationFilter,
        ...upcomingFilter,
        startTime: { gte: now, lte: next24h },
        status: { not: "CANCELLED" },
      },
      include: {
        assignments: {
          where: { status: { in: ["ASSIGNED", "CONFIRMED"] } },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        location: { select: { id: true, name: true, timezone: true } },
        requiredSkill: { select: { name: true } },
      },
      orderBy: { startTime: "asc" },
      take: 10,
    });

    // Recent notifications for the user
    const recentNotifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const unreadNotificationCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    // Staff-specific: hours this week
    let myHoursThisWeek = 0;
    if (role === "STAFF") {
      const myAssignments = weekAssignments.filter((a) => a.user.id === userId);
      myHoursThisWeek = myAssignments.reduce(
        (sum, a) =>
          sum +
          (a.shift.endTime.getTime() - a.shift.startTime.getTime()) / 3600000,
        0,
      );
    }

    return {
      onDutyNow,
      todaysOnDutyCount,
      unassignedCount,
      overtimeAlerts,
      pendingSwaps,
      upcomingShifts: upcomingShifts.map((s) => ({
        id: s.id,
        location: s.location,
        skill: s.requiredSkill.name,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        headcount: s.headcount,
        assignedCount: s.assignments.length,
        assignments: s.assignments.map((a) => ({
          id: a.id,
          user: a.user,
        })),
      })),
      recentNotifications,
      unreadNotificationCount,
      myHoursThisWeek: Math.round(myHoursThisWeek * 10) / 10,
    };
  }
}

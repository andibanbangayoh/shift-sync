import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole } from "@prisma/client";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

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
    let managedLocationIds: string[] = [];
    if (role === "MANAGER") {
      const managed = await this.prisma.managerLocation.findMany({
        where: { userId },
        select: { locationId: true },
      });
      managedLocationIds = managed.map((m) => m.locationId);
    }

    const locationFilter =
      role === "MANAGER" ? { locationId: { in: managedLocationIds } } : {};

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

    const overtimeAlerts = Array.from(hoursByUser.values())
      .filter((entry) => entry.hours >= 35)
      .map((entry) => ({
        userId: entry.user.id,
        firstName: entry.user.firstName,
        lastName: entry.user.lastName,
        hoursAssigned: Math.round(entry.hours * 10) / 10,
        desiredHours: entry.user.desiredWeeklyHours || 40,
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

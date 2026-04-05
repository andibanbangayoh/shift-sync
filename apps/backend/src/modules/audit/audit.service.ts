import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole } from "@prisma/client";

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log an action to the audit trail.
   */
  async log(params: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeState?: Record<string, any> | null;
    afterState?: Record<string, any> | null;
    reason?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        beforeState: params.beforeState ?? undefined,
        afterState: params.afterState ?? undefined,
        reason: params.reason,
      },
    });
  }

  /**
   * Query audit logs with filters — role-scoped.
   */
  async findAll(
    callerId: string,
    callerRole: UserRole,
    filters: {
      entityType?: string;
      entityId?: string;
      userId?: string;
      from?: string;
      to?: string;
      action?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 30, 1), 100);
    const skip = (page - 1) * limit;

    // Managers can only see logs for shifts at their managed locations
    let locationFilter: any = undefined;
    if (callerRole === "MANAGER") {
      const managed = await this.prisma.managerLocation.findMany({
        where: { userId: callerId },
        select: { locationId: true },
      });
      const locIds = managed.map((m) => m.locationId);
      // We'll filter after query for SHIFT entities, or allow all for other types the manager created
      locationFilter = locIds;
    }

    const where: any = {};
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    // For managers, scope to their own actions or shift-related entities at their locations
    if (callerRole === "MANAGER" && locationFilter) {
      where.OR = [
        { userId: callerId },
        {
          entityType: "SHIFT",
          entityId: {
            in: (
              await this.prisma.shift.findMany({
                where: { locationId: { in: locationFilter } },
                select: { id: true },
              })
            ).map((s) => s.id),
          },
        },
        {
          entityType: "SHIFT_ASSIGNMENT",
          entityId: {
            in: (
              await this.prisma.shiftAssignment.findMany({
                where: {
                  shift: { locationId: { in: locationFilter } },
                },
                select: { id: true },
              })
            ).map((a) => a.id),
          },
        },
        {
          entityType: "SWAP_REQUEST",
          entityId: {
            in: (
              await this.prisma.swapRequest.findMany({
                where: {
                  requestorAssignment: {
                    shift: { locationId: { in: locationFilter } },
                  },
                },
                select: { id: true },
              })
            ).map((s) => s.id),
          },
        },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          entityType: true,
          beforeState: true,
          afterState: true,
          reason: true,
          createdAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Export audit logs as CSV text.
   */
  async exportCsv(
    callerId: string,
    callerRole: UserRole,
    filters: {
      entityType?: string;
      from?: string;
      to?: string;
      action?: string;
    },
  ): Promise<string> {
    const where: any = {};
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.action) where.action = filters.action;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        beforeState: true,
        afterState: true,
        reason: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const escCsv = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const header =
      "Date,Action,Entity Type,Entity ID,User,Email,Role,Before State,After State,Reason";
    const rows = logs.map((l) =>
      [
        l.createdAt.toISOString(),
        l.action,
        l.entityType,
        l.entityId,
        `${l.user.firstName} ${l.user.lastName}`,
        l.user.email,
        l.user.role,
        escCsv(l.beforeState),
        escCsv(l.afterState),
        escCsv(l.reason),
      ].join(","),
    );

    return [header, ...rows].join("\n");
  }
}

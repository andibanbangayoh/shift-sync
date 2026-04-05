import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { UserRole, SwapRequestStatus } from "@prisma/client";
import {
  CreateSwapRequestDto,
  ResolveSwapDto,
  RespondSwapDto,
} from "./swaps.dto";

const SWAP_INCLUDE = {
  requestor: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  requestorAssignment: {
    include: {
      shift: {
        include: {
          location: { select: { id: true, name: true, timezone: true } },
          requiredSkill: { select: { id: true, name: true } },
        },
      },
    },
  },
  targetUser: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  targetAssignment: {
    include: {
      shift: {
        include: {
          location: { select: { id: true, name: true, timezone: true } },
          requiredSkill: { select: { id: true, name: true } },
        },
      },
    },
  },
  resolvedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
};

@Injectable()
export class SwapsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────

  private async getManagedLocationIds(userId: string): Promise<string[]> {
    const locs = await this.prisma.managerLocation.findMany({
      where: { userId },
      select: { locationId: true },
    });
    return locs.map((l) => l.locationId);
  }

  /** Expire any PENDING/ACCEPTED requests whose expiresAt has passed. */
  private async expireStaleRequests(): Promise<number> {
    const { count } = await this.prisma.swapRequest.updateMany({
      where: {
        status: { in: ["PENDING", "ACCEPTED"] },
        expiresAt: { lte: new Date() },
      },
      data: { status: "EXPIRED" },
    });
    return count;
  }

  private buildWhereForRole(
    userId: string,
    role: UserRole,
    managedLocationIds: string[],
  ) {
    if (role === "ADMIN") return {};
    if (role === "MANAGER") {
      return {
        requestorAssignment: {
          shift: { locationId: { in: managedLocationIds } },
        },
      };
    }
    // STAFF — see only their own requests + requests targeting them
    return {
      OR: [{ requestorUserId: userId }, { targetUserId: userId }],
    };
  }

  // ── List ─────────────────────────────────────────────────────────────

  async listSwapRequests(
    userId: string,
    role: UserRole,
    status?: SwapRequestStatus,
  ) {
    const managedLocationIds =
      role === "MANAGER" ? await this.getManagedLocationIds(userId) : [];

    // Auto-expire stale requests before listing
    await this.expireStaleRequests();

    const where: any = {
      ...this.buildWhereForRole(userId, role, managedLocationIds),
    };
    if (status) where.status = status;

    return this.prisma.swapRequest.findMany({
      where,
      include: SWAP_INCLUDE,
      orderBy: { requestedAt: "desc" },
    });
  }

  // ── Stats ────────────────────────────────────────────────────────────

  async getSwapStats(userId: string, role: UserRole) {
    const managedLocationIds =
      role === "MANAGER" ? await this.getManagedLocationIds(userId) : [];
    const base = this.buildWhereForRole(userId, role, managedLocationIds);

    // Auto-expire stale requests before counting
    await this.expireStaleRequests();

    const [pending, accepted, approved, rejected, cancelled, expired] =
      await Promise.all([
        this.prisma.swapRequest.count({
          where: { ...base, status: "PENDING" },
        }),
        this.prisma.swapRequest.count({
          where: { ...base, status: "ACCEPTED" },
        }),
        this.prisma.swapRequest.count({
          where: { ...base, status: "MANAGER_APPROVED" },
        }),
        this.prisma.swapRequest.count({
          where: { ...base, status: "REJECTED" },
        }),
        this.prisma.swapRequest.count({
          where: { ...base, status: "CANCELLED" },
        }),
        this.prisma.swapRequest.count({
          where: { ...base, status: "EXPIRED" },
        }),
      ]);

    return {
      pending,
      accepted,
      approved,
      rejected,
      cancelled,
      expired,
      needsAction: pending + accepted,
    };
  }

  // ── Create (staff creates a swap/drop) ───────────────────────────────

  async createSwapRequest(userId: string, dto: CreateSwapRequestDto) {
    // Verify the assignment belongs to this user
    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id: dto.requestorAssignmentId },
      include: { shift: true },
    });
    if (!assignment || assignment.userId !== userId) {
      throw new BadRequestException(
        "You can only create swap/drop requests for your own assignments",
      );
    }
    if (assignment.status === "CANCELLED") {
      throw new BadRequestException("This assignment is already cancelled");
    }

    // Check max 3 pending requests
    const pendingCount = await this.prisma.swapRequest.count({
      where: {
        requestorUserId: userId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    });
    if (pendingCount >= 3) {
      throw new BadRequestException(
        "You cannot have more than 3 pending swap/drop requests at once",
      );
    }

    // Check shift is in the future
    if (assignment.shift.startTime <= new Date()) {
      throw new BadRequestException(
        "Cannot request swap/drop for a shift that has already started",
      );
    }

    // For SWAP requests — validate the target
    let targetUserId = dto.targetUserId;
    if (dto.type === "SWAP") {
      if (!dto.targetUserId) {
        throw new BadRequestException("SWAP requests require a target user");
      }
      // Verify the target user is certified at the same location
      const targetCert = await this.prisma.staffLocationCertification.findFirst(
        {
          where: {
            userId: dto.targetUserId,
            locationId: assignment.shift.locationId,
            revokedAt: null,
          },
        },
      );
      if (!targetCert) {
        throw new BadRequestException(
          "Target user is not certified at this shift's location",
        );
      }
      targetUserId = dto.targetUserId;
    }

    // Set expiry — 24h before shift starts
    const expiresAt = new Date(
      assignment.shift.startTime.getTime() - 24 * 60 * 60 * 1000,
    );
    if (expiresAt <= new Date()) {
      throw new BadRequestException(
        "Cannot create request — shift starts within 24 hours",
      );
    }

    const swapRequest = await this.prisma.swapRequest.create({
      data: {
        type: dto.type,
        requestorUserId: userId,
        requestorAssignmentId: dto.requestorAssignmentId,
        targetAssignmentId: dto.targetAssignmentId || null,
        targetUserId: targetUserId || null,
        status: "PENDING",
        expiresAt,
      },
      include: SWAP_INCLUDE,
    });

    // Notify target (if swap) and managers
    const notifications: any[] = [];

    if (dto.type === "SWAP" && targetUserId) {
      notifications.push({
        userId: targetUserId,
        type: "SWAP_REQUESTED",
        title: "Swap Request Received",
        message: `${swapRequest.requestor.firstName} ${swapRequest.requestor.lastName} wants to swap shifts with you.`,
        data: { swapRequestId: swapRequest.id },
      });
    }

    // Notify managers of the shift's location
    const managersAtLocation = await this.prisma.managerLocation.findMany({
      where: {
        locationId: assignment.shift.locationId,
      },
      select: { userId: true },
    });
    // Also notify admins
    const admins = await this.prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });
    const managerAndAdminIds = [
      ...new Set([
        ...managersAtLocation.map((m) => m.userId),
        ...admins.map((a) => a.id),
      ]),
    ];

    for (const mId of managerAndAdminIds) {
      notifications.push({
        userId: mId,
        type: "SWAP_REQUESTED",
        title: `${dto.type === "SWAP" ? "Swap" : "Drop"} Request`,
        message: `${swapRequest.requestor.firstName} ${swapRequest.requestor.lastName} requested to ${dto.type.toLowerCase()} a shift.`,
        data: { swapRequestId: swapRequest.id },
      });
    }

    if (notifications.length > 0) {
      try {
        await this.notifications.sendMany(notifications);
      } catch {
        // Notification delivery is best-effort — don't fail the swap request
      }
    }

    await this.audit.log({
      userId,
      action: dto.type === "SWAP" ? "SWAP_REQUESTED" : "DROP_REQUESTED",
      entityType: "SWAP_REQUEST",
      entityId: swapRequest.id,
      afterState: {
        type: dto.type,
        requestor: `${swapRequest.requestor.firstName} ${swapRequest.requestor.lastName}`,
        requestorEmail: swapRequest.requestor.email,
        target: swapRequest.targetUser
          ? `${swapRequest.targetUser.firstName} ${swapRequest.targetUser.lastName}`
          : null,
        shiftLocation: swapRequest.requestorAssignment.shift.location.name,
        shiftDate: swapRequest.requestorAssignment.shift.startTime,
        status: "PENDING",
      },
    });

    return swapRequest;
  }

  // ── Respond (target staff accepts/rejects a SWAP) ────────────────────

  async respondToSwap(userId: string, swapId: string, dto: RespondSwapDto) {
    const swap = await this.prisma.swapRequest.findUnique({
      where: { id: swapId },
      include: { requestor: { select: { firstName: true, lastName: true } } },
    });
    if (!swap) throw new NotFoundException("Swap request not found");
    if (swap.targetUserId !== userId) {
      throw new ForbiddenException(
        "Only the target staff member can respond to this swap",
      );
    }
    if (swap.status !== "PENDING") {
      throw new BadRequestException(
        `Cannot respond — request is already ${swap.status}`,
      );
    }
    if (swap.expiresAt && swap.expiresAt <= new Date()) {
      await this.prisma.swapRequest.update({
        where: { id: swapId },
        data: { status: "EXPIRED" },
      });
      throw new BadRequestException("This swap request has expired");
    }

    const newStatus: SwapRequestStatus =
      dto.action === "accept" ? "ACCEPTED" : "REJECTED";

    const updated = await this.prisma.swapRequest.update({
      where: { id: swapId },
      data: { status: newStatus, respondedAt: new Date() },
      include: SWAP_INCLUDE,
    });

    // Notify the requestor
    await this.notifications.send({
      userId: swap.requestorUserId,
      type: dto.action === "accept" ? "SWAP_ACCEPTED" : "SWAP_REJECTED",
      title: dto.action === "accept" ? "Swap Accepted" : "Swap Rejected",
      message:
        dto.action === "accept"
          ? "Your swap request has been accepted and is awaiting manager approval."
          : "Your swap request was rejected by the target staff member.",
      data: { swapRequestId: swapId },
    });

    await this.audit.log({
      userId,
      action:
        dto.action === "accept" ? "SWAP_ACCEPTED" : "SWAP_REJECTED_BY_TARGET",
      entityType: "SWAP_REQUEST",
      entityId: swapId,
      beforeState: { status: "PENDING" },
      afterState: {
        status: newStatus,
        respondedBy: `${updated.targetUser?.firstName} ${updated.targetUser?.lastName}`,
      },
    });

    return updated;
  }

  // ── Cancel (requestor cancels their own pending request) ─────────────

  async cancelSwapRequest(userId: string, swapId: string) {
    const swap = await this.prisma.swapRequest.findUnique({
      where: { id: swapId },
    });
    if (!swap) throw new NotFoundException("Swap request not found");
    if (swap.requestorUserId !== userId) {
      throw new ForbiddenException(
        "You can only cancel your own swap requests",
      );
    }
    if (!["PENDING", "ACCEPTED"].includes(swap.status)) {
      throw new BadRequestException(
        `Cannot cancel a request with status ${swap.status}`,
      );
    }

    const updated = await this.prisma.swapRequest.update({
      where: { id: swapId },
      data: {
        status: "CANCELLED",
        cancellationReason: "Cancelled by requestor",
        resolvedAt: new Date(),
      },
      include: SWAP_INCLUDE,
    });

    // Notify target if they existed
    if (swap.targetUserId) {
      await this.notifications.send({
        userId: swap.targetUserId,
        type: "SWAP_CANCELLED",
        title: "Swap Request Cancelled",
        message: "A swap request involving you has been cancelled.",
        data: { swapRequestId: swapId },
      });
    }

    await this.audit.log({
      userId,
      action: "SWAP_CANCELLED",
      entityType: "SWAP_REQUEST",
      entityId: swapId,
      beforeState: { status: swap.status },
      afterState: { status: "CANCELLED" },
    });

    return updated;
  }

  // ── Resolve (manager/admin approves or rejects) ──────────────────────

  async resolveSwapRequest(
    userId: string,
    role: UserRole,
    swapId: string,
    dto: ResolveSwapDto,
  ) {
    const swap = await this.prisma.swapRequest.findUnique({
      where: { id: swapId },
      include: {
        requestorAssignment: { include: { shift: true } },
        targetAssignment: { include: { shift: true } },
      },
    });
    if (!swap) throw new NotFoundException("Swap request not found");

    // STAFF cannot resolve
    if (role === "STAFF") {
      throw new ForbiddenException(
        "Only managers and admins can resolve swap requests",
      );
    }

    // MANAGER can only resolve for their own locations
    if (role === "MANAGER") {
      const managedIds = await this.getManagedLocationIds(userId);
      if (!managedIds.includes(swap.requestorAssignment.shift.locationId)) {
        throw new ForbiddenException("You do not manage this shift's location");
      }
    }

    // Check expiry before allowing resolution
    if (swap.expiresAt && swap.expiresAt <= new Date()) {
      await this.prisma.swapRequest.update({
        where: { id: swapId },
        data: { status: "EXPIRED" },
      });
      throw new BadRequestException("This request has expired");
    }

    // For SWAP: must be ACCEPTED or PENDING (drop requests can be approved from PENDING)
    if (
      swap.type === "SWAP" &&
      swap.status !== "ACCEPTED" &&
      swap.status !== "PENDING"
    ) {
      throw new BadRequestException(
        `SWAP request must be accepted by the target staff first (current status: ${swap.status})`,
      );
    }
    if (swap.type === "DROP" && swap.status !== "PENDING") {
      throw new BadRequestException(
        `DROP request must be in PENDING status (current status: ${swap.status})`,
      );
    }

    if (dto.action === "reject") {
      const updated = await this.prisma.swapRequest.update({
        where: { id: swapId },
        data: {
          status: "REJECTED",
          resolvedById: userId,
          resolvedAt: new Date(),
          cancellationReason: dto.reason || "Rejected by management",
        },
        include: SWAP_INCLUDE,
      });

      // Notify requestor
      await this.notifications.send({
        userId: swap.requestorUserId,
        type: "SWAP_REJECTED",
        title: `${swap.type === "SWAP" ? "Swap" : "Drop"} Request Rejected`,
        message: dto.reason || "Your request was rejected by management.",
        data: { swapRequestId: swapId },
      });

      await this.audit.log({
        userId,
        action: "SWAP_REJECTED_BY_MANAGER",
        entityType: "SWAP_REQUEST",
        entityId: swapId,
        beforeState: { status: swap.status, type: swap.type },
        afterState: {
          status: "REJECTED",
          reason: dto.reason,
        },
      });

      return updated;
    }

    // ── APPROVE ──────────────────────────────────────────────────────

    // Perform the actual shift-assignment changes in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      if (swap.type === "SWAP" && swap.targetAssignment) {
        // Full swap: reassign both shifts
        await tx.shiftAssignment.update({
          where: { id: swap.requestorAssignment.id },
          data: { userId: swap.targetAssignment.userId },
        });
        await tx.shiftAssignment.update({
          where: { id: swap.targetAssignment.id },
          data: { userId: swap.requestorUserId },
        });
      } else if (swap.type === "SWAP" && swap.targetUserId) {
        // Transfer: reassign requestor's shift to the target user
        await tx.shiftAssignment.update({
          where: { id: swap.requestorAssignment.id },
          data: { userId: swap.targetUserId },
        });
      } else if (swap.type === "DROP") {
        // Drop: cancel the requestor's assignment — it disappears from their schedule
        await tx.shiftAssignment.update({
          where: { id: swap.requestorAssignment.id },
          data: { status: "CANCELLED" },
        });
      }

      return tx.swapRequest.update({
        where: { id: swapId },
        data: {
          status: "MANAGER_APPROVED",
          resolvedById: userId,
          resolvedAt: new Date(),
        },
        include: SWAP_INCLUDE,
      });
    });

    // Notifications
    const notifications: any[] = [
      {
        userId: swap.requestorUserId,
        type: "SWAP_APPROVED",
        title: `${swap.type === "SWAP" ? "Swap" : "Drop"} Approved`,
        message: `Your ${swap.type.toLowerCase()} request has been approved.`,
        data: { swapRequestId: swapId },
      },
    ];
    if (swap.targetUserId) {
      notifications.push({
        userId: swap.targetUserId,
        type: "SWAP_APPROVED",
        title: "Swap Approved",
        message: "A swap involving your shift has been approved.",
        data: { swapRequestId: swapId },
      });
    }
    await this.notifications.sendMany(notifications);

    await this.audit.log({
      userId,
      action: "SWAP_APPROVED",
      entityType: "SWAP_REQUEST",
      entityId: swapId,
      beforeState: {
        status: swap.status,
        type: swap.type,
      },
      afterState: {
        status: "MANAGER_APPROVED",
        approvedBy: result.resolvedBy
          ? `${result.resolvedBy.firstName} ${result.resolvedBy.lastName}`
          : undefined,
      },
    });

    return result;
  }

  // ── Coworkers (for swap target picker) ───────────────────────────────

  async getCoworkers(
    userId: string,
    locationId: string,
    shiftStart: string,
    shiftEnd: string,
  ) {
    // Get all active staff certified at this location (excluding current user)
    const certifiedStaff =
      await this.prisma.staffLocationCertification.findMany({
        where: { locationId, revokedAt: null, userId: { not: userId } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true,
            },
          },
        },
      });

    const start = new Date(shiftStart);
    const end = new Date(shiftEnd);

    const results = await Promise.all(
      certifiedStaff
        .filter((c) => c.user.isActive)
        .map(async (cert) => {
          const conflicting = await this.prisma.shiftAssignment.findFirst({
            where: {
              userId: cert.user.id,
              status: { in: ["ASSIGNED", "CONFIRMED"] },
              shift: {
                startTime: { lt: end },
                endTime: { gt: start },
                status: { not: "CANCELLED" },
              },
            },
          });

          return {
            id: cert.user.id,
            firstName: cert.user.firstName,
            lastName: cert.user.lastName,
            email: cert.user.email,
            available: !conflicting,
            conflictReason: conflicting
              ? "Has an active shift at this time"
              : null,
          };
        }),
    );

    // Available first, then unavailable
    return results.sort((a, b) =>
      a.available === b.available ? 0 : a.available ? -1 : 1,
    );
  }
}

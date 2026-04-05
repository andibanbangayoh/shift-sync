import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationType } from "@prisma/client";
import { NotificationsGateway } from "./notifications.gateway";

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  /**
   * Create a notification and push it in real-time via WebSocket.
   */
  async send(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data ?? undefined,
      },
    });

    // Push to WebSocket if user is connected
    this.gateway.sendToUser(params.userId, notification);

    return notification;
  }

  /**
   * Send notifications to multiple users at once.
   */
  async sendMany(
    notifications: {
      userId: string;
      type: NotificationType;
      title: string;
      message: string;
      data?: Record<string, any>;
    }[],
  ) {
    if (notifications.length === 0) return;

    const created = await this.prisma.notification.createManyAndReturn({
      data: notifications.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data ?? undefined,
      })),
    });

    // Push each notification to the respective user's WebSocket
    for (const notification of created) {
      this.gateway.sendToUser(notification.userId, notification);
    }

    return created;
  }

  /**
   * Get paginated notifications for a user.
   */
  async findAll(
    userId: string,
    filters: { unreadOnly?: boolean; page?: number; limit?: number },
  ) {
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 50);
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (filters.unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      data: notifications,
      unreadCount,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Mark specific notifications as read.
   */
  async markAsRead(userId: string, notificationIds: string[]) {
    const result = await this.prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  /**
   * Get the unread count for a user.
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }
}

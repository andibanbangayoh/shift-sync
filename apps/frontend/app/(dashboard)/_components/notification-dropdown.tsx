"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from "@/store/api/notificationApi";
import type { Notification } from "@/store/api/notificationApi";

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const TYPE_COLORS: Record<string, string> = {
  SHIFT_ASSIGNED: "bg-teal-500",
  SHIFT_CHANGED: "bg-blue-500",
  SHIFT_CANCELLED: "bg-red-500",
  SCHEDULE_PUBLISHED: "bg-purple-500",
  SWAP_REQUESTED: "bg-indigo-500",
  SWAP_ACCEPTED: "bg-cyan-500",
  SWAP_APPROVED: "bg-emerald-500",
  SWAP_REJECTED: "bg-rose-500",
  SWAP_CANCELLED: "bg-gray-500",
  SWAP_EXPIRED: "bg-amber-500",
  DROP_AVAILABLE: "bg-orange-500",
  DROP_CLAIMED: "bg-lime-500",
  OVERTIME_WARNING: "bg-yellow-500",
  AVAILABILITY_CHANGED: "bg-pink-500",
  GENERAL: "bg-slate-500",
};

/** Resolve a notification to a destination route. */
function getNotificationHref(notification: Notification): string {
  const data = notification.data as Record<string, any> | null;
  switch (notification.type) {
    case "SHIFT_ASSIGNED":
    case "SHIFT_CHANGED":
    case "SHIFT_CANCELLED":
    case "SCHEDULE_PUBLISHED":
      return "/schedule";
    case "SWAP_REQUESTED":
    case "SWAP_ACCEPTED":
    case "SWAP_APPROVED":
    case "SWAP_REJECTED":
    case "SWAP_CANCELLED":
    case "SWAP_EXPIRED":
    case "DROP_AVAILABLE":
    case "DROP_CLAIMED":
      return "/swaps";
    case "OVERTIME_WARNING":
      return "/";
    case "AVAILABILITY_CHANGED":
      return "/availability";
    default:
      return "/";
  }
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: unreadData } = useGetUnreadCountQuery(undefined, {
    pollingInterval: 30000,
  });
  const { data: notifData } = useGetNotificationsQuery(
    { limit: 15 },
    { skip: !open },
  );
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  const unreadCount = unreadData?.unreadCount ?? 0;
  const notifications = notifData?.data ?? [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleMarkRead = async (id: string) => {
    await markAsRead({ notificationIds: [id] });
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead({ notificationIds: [notification.id] });
    }
    setOpen(false);
    router.push(getNotificationHref(notification));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 rounded-lg border bg-white shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onClick={handleNotificationClick}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t px-4 py-2 text-center">
              <span className="text-xs text-muted-foreground">
                Showing latest {notifications.length} notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  onClick,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onClick: (notification: Notification) => void;
}) {
  const dotColor = TYPE_COLORS[notification.type] ?? "bg-slate-500";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(notification)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick(notification);
      }}
      className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 transition-colors cursor-pointer ${
        notification.isRead
          ? "bg-white hover:bg-gray-50"
          : "bg-blue-50/50 hover:bg-blue-50/80"
      }`}
    >
      {/* Type indicator dot */}
      <div className="mt-1.5 shrink-0">
        <div className={`h-2 w-2 rounded-full ${dotColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <span className="text-[10px] text-muted-foreground mt-1 block">
          {formatRelative(notification.createdAt)}
        </span>
      </div>

      {/* Mark as read */}
      {!notification.isRead && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
          className="mt-1 shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Mark as read"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

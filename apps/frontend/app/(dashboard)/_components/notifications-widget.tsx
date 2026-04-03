import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";
import type { DashboardNotification } from "@/store/api/dashboardApi";

interface NotificationsWidgetProps {
  notifications: DashboardNotification[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const notificationColors: Record<string, string> = {
  SHIFT_ASSIGNED: "bg-blue-500",
  SHIFT_CHANGED: "bg-yellow-500",
  SHIFT_CANCELLED: "bg-red-500",
  SCHEDULE_PUBLISHED: "bg-green-500",
  SWAP_REQUESTED: "bg-purple-500",
  SWAP_ACCEPTED: "bg-green-500",
  SWAP_APPROVED: "bg-green-500",
  SWAP_REJECTED: "bg-red-500",
  OVERTIME_WARNING: "bg-amber-500",
  GENERAL: "bg-gray-500",
};

export function NotificationsWidget({
  notifications,
}: NotificationsWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Bell className="h-8 w-8 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const dotColor = notificationColors[n.type] || "bg-gray-500";
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 rounded-lg bg-accent/50 p-3 transition-colors hover:bg-accent cursor-pointer"
                >
                  <div
                    className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${dotColor} ${n.isRead ? "opacity-40" : ""}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${n.isRead ? "text-muted-foreground" : "font-medium"}`}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

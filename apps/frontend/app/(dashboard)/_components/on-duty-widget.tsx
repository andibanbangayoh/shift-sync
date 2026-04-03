import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardOnDutyItem } from "@/store/api/dashboardApi";

interface OnDutyWidgetProps {
  items: DashboardOnDutyItem[];
}

export function OnDutyWidget({ items }: OnDutyWidgetProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">On Duty Now</CardTitle>
        <div className="flex items-center gap-1.5 rounded-full bg-green-500 px-2.5 py-1 text-xs font-medium text-white">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          Live
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No staff on duty right now
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const initials = `${item.user.firstName[0]}${item.user.lastName[0]}`;
              const until = new Date(item.endTime).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-accent/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-medium text-white">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {item.user.firstName} {item.user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Until {until} · {item.location.name}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    {item.skill.replace(/_/g, " ")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardOvertimeAlert } from "@/store/api/dashboardApi";

interface OvertimeWidgetProps {
  alerts: DashboardOvertimeAlert[];
}

export function OvertimeWidget({ alerts }: OvertimeWidgetProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Overtime Alerts</CardTitle>
        {alerts.length > 0 && (
          <span className="rounded-full bg-destructive px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground">
            {alerts.length}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            All staff within desired hours
          </p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const over = (alert.hoursAssigned - alert.desiredHours).toFixed(
                1,
              );
              const pct = Math.min(
                100,
                Math.round((alert.hoursAssigned / alert.desiredHours) * 100),
              );
              return (
                <div
                  key={alert.userId}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {alert.firstName} {alert.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alert.hoursAssigned}h assigned / {alert.desiredHours}h
                        desired
                      </p>
                      <div className="mt-1.5 h-1.5 w-32 rounded-full bg-amber-200">
                        <div
                          className="h-1.5 rounded-full bg-amber-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-300 px-2 py-0.5 text-xs font-medium text-amber-700">
                      +{over}h
                    </span>
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

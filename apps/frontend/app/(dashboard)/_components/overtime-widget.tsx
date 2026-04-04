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
            No overtime alerts this week
          </p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const isOvertime = alert.hoursAssigned >= 40;
              const exceedsAvailable =
                alert.availableHours !== null &&
                alert.hoursAssigned > alert.availableHours;
              const pct = Math.min(
                100,
                Math.round((alert.hoursAssigned / 40) * 100),
              );
              const isSevere = isOvertime || exceedsAvailable;
              const borderColor = isSevere
                ? "border-red-300"
                : "border-amber-200";
              const bgColor = isSevere ? "bg-red-50" : "bg-amber-50";
              const barTrackColor = isSevere ? "bg-red-200" : "bg-amber-200";
              const barFillColor = isSevere ? "bg-red-500" : "bg-amber-500";

              return (
                <div
                  key={alert.userId}
                  className={`rounded-lg border ${borderColor} ${bgColor} p-3`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {alert.firstName} {alert.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alert.hoursAssigned}h assigned / 40h limit
                        {alert.availableHours !== null &&
                          ` / ${alert.availableHours}h available`}
                      </p>
                      {exceedsAvailable && (
                        <p className="text-xs font-medium text-red-600">
                          Exceeds available hours by{" "}
                          {(
                            alert.hoursAssigned - alert.availableHours!
                          ).toFixed(1)}
                          h
                        </p>
                      )}
                      <div
                        className={`mt-1.5 h-1.5 w-32 rounded-full ${barTrackColor}`}
                      >
                        <div
                          className={`h-1.5 rounded-full ${barFillColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span
                      className={`rounded-full border ${isSevere ? "border-red-300" : "border-amber-300"} px-2 py-0.5 text-xs font-medium ${isSevere ? "text-red-700" : "text-amber-700"}`}
                    >
                      {isOvertime
                        ? `+${(alert.hoursAssigned - 40).toFixed(1)}h OT`
                        : "Approaching 40h"}
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

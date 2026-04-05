import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock } from "lucide-react";
import type { DashboardUpcomingShift } from "@/store/api/dashboardApi";

interface UpcomingShiftsWidgetProps {
  shifts: DashboardUpcomingShift[];
  showAssignees?: boolean;
}

export function UpcomingShiftsWidget({
  shifts,
  showAssignees = true,
}: UpcomingShiftsWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Upcoming Shifts (Next 24h)</CardTitle>
      </CardHeader>
      <CardContent>
        {shifts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No upcoming shifts in the next 24 hours
          </p>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => {
              const tz = shift.location.timezone;
              const start = new Date(shift.startTime).toLocaleTimeString(
                "en-US",
                { hour: "numeric", minute: "2-digit", timeZone: tz },
              );
              const end = new Date(shift.endTime).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: tz,
              });
              const isFull = shift.assignedCount >= shift.headcount;
              return (
                <div
                  key={shift.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {shift.skill.replace(/_/g, " ")}
                      </p>
                      <span
                        className={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          isFull
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {shift.assignedCount}/{shift.headcount}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{shift.location.name}</span>
                      <span className="mx-1">·</span>
                      <span>
                        {start} – {end}
                      </span>
                    </div>
                    {showAssignees && shift.assignments.length > 0 && (
                      <div className="mt-1.5 flex gap-1">
                        {shift.assignments.slice(0, 3).map((a) => (
                          <span
                            key={a.id}
                            className="rounded-full bg-accent px-2 py-0.5 text-xs"
                          >
                            {a.user.firstName} {a.user.lastName[0]}.
                          </span>
                        ))}
                        {shift.assignments.length > 3 && (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-xs">
                            +{shift.assignments.length - 3}
                          </span>
                        )}
                      </div>
                    )}
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

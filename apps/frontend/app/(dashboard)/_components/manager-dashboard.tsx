import type { AuthUser } from "@/store/slices/authSlice";
import { useGetDashboardStatsQuery } from "@/store/api/dashboardApi";
import { StatCard } from "./stat-card";
import { OnDutyWidget } from "./on-duty-widget";
import { OvertimeWidget } from "./overtime-widget";
import { UpcomingShiftsWidget } from "./upcoming-shifts-widget";
import { NotificationsWidget } from "./notifications-widget";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  MapPin,
  AlertTriangle,
  Clock,
  CalendarDays,
} from "lucide-react";

export function ManagerDashboard({ user }: { user: AuthUser }) {
  const { data: stats, isLoading } = useGetDashboardStatsQuery();
  const locations = user.managedLocations || [];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.firstName}</h1>
        <p className="text-sm text-muted-foreground">
          {locations.length > 0
            ? `Managing: ${locations.map((ml) => ml.location.name).join(", ")} · ${today}`
            : today}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="On Duty Now"
          value={isLoading ? "—" : (stats?.onDutyNow.length ?? 0)}
          subtitle={`${stats?.todaysOnDutyCount ?? 0} total today`}
          icon={Users}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          label="Overtime Alerts"
          value={isLoading ? "—" : (stats?.overtimeAlerts.length ?? 0)}
          subtitle="Staff at 35+ hrs this week"
          icon={AlertTriangle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Pending Swaps"
          value={isLoading ? "—" : (stats?.pendingSwaps ?? 0)}
          subtitle="Awaiting your approval"
          icon={Clock}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Unassigned Shifts"
          value={isLoading ? "—" : (stats?.unassignedCount ?? 0)}
          subtitle="At your locations"
          icon={CalendarDays}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* On Duty + Overtime */}
      <div className="grid gap-4 md:grid-cols-2">
        <OnDutyWidget items={stats?.onDutyNow ?? []} />
        <OvertimeWidget alerts={stats?.overtimeAlerts ?? []} />
      </div>

      {/* Upcoming Shifts + Notifications */}
      <div className="grid gap-4 md:grid-cols-2">
        <UpcomingShiftsWidget shifts={stats?.upcomingShifts ?? []} />
        <NotificationsWidget notifications={stats?.recentNotifications ?? []} />
      </div>

      {/* My Locations */}
      {locations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>My Locations</CardTitle>
            <CardDescription>Locations you manage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {locations.map((ml) => (
                <div
                  key={ml.id}
                  className="flex items-center gap-3 rounded-lg border p-4"
                >
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{ml.location.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ml.location.address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Timezone: {ml.location.timezone}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

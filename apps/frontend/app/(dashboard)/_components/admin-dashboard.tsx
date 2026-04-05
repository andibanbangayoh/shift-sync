import type { AuthUser } from "@/store/slices/authSlice";
import { useGetDashboardStatsQuery } from "@/store/api/dashboardApi";
import { StatCard } from "./stat-card";
import { OnDutyWidget } from "./on-duty-widget";
import { OvertimeWidget } from "./overtime-widget";
import { UpcomingShiftsWidget } from "./upcoming-shifts-widget";
import { NotificationsWidget } from "./notifications-widget";
import { ActionLink } from "@/components/ui/action-link";
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
  CalendarDays,
  TrendingUp,
  Clock,
} from "lucide-react";

export function AdminDashboard({ user }: { user: AuthUser }) {
  const { data: stats, isLoading } = useGetDashboardStatsQuery();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
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
          subtitle="Awaiting approval"
          icon={Clock}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Unassigned Shifts"
          value={isLoading ? "—" : (stats?.unassignedCount ?? 0)}
          subtitle="Upcoming shifts needing staff"
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

      {/* Quick Actions */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <ActionLink
              href="/staff"
              icon={<Users className="h-4 w-4" />}
              label="Manage Staff"
            />
            <ActionLink
              href="/locations"
              icon={<MapPin className="h-4 w-4" />}
              label="Manage Locations"
            />
            <ActionLink
              href="/analytics"
              icon={<TrendingUp className="h-4 w-4" />}
              label="View Analytics"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

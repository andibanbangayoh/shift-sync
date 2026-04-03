import type { AuthUser } from "@/store/slices/authSlice";
import { useGetDashboardStatsQuery } from "@/store/api/dashboardApi";
import { StatCard } from "./stat-card";
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
  CalendarDays,
  Clock,
  MapPin,
  ArrowLeftRight,
  CheckCircle2,
} from "lucide-react";

export function StaffDashboard({ user }: { user: AuthUser }) {
  const { data: stats, isLoading } = useGetDashboardStatsQuery();
  const skills = user.skills || [];
  const certifications = user.certifications || [];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const hoursThisWeek = stats?.myHoursThisWeek ?? 0;
  const targetHours = user.desiredWeeklyHours ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.firstName}</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Upcoming Shifts"
          value={isLoading ? "—" : (stats?.upcomingShifts.length ?? 0)}
          subtitle="Next 24 hours"
          icon={CalendarDays}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatCard
          label="Hours This Week"
          value={isLoading ? "—" : `${hoursThisWeek}h`}
          subtitle={targetHours ? `Target: ${targetHours}h` : "No target set"}
          icon={Clock}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Pending Swaps"
          value={isLoading ? "—" : (stats?.pendingSwaps ?? 0)}
          subtitle="Open swap requests"
          icon={ArrowLeftRight}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Certified Locations"
          value={certifications.length}
          subtitle="Locations you can work at"
          icon={MapPin}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
      </div>

      {/* Upcoming Shifts + Notifications */}
      <div className="grid gap-4 md:grid-cols-2">
        <UpcomingShiftsWidget
          shifts={stats?.upcomingShifts ?? []}
          showAssignees={false}
        />
        <NotificationsWidget notifications={stats?.recentNotifications ?? []} />
      </div>

      {/* Skills + Certified Locations */}
      <div className="grid gap-4 md:grid-cols-2">
        {skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>My Skills</CardTitle>
              <CardDescription>
                Skills you&apos;re qualified for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skills.map((ss) => (
                  <span
                    key={ss.id}
                    className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                  >
                    {ss.skill.name.replace("_", " ")}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {certifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Certified Locations</CardTitle>
              <CardDescription>Locations you can work at</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {certifications.map((cert) => (
                <div key={cert.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{cert.location.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({cert.location.timezone})
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

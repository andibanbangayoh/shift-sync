"use client";

import { useAppSelector } from "@/store/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarDays,
  Users,
  MapPin,
  ArrowLeftRight,
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";

function AdminDashboard({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Corporate overview across all Coastal Eats locations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Locations
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">2 NYC · 2 LA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Across all locations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              This Week&apos;s Shifts
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              No shifts scheduled yet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Overtime Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Staff near overtime</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Platform health overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusRow label="Database" status="operational" />
            <StatusRow label="Real-time Events" status="operational" />
            <StatusRow label="Scheduling Engine" status="operational" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ManagerDashboard({ user }: { user: any }) {
  const locations = user.managedLocations || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.firstName}</h1>
        <p className="text-muted-foreground">
          {locations.length > 0
            ? `Managing: ${locations.map((ml: any) => ml.location.name).join(", ")}`
            : "No locations assigned"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">My Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
            <p className="text-xs text-muted-foreground">
              {locations
                .map((ml: any) => ml.location.timezone)
                .filter(
                  (v: string, i: number, a: string[]) => a.indexOf(v) === i,
                )
                .join(", ")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Shifts
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">Shifts today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Swaps</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overtime Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Staff at risk</p>
          </CardContent>
        </Card>
      </div>

      {locations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>My Locations</CardTitle>
            <CardDescription>Locations you manage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {locations.map((ml: any) => (
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

function StaffDashboard({ user }: { user: any }) {
  const skills = user.skills || [];
  const certifications = user.certifications || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.firstName}</h1>
        <p className="text-muted-foreground">
          Here&apos;s your scheduling overview
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Shifts
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Hours This Week
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0h</div>
            <p className="text-xs text-muted-foreground">
              {user.desiredWeeklyHours
                ? `Target: ${user.desiredWeeklyHours}h`
                : "No target set"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Swaps</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Open requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Certified Locations
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certifications.length}</div>
            <p className="text-xs text-muted-foreground">Locations</p>
          </CardContent>
        </Card>
      </div>

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
                {skills.map((ss: any) => (
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
              {certifications.map((cert: any) => (
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

function ActionLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 rounded-md border p-3 text-sm transition-colors hover:bg-accent"
    >
      {icon}
      {label}
    </a>
  );
}

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: "operational" | "degraded" | "down";
}) {
  const colors = {
    operational: "bg-green-500",
    degraded: "bg-yellow-500",
    down: "bg-red-500",
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${colors[status]}`} />
        <span className="text-xs text-muted-foreground capitalize">
          {status}
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) return null;

  switch (user.role) {
    case "ADMIN":
      return <AdminDashboard user={user} />;
    case "MANAGER":
      return <ManagerDashboard user={user} />;
    case "STAFF":
      return <StaffDashboard user={user} />;
    default:
      return <div>Unknown role</div>;
  }
}

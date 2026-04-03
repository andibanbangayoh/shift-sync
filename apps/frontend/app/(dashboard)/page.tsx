"use client";

import { useAppSelector } from "@/store/store";
import { AdminDashboard } from "./_components/admin-dashboard";
import { ManagerDashboard } from "./_components/manager-dashboard";
import { StaffDashboard } from "./_components/staff-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

const dashboards = {
  ADMIN: AdminDashboard,
  MANAGER: ManagerDashboard,
  STAFF: StaffDashboard,
} as const;

function UnknownRoleFallback({ role }: { role: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />

          <CardTitle>Unsupported Role</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your account role <strong>&ldquo;{role}&rdquo;</strong> is not
            recognized. Please contact your administrator for access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) return null;

  const Dashboard = dashboards[user.role as keyof typeof dashboards];

  if (!Dashboard) {
    return <UnknownRoleFallback role={user.role} />;
  }

  return <Dashboard user={user} />;
}

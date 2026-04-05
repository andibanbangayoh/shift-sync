"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/store/store";
import { clearCredentials } from "@/store/slices/authSlice";
import { useGetProfileQuery, useLogoutMutation } from "@/store/api/authApi";
import { updateUser } from "@/store/slices/authSlice";
import { baseApi } from "@/store/api/baseApi";
import {
  Clock,
  LayoutDashboard,
  CalendarDays,
  Users,
  MapPin,
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { NotificationDropdown } from "./_components/notification-dropdown";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ["ADMIN", "MANAGER", "STAFF"],
  },
  {
    label: "Schedule",
    href: "/schedule",
    icon: <CalendarDays className="h-4 w-4" />,
    roles: ["ADMIN", "MANAGER", "STAFF"],
  },
  {
    label: "Swaps",
    href: "/swaps",
    icon: <ArrowLeftRight className="h-4 w-4" />,
    roles: ["ADMIN", "MANAGER", "STAFF"],
  },
  {
    label: "Staff",
    href: "/staff",
    icon: <Users className="h-4 w-4" />,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    label: "Locations",
    href: "/locations",
    icon: <MapPin className="h-4 w-4" />,
    roles: ["ADMIN"],
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: <BarChart3 className="h-4 w-4" />,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    label: "Audit Trail",
    href: "/audit",
    icon: <ClipboardList className="h-4 w-4" />,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    label: "Availability",
    href: "/availability",
    icon: <CalendarDays className="h-4 w-4" />,
    roles: ["STAFF"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-4 w-4" />,
    roles: ["ADMIN", "MANAGER", "STAFF"],
  },
];

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800",
  MANAGER: "bg-blue-100 text-blue-800",
  STAFF: "bg-green-100 text-green-800",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isHydrated, refreshToken } = useAppSelector(
    (state) => state.auth,
  );
  const [logout] = useLogoutMutation();
  const [mounted, setMounted] = useState(false);

  // Connect to notification WebSocket for real-time updates
  useNotificationSocket();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch fresh profile on mount
  const { data: profile } = useGetProfileQuery(undefined, {
    skip: !isAuthenticated,
  });

  useEffect(() => {
    if (profile) {
      dispatch(updateUser(profile));
    }
  }, [profile, dispatch]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logout({ refreshToken }).unwrap();
      }
    } catch {
      // Even if API call fails, clear local state
    }
    dispatch(clearCredentials());
    dispatch(baseApi.util.resetApiState());
    router.push("/login");
  };

  // Show nothing while hydrating to prevent flash
  if (!mounted || !isHydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user.role),
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-white lg:flex h-screen sticky top-0">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Clock className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-primary">ShiftSync</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <span
                className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  roleColors[user.role] || "bg-gray-100 text-gray-800"
                }`}
              >
                {user.role}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between sticky top-0 border-b bg-white px-6 z-50">
          {/* Mobile menu button placeholder */}
          <div className="lg:hidden">
            <Clock className="h-6 w-6 text-primary" />
          </div>

          <div className="hidden lg:block" />

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <NotificationDropdown />

            {/* User Menu */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50/50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

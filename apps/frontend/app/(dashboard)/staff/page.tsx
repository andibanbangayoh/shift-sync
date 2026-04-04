"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/store";
import { useListStaffQuery, type StaffListItem } from "@/store/api/staffApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  Plus,
  Mail,
  Clock,
  MapPin,
  Wrench,
  ChevronRight,
} from "lucide-react";
import { CreateStaffDialog } from "./_components/create-staff-dialog";

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800 border-red-200",
  MANAGER: "bg-blue-100 text-blue-800 border-blue-200",
  STAFF: "bg-green-100 text-green-800 border-green-200",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function computeWeeklyHours(
  avail: { dayOfWeek: number; startTime: string; endTime: string }[],
): number {
  return avail.reduce((sum, s) => {
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    return sum + (eh + em / 60 - (sh + sm / 60));
  }, 0);
}

export default function StaffPage() {
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const role = user?.role || "STAFF";

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const { data: staff = [], isLoading } = useListStaffQuery({
    ...(search && { search }),
    ...(roleFilter !== "all" && { role: roleFilter }),
  });

  const filteredStaff = staff.filter((s) => s.id !== user?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Staff Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {role === "ADMIN"
            ? "Manage all staff across locations"
            : "Manage staff at your locations"}
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {role === "ADMIN" && (
                <SelectItem value="MANAGER">Managers</SelectItem>
              )}
              <SelectItem value="STAFF">Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{filteredStaff.length}</p>
          <p className="text-xs text-muted-foreground">Total Staff</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {filteredStaff.filter((s) => s.isActive).length}
          </p>
          <p className="text-xs text-muted-foreground">Active</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">
            {filteredStaff.filter((s) => !s.isActive).length}
          </p>
          <p className="text-xs text-muted-foreground">Inactive</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {filteredStaff.filter((s) => s.role === "MANAGER").length}
          </p>
          <p className="text-xs text-muted-foreground">Managers</p>
        </Card>
      </div>

      {/* Staff List */}
      {isLoading ? (
        <Card className="p-12 text-center text-muted-foreground">
          Loading staff…
        </Card>
      ) : filteredStaff.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No staff found</p>
          <p className="text-sm mt-1">
            {search
              ? "Try a different search term"
              : "Add your first team member"}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredStaff.map((member) => (
            <StaffRow
              key={member.id}
              member={member}
              onClick={() => router.push(`/staff/${member.id}`)}
            />
          ))}
        </div>
      )}

      <CreateStaffDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        callerRole={role}
      />
    </div>
  );
}

function StaffRow({
  member,
  onClick,
}: {
  member: StaffListItem;
  onClick: () => void;
}) {
  const weeklyHours = computeWeeklyHours(member.availabilities);
  const availDays = [...new Set(member.availabilities.map((a) => a.dayOfWeek))];

  return (
    <Card
      className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
            member.isActive
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {member.firstName[0]}
          {member.lastName[0]}
        </div>

        {/* Name & Email */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">
              {member.firstName} {member.lastName}
            </p>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 ${ROLE_BADGE[member.role] || ""}`}
            >
              {member.role}
            </Badge>
            {!member.isActive && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 bg-gray-100 text-gray-500"
              >
                Inactive
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Mail className="h-3 w-3" />
            <span className="truncate">{member.email}</span>
          </div>
        </div>

        {/* Available Hours */}
        <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground min-w-[100px]">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {weeklyHours > 0 ? `${weeklyHours.toFixed(0)}h/wk` : "No hours"}
          </span>
          {member.desiredWeeklyHours && (
            <span className="text-xs opacity-60">
              / {member.desiredWeeklyHours}h
            </span>
          )}
        </div>

        {/* Availability Days */}
        <div className="hidden lg:flex gap-0.5">
          {DAY_NAMES.map((d, i) => (
            <span
              key={d}
              className={`text-[10px] w-6 h-5 rounded flex items-center justify-center ${
                availDays.includes(i)
                  ? "bg-primary/10 text-primary font-medium"
                  : "bg-muted/50 text-muted-foreground/40"
              }`}
            >
              {d[0]}
            </span>
          ))}
        </div>

        {/* Locations */}
        <div className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground max-w-[160px]">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {member.certifications.length > 0
              ? member.certifications.map((c) => c.location.name).join(", ")
              : "None"}
          </span>
        </div>

        {/* Skills */}
        <div className="hidden xl:flex items-center gap-1 max-w-[140px]">
          <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {member.skills.length > 0 ? (
            <div className="flex gap-1 overflow-hidden">
              {member.skills.slice(0, 2).map((s) => (
                <Badge
                  key={s.skillId}
                  variant="secondary"
                  className="text-[10px] px-1.5 shrink-0"
                >
                  {s.skill.name}
                </Badge>
              ))}
              {member.skills.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{member.skills.length - 2}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </Card>
  );
}

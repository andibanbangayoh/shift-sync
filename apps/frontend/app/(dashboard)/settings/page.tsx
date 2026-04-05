"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import {
  useGetProfileQuery,
  useUpdateSettingsMutation,
  useSetMyDayAvailabilityMutation,
  useClearMyDayAvailabilityMutation,
  useAddMySkillMutation,
  useRemoveMySkillMutation,
  useListMyExceptionsQuery,
  useAddMyExceptionMutation,
  useRemoveMyExceptionMutation,
  type AvailabilityException,
} from "@/store/api/authApi";
import { useGetSkillsQuery } from "@/store/api/shiftsApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Bell,
  Mail,
  CalendarDays,
  Clock,
  Loader2,
  Check,
  Settings,
  Wrench,
  Plus,
  X,
} from "lucide-react";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AvailSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
}

export default function SettingsPage() {
  const authUser = useSelector((s: RootState) => s.auth.user);
  const { data: profile, isLoading } = useGetProfileQuery();

  if (isLoading) return <SettingsSkeleton />;
  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, notifications, and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Card */}
        <ProfileCard profile={profile} />

        {/* Notification Preferences */}
        <NotificationCard profile={profile} />
      </div>

      {/* Staff-only sections */}
      {profile.role === "STAFF" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <DesiredHoursCard profile={profile} />
          <SkillsCard profile={profile} />
        </div>
      )}

      {profile.role === "STAFF" && <AvailabilityCard profile={profile} />}

      {profile.role === "STAFF" && <ExceptionsCard />}
    </div>
  );
}

// ─── Profile Card ──────────────────────────────────────────────────────────────

function ProfileCard({
  profile,
}: {
  profile: NonNullable<ReturnType<typeof useGetProfileQuery>["data"]>;
}) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone || "");
  const [updateSettings, { isLoading }] = useUpdateSettingsMutation();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPhone(profile.phone || "");
  }, [profile]);

  async function handleSave() {
    try {
      await updateSettings({
        firstName,
        lastName,
        phone: phone || undefined,
      }).unwrap();
      setEditing(false);
      setSaved(true);
      toast.success("Profile updated");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Failed to update profile");
    }
  }

  function handleCancel() {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPhone(profile.phone || "");
    setEditing(false);
  }

  const roleLabel =
    profile.role === "ADMIN"
      ? "Administrator"
      : profile.role === "MANAGER"
        ? "Manager"
        : "Staff";

  const roleColor =
    profile.role === "ADMIN"
      ? "bg-red-100 text-red-800"
      : profile.role === "MANAGER"
        ? "bg-blue-100 text-blue-800"
        : "bg-green-100 text-green-800";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-1.5">
          <User className="h-4 w-4 text-muted-foreground" />
          Profile
        </h2>
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Avatar + Name + Role */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
            {profile.firstName[0]}
            {profile.lastName[0]}
          </div>
          <div>
            {editing ? (
              <div className="flex gap-2">
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-8 w-28"
                  placeholder="First name"
                />
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-8 w-28"
                  placeholder="Last name"
                />
              </div>
            ) : (
              <p className="font-medium">
                {profile.firstName} {profile.lastName}
              </p>
            )}
            <Badge
              variant="secondary"
              className={`text-xs mt-0.5 ${roleColor}`}
            >
              {roleLabel}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Email (read-only) */}
        <div>
          <Label className="text-xs text-muted-foreground">Email</Label>
          <p className="text-sm">{profile.email}</p>
        </div>

        {/* Phone */}
        <div>
          <Label className="text-xs text-muted-foreground">Phone</Label>
          {editing ? (
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
              className="mt-1"
            />
          ) : (
            <p className="text-sm">{profile.phone || "Not set"}</p>
          )}
        </div>

        {/* Member since */}
        <div>
          <Label className="text-xs text-muted-foreground">Member Since</Label>
          <p className="text-sm">
            {new Date(profile.createdAt).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Edit buttons */}
        {editing && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        )}
        {saved && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <Check className="h-3 w-3" /> Profile updated
          </p>
        )}
      </div>
    </Card>
  );
}

// ─── Notification Preferences Card ─────────────────────────────────────────────

function NotificationCard({
  profile,
}: {
  profile: NonNullable<ReturnType<typeof useGetProfileQuery>["data"]>;
}) {
  const [updateSettings, { isLoading }] = useUpdateSettingsMutation();
  const [saved, setSaved] = useState(false);

  async function toggle(field: "notifyInApp" | "notifyEmail") {
    try {
      await updateSettings({ [field]: !profile[field] }).unwrap();
      setSaved(true);
      toast.success("Notification preferences updated");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Failed to update notification preferences");
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-1.5">
          <Bell className="h-4 w-4 text-muted-foreground" />
          Notification Preferences
        </h2>
        {saved && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* In-App Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Bell className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">In-App Notifications</p>
              <p className="text-xs text-muted-foreground">
                Receive notifications within the app
              </p>
            </div>
          </div>
          <button
            disabled={isLoading}
            onClick={() => toggle("notifyInApp")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              profile.notifyInApp ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                profile.notifyInApp ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <Separator />

        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
              <Mail className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-muted-foreground">
                Receive email alerts for important updates
              </p>
            </div>
          </div>
          <button
            disabled={isLoading}
            onClick={() => toggle("notifyEmail")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              profile.notifyEmail ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                profile.notifyEmail ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─── Desired Hours Card ────────────────────────────────────────────────────────

function DesiredHoursCard({
  profile,
}: {
  profile: NonNullable<ReturnType<typeof useGetProfileQuery>["data"]>;
}) {
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState(
    profile.desiredWeeklyHours?.toString() || "",
  );
  const [updateSettings, { isLoading }] = useUpdateSettingsMutation();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHours(profile.desiredWeeklyHours?.toString() || "");
  }, [profile.desiredWeeklyHours]);

  async function handleSave() {
    try {
      await updateSettings({
        desiredWeeklyHours: hours ? parseFloat(hours) : null,
      }).unwrap();
      setEditing(false);
      setSaved(true);
      toast.success("Desired hours updated");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Failed to update desired hours");
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Desired Weekly Hours
        </h2>
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <Label>Hours per week</Label>
            <Input
              type="number"
              min={0}
              max={60}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 20"
              className="mt-1 w-32"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setHours(profile.desiredWeeklyHours?.toString() || "");
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-2xl font-bold">
            {profile.desiredWeeklyHours ?? "—"}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              hours / week
            </span>
          </p>
          {saved && (
            <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
              <Check className="h-3 w-3" /> Updated
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Skills Card ───────────────────────────────────────────────────────────────

function SkillsCard({
  profile,
}: {
  profile: NonNullable<ReturnType<typeof useGetProfileQuery>["data"]>;
}) {
  const { data: allSkills } = useGetSkillsQuery();
  const [addSkill, { isLoading: adding }] = useAddMySkillMutation();
  const [removeSkill] = useRemoveMySkillMutation();
  const [selectedSkill, setSelectedSkill] = useState("");

  const mySkills: Array<{ id: string; skill: { id: string; name: string } }> =
    profile.skills ?? [];
  const mySkillIds = new Set(mySkills.map((s) => s.skill.id));
  const available = (allSkills || []).filter((s) => !mySkillIds.has(s.id));

  async function handleAdd() {
    if (!selectedSkill) return;
    try {
      await addSkill(selectedSkill).unwrap();
      setSelectedSkill("");
      toast.success("Skill added");
    } catch {
      toast.error("Failed to add skill");
    }
  }

  return (
    <Card className="p-5">
      <h2 className="font-semibold flex items-center gap-1.5 mb-4">
        <Wrench className="h-4 w-4 text-muted-foreground" />
        Skills
      </h2>

      {/* Current skills */}
      {mySkills.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {mySkills.map((s) => (
            <Badge
              key={s.skill.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {s.skill.name}
              <button
                onClick={() =>
                  removeSkill(s.skill.id)
                    .unwrap()
                    .then(() => toast.success("Skill removed"))
                    .catch(() => toast.error("Failed to remove skill"))
                }
                className="ml-0.5 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">
          No skills added yet.
        </p>
      )}

      {/* Add skill */}
      {available.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select a skill to add…</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!selectedSkill || adding}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}

// ─── Availability Card ─────────────────────────────────────────────────────────

function AvailabilityCard({
  profile,
}: {
  profile: NonNullable<ReturnType<typeof useGetProfileQuery>["data"]>;
}) {
  const [setDay, { isLoading: saving }] = useSetMyDayAvailabilityMutation();
  const [clearDay] = useClearMyDayAvailabilityMutation();

  const slots: AvailSlot[] = profile.availabilities || [];
  const byDay = new Map<number, AvailSlot>();
  for (const slot of slots) {
    byDay.set(slot.dayOfWeek, slot);
  }

  const totalHours = slots.reduce((sum, s) => {
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    return sum + (eh + em / 60 - (sh + sm / 60));
  }, 0);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Weekly Availability
        </h2>
        <span className="text-xs text-muted-foreground">
          {totalHours.toFixed(0)}h total
        </span>
      </div>

      <div className="space-y-2">
        {DAY_NAMES.map((dayName, dayIdx) => (
          <DayRow
            key={dayIdx}
            dayName={dayName}
            dayIdx={dayIdx}
            slot={byDay.get(dayIdx)}
            saving={saving}
            onSet={(startTime, endTime) =>
              setDay({ dayOfWeek: dayIdx, startTime, endTime })
                .unwrap()
                .then(() => toast.success("Availability updated"))
                .catch(() => toast.error("Failed to update availability"))
            }
            onClear={() =>
              clearDay(dayIdx)
                .unwrap()
                .then(() => toast.success("Availability cleared"))
                .catch(() => toast.error("Failed to clear availability"))
            }
          />
        ))}
      </div>

      {/* Visual day summary */}
      <Separator className="my-3" />
      <div className="flex gap-1">
        {DAY_SHORT.map((d, i) => {
          const hasSlot = byDay.has(i);
          return (
            <div
              key={d}
              className={`flex-1 text-center py-1.5 rounded text-xs font-medium ${
                hasSlot
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/30 text-muted-foreground/40"
              }`}
            >
              {d}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DayRow({
  dayName,
  dayIdx,
  slot,
  saving,
  onSet,
  onClear,
}: {
  dayName: string;
  dayIdx: number;
  slot?: AvailSlot;
  saving: boolean;
  onSet: (startTime: string, endTime: string) => void;
  onClear: () => void;
}) {
  const enabled = !!slot;
  const [startTime, setStartTime] = useState(slot?.startTime || "09:00");
  const [endTime, setEndTime] = useState(slot?.endTime || "17:00");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (slot) {
      setStartTime(slot.startTime);
      setEndTime(slot.endTime);
      setDirty(false);
    }
  }, [slot]);

  function handleToggle() {
    if (enabled) {
      onClear();
    } else {
      onSet(startTime, endTime);
    }
  }

  function handleTimeChange(field: "start" | "end", value: string) {
    if (field === "start") setStartTime(value);
    else setEndTime(value);
    setDirty(true);
  }

  function handleSave() {
    onSet(startTime, endTime);
    setDirty(false);
  }

  const hours = enabled
    ? (() => {
        const [sh, sm] = startTime.split(":").map(Number);
        const [eh, em] = endTime.split(":").map(Number);
        return Math.max(0, eh + em / 60 - (sh + sm / 60));
      })()
    : 0;

  return (
    <div
      className={`flex items-center gap-3 py-2 px-3 rounded ${
        enabled ? "bg-primary/5" : "bg-muted/20"
      }`}
    >
      {/* Toggle */}
      <button
        disabled={saving}
        onClick={handleToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-[18px]" : "translate-x-1"
          }`}
        />
      </button>

      {/* Day name */}
      <span
        className={`text-sm font-medium w-24 ${
          enabled ? "" : "text-muted-foreground"
        }`}
      >
        {dayName}
      </span>

      {/* Time inputs */}
      {enabled ? (
        <>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => handleTimeChange("start", e.target.value)}
            className="h-8 w-28 text-sm"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => handleTimeChange("end", e.target.value)}
            className="h-8 w-28 text-sm"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {hours.toFixed(1)}h
          </span>
          {dirty && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
            </Button>
          )}
        </>
      ) : (
        <span className="text-xs text-muted-foreground">Off</span>
      )}
    </div>
  );
}

// ─── Availability Exceptions Card ──────────────────────────────────────────────

function ExceptionsCard() {
  const { data: exceptions = [] } = useListMyExceptionsQuery();
  const [addException, { isLoading: adding }] = useAddMyExceptionMutation();
  const [removeException] = useRemoveMyExceptionMutation();

  const [date, setDate] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  const handleAdd = async () => {
    if (!date) return;
    try {
      await addException({
        date,
        isAvailable,
        ...(startTime && endTime ? { startTime, endTime } : {}),
        ...(reason ? { reason } : {}),
      }).unwrap();
      toast.success("Exception added");
      setDate("");
      setStartTime("");
      setEndTime("");
      setReason("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to add exception");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeException(id).unwrap();
      toast.success("Exception removed");
    } catch {
      toast.error("Failed to remove exception");
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Date Exceptions</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Add one-off date overrides to mark specific dates as unavailable (e.g.
        vacation, appointment) or available outside your regular schedule.
      </p>

      {/* Existing exceptions */}
      {exceptions.length > 0 && (
        <div className="space-y-2 mb-4">
          {exceptions.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                <Badge variant={ex.isAvailable ? "default" : "destructive"}>
                  {ex.isAvailable ? "Available" : "Unavailable"}
                </Badge>
                <span className="text-sm font-medium">
                  {new Date(ex.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
                {ex.startTime && ex.endTime && (
                  <span className="text-xs text-muted-foreground">
                    {ex.startTime} – {ex.endTime}
                  </span>
                )}
                {ex.reason && (
                  <span className="text-xs text-muted-foreground italic">
                    {ex.reason}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(ex.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new exception */}
      <Separator className="my-4" />
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs mb-1">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs mb-1">Type</Label>
            <div className="flex items-center gap-2 h-9">
              <Button
                variant={!isAvailable ? "default" : "outline"}
                size="sm"
                className="flex-1 h-8"
                onClick={() => setIsAvailable(false)}
              >
                Unavailable
              </Button>
              <Button
                variant={isAvailable ? "default" : "outline"}
                size="sm"
                className="flex-1 h-8"
                onClick={() => setIsAvailable(true)}
              >
                Available
              </Button>
            </div>
          </div>
        </div>

        {isAvailable && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs mb-1">Start Time (optional)</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs mb-1">End Time (optional)</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs mb-1">Reason (optional)</Label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Doctor appointment"
            className="h-9"
          />
        </div>

        <Button
          onClick={handleAdd}
          disabled={!date || adding}
          className="w-full"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add Exception
        </Button>
      </div>
    </Card>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

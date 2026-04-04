"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useGetStaffDetailQuery,
  useUpdateStaffMutation,
  useAddStaffSkillMutation,
  useRemoveStaffSkillMutation,
  useAddStaffCertificationMutation,
  useRemoveStaffCertificationMutation,
  useAddStaffAvailabilityMutation,
  useRemoveStaffAvailabilityMutation,
  type StaffDetail,
  type AvailabilitySlot,
} from "@/store/api/staffApi";
import { useGetLocationsQuery, useGetSkillsQuery } from "@/store/api/shiftsApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Mail,
  Phone,
  Clock,
  Shield,
  MapPin,
  Wrench,
  CalendarDays,
  Plus,
  X,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  User,
} from "lucide-react";

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800",
  MANAGER: "bg-blue-100 text-blue-800",
  STAFF: "bg-green-100 text-green-800",
};

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

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: member, isLoading } = useGetStaffDetailQuery(id);
  const { data: allLocations = [] } = useGetLocationsQuery();
  const { data: allSkills = [] } = useGetSkillsQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading staff details…
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <p className="text-lg font-medium">Staff member not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/staff")}
          className="mb-3 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Staff
        </Button>

        <div className="flex items-center gap-4">
          <div
            className={`h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold ${
              member.isActive
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {member.firstName[0]}
            {member.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {member.firstName} {member.lastName}
              </h1>
              <Badge className={ROLE_BADGE[member.role]}>{member.role}</Badge>
              {!member.isActive && (
                <Badge variant="outline" className="bg-gray-100 text-gray-500">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Joined{" "}
              {new Date(member.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Profile */}
        <div className="lg:col-span-1 space-y-4">
          <ProfileCard member={member} />
        </div>

        {/* Right Column — Skills, Locations, Availability */}
        <div className="lg:col-span-2 space-y-4">
          <SkillsCard member={member} allSkills={allSkills} />
          <LocationsCard member={member} allLocations={allLocations} />
          <AvailabilityCard member={member} />
        </div>
      </div>
    </div>
  );
}

// ─── Profile Card ──────────────────────────────────────────────────────────────

function ProfileCard({ member }: { member: StaffDetail }) {
  const [updateStaff, { isLoading: saving }] = useUpdateStaffMutation();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(member.firstName);
  const [lastName, setLastName] = useState(member.lastName);
  const [phone, setPhone] = useState(member.phone || "");
  const [hours, setHours] = useState(
    member.desiredWeeklyHours?.toString() || "",
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  async function handleSave() {
    setFeedback(null);
    try {
      await updateStaff({
        id: member.id,
        body: {
          firstName,
          lastName,
          ...(phone && { phone }),
          ...(hours && { desiredWeeklyHours: parseFloat(hours) }),
        },
      }).unwrap();
      setFeedback({ type: "success", msg: "Profile updated" });
      setEditing(false);
    } catch {
      setFeedback({ type: "error", msg: "Failed to update profile" });
    }
  }

  async function handleToggleActive() {
    try {
      await updateStaff({
        id: member.id,
        body: { isActive: !member.isActive },
      }).unwrap();
    } catch {
      // handled by RTK
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-1.5">
          <User className="h-4 w-4 text-muted-foreground" />
          Profile
        </h2>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Desired Hours/wk</Label>
            <Input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              min={0}
              max={80}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span>{member.email}</span>
          </div>
          {member.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{member.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {member.desiredWeeklyHours
                ? `${member.desiredWeeklyHours}h/week desired`
                : "No hours preference set"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>{member.role}</span>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`mt-3 flex items-center gap-1.5 text-xs rounded p-2 ${
            feedback.type === "success"
              ? "text-green-600 bg-green-50"
              : "text-red-600 bg-red-50"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {feedback.msg}
        </div>
      )}

      <Separator className="my-4" />

      <Button
        variant={member.isActive ? "destructive" : "default"}
        size="sm"
        className="w-full"
        onClick={handleToggleActive}
      >
        {member.isActive ? "Deactivate Account" : "Reactivate Account"}
      </Button>
    </Card>
  );
}

// ─── Skills Card ───────────────────────────────────────────────────────────────

function SkillsCard({
  member,
  allSkills,
}: {
  member: StaffDetail;
  allSkills: { id: string; name: string }[];
}) {
  const [addSkill, { isLoading: adding }] = useAddStaffSkillMutation();
  const [removeSkill] = useRemoveStaffSkillMutation();
  const [selectedSkill, setSelectedSkill] = useState("");

  const existingIds = new Set(member.skills.map((s) => s.skill.id));
  const available = allSkills.filter((s) => !existingIds.has(s.id));

  async function handleAdd() {
    if (!selectedSkill) return;
    await addSkill({ userId: member.id, skillId: selectedSkill });
    setSelectedSkill("");
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-1.5">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          Skills
        </h2>
        <span className="text-xs text-muted-foreground">
          {member.skills.length} skill{member.skills.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Existing Skills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {member.skills.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No skills assigned yet
          </p>
        )}
        {member.skills.map((s) => (
          <Badge
            key={s.skillId}
            variant="secondary"
            className="flex items-center gap-1 pr-1"
          >
            {s.skill.name}
            <button
              onClick={() =>
                removeSkill({ userId: member.id, skillId: s.skillId })
              }
              className="ml-1 hover:bg-muted rounded p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Add Skill */}
      {available.length > 0 && (
        <div className="flex gap-2">
          <Select value={selectedSkill} onValueChange={setSelectedSkill}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a skill to add…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!selectedSkill || adding}
          >
            {adding ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}

// ─── Locations Card ────────────────────────────────────────────────────────────

function LocationsCard({
  member,
  allLocations,
}: {
  member: StaffDetail;
  allLocations: { id: string; name: string; timezone: string }[];
}) {
  const [addCert, { isLoading: adding }] = useAddStaffCertificationMutation();
  const [removeCert] = useRemoveStaffCertificationMutation();
  const [selectedLoc, setSelectedLoc] = useState("");

  const existingIds = new Set(member.certifications.map((c) => c.location.id));
  const available = allLocations.filter((l) => !existingIds.has(l.id));

  async function handleAdd() {
    if (!selectedLoc) return;
    await addCert({ userId: member.id, locationId: selectedLoc });
    setSelectedLoc("");
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          Locations
        </h2>
        <span className="text-xs text-muted-foreground">
          {member.certifications.length} location
          {member.certifications.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Existing */}
      <div className="space-y-2 mb-4">
        {member.certifications.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Not certified at any location
          </p>
        )}
        {member.certifications.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between p-2 rounded-md bg-muted/30"
          >
            <div>
              <p className="text-sm font-medium">{c.location.name}</p>
              <p className="text-xs text-muted-foreground">
                Certified{" "}
                {new Date(c.certifiedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() =>
                removeCert({
                  userId: member.id,
                  locationId: c.location.id,
                })
              }
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add */}
      {available.length > 0 && (
        <div className="flex gap-2">
          <Select value={selectedLoc} onValueChange={setSelectedLoc}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add location…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!selectedLoc || adding}
          >
            {adding ? (
              <Loader2 className="h-3 w-3 animate-spin" />
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

function AvailabilityCard({ member }: { member: StaffDetail }) {
  const [addAvail, { isLoading: adding }] = useAddStaffAvailabilityMutation();
  const [removeAvail] = useRemoveStaffAvailabilityMutation();
  const [showAdd, setShowAdd] = useState(false);
  const [newDay, setNewDay] = useState("1"); // Monday default
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");
  const [error, setError] = useState("");

  // Group by day
  const byDay = new Map<number, AvailabilitySlot[]>();
  for (const slot of member.availabilities) {
    const arr = byDay.get(slot.dayOfWeek) || [];
    arr.push(slot);
    byDay.set(slot.dayOfWeek, arr);
  }

  const totalHours = member.availabilities.reduce((sum, s) => {
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    return sum + (eh + em / 60 - (sh + sm / 60));
  }, 0);

  async function handleAdd() {
    setError("");
    try {
      await addAvail({
        userId: member.id,
        dayOfWeek: parseInt(newDay),
        startTime: newStart,
        endTime: newEnd,
      }).unwrap();
      setShowAdd(false);
      setNewStart("09:00");
      setNewEnd("17:00");
    } catch (err: any) {
      const msg = err?.data?.message || "Failed to add availability";
      setError(Array.isArray(msg) ? msg.join(", ") : msg);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Weekly Availability
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {totalHours.toFixed(0)}h total
          </span>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Add Slot
          </Button>
        </div>
      </div>

      {member.availabilities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No weekly availability set. Add time slots to indicate when this staff
          member can work.
        </p>
      ) : (
        <div className="space-y-3">
          {DAY_NAMES.map((dayName, dayIdx) => {
            const slots = byDay.get(dayIdx);
            if (!slots || slots.length === 0) return null;

            return (
              <div key={dayIdx}>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {dayName}
                </p>
                <div className="space-y-1">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between py-1.5 px-3 rounded bg-primary/5"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium">{slot.startTime}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{slot.endTime}</span>
                      </div>
                      <button
                        onClick={() =>
                          removeAvail({
                            userId: member.id,
                            availabilityId: slot.id,
                          })
                        }
                        className="text-muted-foreground hover:text-red-500 p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Visual day summary */}
          <Separator />
          <div className="flex gap-1">
            {DAY_SHORT.map((d, i) => {
              const hasSlots = byDay.has(i);
              return (
                <div
                  key={d}
                  className={`flex-1 text-center py-1.5 rounded text-xs font-medium ${
                    hasSlots
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/30 text-muted-foreground/40"
                  }`}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Availability Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Availability Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Day of Week</Label>
              <Select value={newDay} onValueChange={setNewDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((d, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded p-2">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={adding}>
                {adding && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Add Slot
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

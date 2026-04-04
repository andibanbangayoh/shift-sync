"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Loader2,
  MapPin,
  Clock,
  Users,
  CalendarDays,
  Repeat,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import type { ShiftLocation, ShiftSkill } from "@/store/api/shiftsApi";
import {
  useCreateShiftMutation,
  useAssignStaffMutation,
  useGetEligibleStaffQuery,
} from "@/store/api/shiftsApi";

interface CreateShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: ShiftLocation[];
  skills: ShiftSkill[];
  prefillDate?: string;
  defaultLocationId?: string;
}

export function CreateShiftDialog({
  open,
  onOpenChange,
  locations,
  skills,
  prefillDate,
  defaultLocationId,
}: CreateShiftDialogProps) {
  const [locationId, setLocationId] = useState(defaultLocationId || "");
  const [skillId, setSkillId] = useState("");
  const [date, setDate] = useState(prefillDate || "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [headcount, setHeadcount] = useState("1");
  const [assignUserId, setAssignUserId] = useState("");
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly">(
    "none",
  );
  const [recurrenceCount, setRecurrenceCount] = useState("4");
  const [errors, setErrors] = useState<string[]>([]);
  const [warning, setWarning] = useState("");
  const [success, setSuccess] = useState("");

  const [createShift, { isLoading: creating }] = useCreateShiftMutation();
  const [assignStaff] = useAssignStaffMutation();

  const shouldFetch = !!locationId;
  const { data: eligibleStaff } = useGetEligibleStaffQuery(
    { locationId, skillId: skillId || undefined },
    { skip: !shouldFetch },
  );

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setLocationId(defaultLocationId || "");
      setSkillId("");
      setDate(prefillDate || "");
      setStartTime("");
      setEndTime("");
      setHeadcount("1");
      setAssignUserId("");
      setRecurrence("none");
      setRecurrenceCount("4");
      setErrors([]);
      setWarning("");
      setSuccess("");
    }
  }, [open, prefillDate, defaultLocationId]);

  // Clear staff pick when location/skill change
  useEffect(() => {
    setAssignUserId("");
  }, [locationId, skillId]);

  function validate(): string[] {
    const errs: string[] = [];
    if (!locationId) errs.push("Location is required");
    if (!skillId) errs.push("Skill is required");
    if (!date) errs.push("Date is required");
    if (!startTime) errs.push("Start time is required");
    if (!endTime) errs.push("End time is required");
    if (startTime && endTime && startTime >= endTime) {
      errs.push("End time must be after start time");
    }
    if (parseInt(headcount) < 1) errs.push("Headcount must be at least 1");
    return errs;
  }

  async function handleSubmit() {
    setErrors([]);
    setWarning("");
    setSuccess("");

    const errs = validate();
    if (errs.length) {
      setErrors(errs);
      return;
    }

    const startISO = `${date}T${startTime}:00.000Z`;
    const endISO = `${date}T${endTime}:00.000Z`;

    try {
      const result = await createShift({
        locationId,
        date: `${date}T00:00:00.000Z`,
        startTime: startISO,
        endTime: endISO,
        requiredSkillId: skillId,
        headcount: parseInt(headcount),
        ...(recurrence !== "none" && {
          recurrence,
          recurrenceCount: parseInt(recurrenceCount),
        }),
      }).unwrap();

      // Auto-assign if a staff member was selected
      if (assignUserId) {
        try {
          const shiftId = Array.isArray(result) ? result[0].id : result.id;
          const assignResult = await assignStaff({
            shiftId,
            userId: assignUserId,
          }).unwrap();
          if (assignResult.overtimeWarning) {
            setWarning(assignResult.overtimeWarning);
            setSuccess("Shift created & staff assigned.");
            setTimeout(() => onOpenChange(false), 2500);
            return;
          }
        } catch {
          // Assignment failed but shift was created
        }
      }

      const count = Array.isArray(result) ? result.length : 1;
      setSuccess(
        count > 1
          ? `${count} shifts created successfully!`
          : "Shift created successfully!",
      );
      setTimeout(() => onOpenChange(false), 1200);
    } catch (err: any) {
      const msg = err?.data?.message || "Failed to create shift";
      setErrors([Array.isArray(msg) ? msg.join(", ") : msg]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Create New Shift</DialogTitle>
          <DialogDescription>
            Fill in the details below to schedule a new shift.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1 max-h-[70vh] overflow-y-auto pr-1">
          {/* ── Section: Location & Skill ──────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Location & Skill</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Location
                </Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Required Skill
                </Label>
                <Select value={skillId} onValueChange={setSkillId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {skills.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Section: Date & Time ───────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Date & Time</span>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Start Time
                  </Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    End Time
                  </Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Section: Staffing ──────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Staffing</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Headcount
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={headcount}
                  onChange={(e) => setHeadcount(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Assign Staff{" "}
                  <span className="text-muted-foreground/70">(optional)</span>
                </Label>
                <Select
                  value={assignUserId || "__none__"}
                  onValueChange={(v) =>
                    setAssignUserId(v === "__none__" ? "" : v)
                  }
                  disabled={!locationId || !skillId}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {(eligibleStaff || []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                    {eligibleStaff?.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        No eligible staff
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {(!locationId || !skillId) && (
                  <p className="text-[11px] text-muted-foreground">
                    Choose location & skill first
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Section: Recurrence ────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Recurrence</span>
            </div>
            <div
              className={`grid gap-3 ${recurrence !== "none" ? "grid-cols-2" : "grid-cols-1"}`}
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Repeat</Label>
                <Select
                  value={recurrence}
                  onValueChange={(v) =>
                    setRecurrence(v as "none" | "daily" | "weekly")
                  }
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly (same day)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {recurrence !== "none" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Occurrences{" "}
                    <span className="text-muted-foreground/70">
                      (incl. first)
                    </span>
                  </Label>
                  <Input
                    type="number"
                    min="2"
                    max={recurrence === "daily" ? "84" : "12"}
                    value={recurrenceCount}
                    onChange={(e) => setRecurrenceCount(e.target.value)}
                    className="bg-background"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Feedback: success / warning / errors ───────────────────── */}
          {success && (
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {warning && (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">{warning}</p>
            </div>
          )}

          {errors.length > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <ul className="space-y-0.5">
                  {errors.map((e, i) => (
                    <li key={i} className="text-sm text-destructive">
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={creating || !!success}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {success ? "Done" : "Create Shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Loader2,
  MapPin,
  Clock,
  Users,
  Repeat,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  UserX,
  Info,
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
  const [step, setStep] = useState(1);
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

  // Only fetch eligible staff on step 2 with all params
  const shouldFetch =
    step === 2 && !!locationId && !!date && !!startTime && !!endTime;
  const { data: eligibleStaff, isFetching: fetchingStaff } =
    useGetEligibleStaffQuery(
      {
        locationId,
        skillId: skillId || undefined,
        date: date || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      },
      { skip: !shouldFetch },
    );

  const availableCount = useMemo(
    () => eligibleStaff?.filter((s) => s.available).length ?? 0,
    [eligibleStaff],
  );

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
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

  function validateStep1(): string[] {
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

  function handleNext() {
    setErrors([]);
    const errs = validateStep1();
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setStep(2);
  }

  function handleBack() {
    setStep(1);
    setErrors([]);
    setWarning("");
  }

  async function handleSubmit() {
    setErrors([]);
    setWarning("");
    setSuccess("");

    const tz = selectedLocation?.timezone || "UTC";
    const startISO = localToUTC(date, startTime, tz);
    const endISO = localToUTC(date, endTime, tz);
    const dateISO = localToUTC(date, "00:00", tz);

    try {
      const result = await createShift({
        locationId,
        date: dateISO,
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
            toast.warning("Overtime", {
              description: assignResult.overtimeWarning,
            });
            setSuccess("Shift created & staff assigned.");
            setTimeout(() => onOpenChange(false), 2500);
            return;
          }
        } catch {
          // Assignment failed but shift was created
        }
      }

      const count = Array.isArray(result) ? result.length : 1;
      const msg =
        count > 1
          ? `${count} shifts created successfully!`
          : "Shift created successfully!";
      setSuccess(msg);
      toast.success(msg);
      setTimeout(() => onOpenChange(false), 1200);
    } catch (err: any) {
      const msg = err?.data?.message || "Failed to create shift";
      const errStr = Array.isArray(msg) ? msg.join(", ") : msg;
      setErrors([errStr]);
      toast.error(errStr);
    }
  }

  const selectedLocation = locations.find((l) => l.id === locationId);
  const selectedSkill = skills.find((s) => s.id === skillId);

  /** Convert a date + time (HH:mm) in a given IANA timezone to a UTC ISO string. */
  function localToUTC(dateStr: string, timeStr: string, tz: string): string {
    // Build a formatter that prints in the target timezone
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // Start with a naive UTC date, then compute the offset
    const naive = new Date(`${dateStr}T${timeStr}:00.000Z`);
    const parts = fmt.formatToParts(naive);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
    // What the clock says in that timezone when the UTC is `naive`
    const tzH = parseInt(get("hour"), 10);
    const tzM = parseInt(get("minute"), 10);
    const tzD = parseInt(get("day"), 10);
    // What the clock says in UTC
    const utcH = naive.getUTCHours();
    const utcM = naive.getUTCMinutes();
    const utcD = naive.getUTCDate();
    // Offset = (tz local) - (utc), in minutes
    let offsetMin = tzH * 60 + tzM - (utcH * 60 + utcM);
    if (tzD > utcD) offsetMin += 1440;
    if (tzD < utcD) offsetMin -= 1440;
    // Subtract offset to go from desired local → UTC
    const utc = new Date(naive.getTime() - offsetMin * 60000);
    return utc.toISOString();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Create New Shift</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Set the shift details — location, skill, date and time."
              : "Choose a staff member to assign to this shift."}
          </DialogDescription>
          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-2">
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                step === 1
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/20 text-primary"
              }`}
            >
              {step > 1 ? <CheckCircle2 className="h-3.5 w-3.5" /> : "1"}
            </div>
            <div className="h-px w-8 bg-border" />
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                step === 2
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
            <span className="text-xs text-muted-foreground ml-2">
              {step === 1 ? "Shift Details" : "Assign Staff"}
            </span>
          </div>
        </DialogHeader>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* STEP 1: Shift Details                                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-5 py-1">
            {/* ── Location & Skill ──────────────────────────────────── */}
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

            {/* ── Date & Time ───────────────────────────────────────── */}
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

            {/* ── Headcount & Recurrence ────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Headcount & Recurrence
                </span>
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
                    Repeat
                  </Label>
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
              </div>
              {recurrence !== "none" && (
                <div className="mt-3 max-w-[50%]">
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
                </div>
              )}
            </div>

            {/* ── Step 1 Errors ──────────────────────────────────────── */}
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
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* STEP 2: Staff Assignment                                      */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4 py-1">
            {/* Summary of Step 1 choices */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-1">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {selectedLocation?.name}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {selectedSkill?.name.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {date} · {startTime} – {endTime}
                </span>
              </div>
            </div>

            {/* Staff list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Assign Staff</span>
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                </div>
                {!fetchingStaff && eligibleStaff && (
                  <Badge variant="secondary" className="text-xs">
                    {availableCount} available
                  </Badge>
                )}
              </div>

              {fetchingStaff && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">Checking staff availability…</span>
                </div>
              )}

              {!fetchingStaff &&
                eligibleStaff &&
                eligibleStaff.length === 0 && (
                  <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span className="text-sm">
                      No staff certified for this location with the required
                      skill.
                    </span>
                  </div>
                )}

              {!fetchingStaff && eligibleStaff && eligibleStaff.length > 0 && (
                <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                  {/* "None" option */}
                  <button
                    type="button"
                    onClick={() => setAssignUserId("")}
                    className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      assignUserId === ""
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex-1 text-sm text-muted-foreground">
                      Skip — assign later
                    </div>
                  </button>

                  {eligibleStaff.map((staff) => {
                    const isSelected = assignUserId === staff.id;
                    const isAvailable = staff.available !== false;

                    return (
                      <button
                        key={staff.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setAssignUserId(staff.id)}
                        className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                          !isAvailable
                            ? "opacity-50 cursor-not-allowed border-transparent bg-muted/20"
                            : isSelected
                              ? "border-primary bg-primary/5"
                              : "border-transparent hover:bg-muted/50"
                        }`}
                      >
                        {/* Status icon */}
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
                            isAvailable
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {isAvailable ? (
                            <UserCheck className="h-4 w-4" />
                          ) : (
                            <UserX className="h-4 w-4" />
                          )}
                        </div>

                        {/* Name & status */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {staff.firstName} {staff.lastName}
                          </div>
                          {!isAvailable && staff.conflict && (
                            <div className="text-xs text-red-500 truncate">
                              {staff.conflict}
                            </div>
                          )}
                          {isAvailable && (
                            <div className="text-xs text-green-600">
                              Available
                            </div>
                          )}
                        </div>

                        {/* Radio indicator */}
                        {isAvailable && (
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? "border-primary"
                                : "border-muted-foreground/30"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Feedback: success / warning / errors ──────────────── */}
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
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* Footer                                                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <DialogFooter className="gap-2 sm:gap-0">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleNext}>
                Next: Assign Staff
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={creating}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={creating || !!success}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {success
                  ? "Done"
                  : assignUserId
                    ? "Create & Assign"
                    : "Create Shift"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAppSelector } from "@/store/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Clock,
  Users,
  Trash2,
  UserPlus,
  Send,
  AlertTriangle,
  Loader2,
  X,
  ArrowLeftRight,
  ArrowDown,
  CheckCircle2,
} from "lucide-react";
import type { Shift } from "@/store/api/shiftsApi";
import {
  useUpdateShiftMutation,
  useAssignStaffMutation,
  useUnassignStaffMutation,
  useDeleteShiftMutation,
  useGetEligibleStaffQuery,
  useLazyWhatIfAssignQuery,
} from "@/store/api/shiftsApi";
import {
  useCreateSwapMutation,
  useGetCoworkersQuery,
} from "@/store/api/swapsApi";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ShiftDetailDialogProps {
  shift: Shift | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
}

function formatDateTime(iso: string, tz?: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...(tz ? { timeZone: tz } : {}),
  });
}

export function ShiftDetailDialog({
  shift,
  open,
  onOpenChange,
  canEdit,
}: ShiftDetailDialogProps) {
  const { user } = useAppSelector((s) => s.auth);
  const [assigningStaff, setAssigningStaff] = useState(false);
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [swapSuccess, setSwapSuccess] = useState("");
  const [needsOverride, setNeedsOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const [updateShift, { isLoading: updating }] = useUpdateShiftMutation();
  const [assignStaff, { isLoading: assigning }] = useAssignStaffMutation();
  const [unassignStaff] = useUnassignStaffMutation();
  const [deleteShift, { isLoading: deleting }] = useDeleteShiftMutation();
  const [createSwap, { isLoading: creatingSwap }] = useCreateSwapMutation();
  const [fetchWhatIf, { data: whatIfData, isFetching: loadingWhatIf }] =
    useLazyWhatIfAssignQuery();

  const { data: eligibleStaff } = useGetEligibleStaffQuery(
    {
      locationId: shift?.locationId || "",
      skillId: shift?.requiredSkill.id,
      shiftId: shift?.id,
    },
    { skip: !shift || !assigningStaff },
  );

  const { data: coworkers = [] } = useGetCoworkersQuery(
    {
      locationId: shift?.locationId || "",
      shiftStart: shift?.startTime || "",
      shiftEnd: shift?.endTime || "",
    },
    { skip: !shift || !showSwapPicker },
  );

  if (!shift) return null;

  const isFull = shift.assignments.length >= shift.headcount;

  // 48-hour edit cutoff: published shift starting within 48h is locked
  const isWithin48h =
    shift.status === "PUBLISHED" &&
    new Date(shift.startTime).getTime() - Date.now() < 48 * 3600000;
  const effectiveCanEdit = canEdit && !isWithin48h;

  // Staff swap/drop: find the current user's assignment in this shift
  const myAssignment =
    user && !canEdit
      ? shift.assignments.find((a) => a.user.id === user.id)
      : null;

  async function handleDropRequest() {
    if (!myAssignment) return;
    setError("");
    setSwapSuccess("");
    try {
      await createSwap({
        requestorAssignmentId: myAssignment.id,
        type: "DROP",
      }).unwrap();
      setSwapSuccess("Drop request submitted! A manager will review it.");
      toast.success("Drop request submitted");
    } catch (err: any) {
      const msg = err?.data?.message || "Failed to submit drop request";
      const errStr = Array.isArray(msg) ? msg.join(", ") : msg;
      setError(errStr);
      toast.error(errStr);
    }
  }

  async function handleSwapRequest(targetUserId: string) {
    if (!myAssignment) return;
    setError("");
    setSwapSuccess("");
    try {
      await createSwap({
        requestorAssignmentId: myAssignment.id,
        type: "SWAP",
        targetUserId,
      }).unwrap();
      setSwapSuccess(
        "Swap request submitted! The target staff member will be notified.",
      );
      toast.success("Swap request submitted");
      setShowSwapPicker(false);
    } catch (err: any) {
      const msg = err?.data?.message || "Failed to submit swap request";
      const errStr = Array.isArray(msg) ? msg.join(", ") : msg;
      setError(errStr);
      toast.error(errStr);
    }
  }

  async function handlePublish() {
    if (!shift) return;
    setError("");
    try {
      await updateShift({
        id: shift.id,
        body: { status: "PUBLISHED", version: shift.version },
      }).unwrap();
      toast.success("Shift published");
      onOpenChange(false);
    } catch (err: any) {
      const errMsg = err?.data?.message || "Failed to publish";
      setError(errMsg);
      toast.error(errMsg);
    }
  }

  async function handleUnpublish() {
    if (!shift) return;
    setError("");
    try {
      await updateShift({
        id: shift.id,
        body: { status: "DRAFT", version: shift.version },
      }).unwrap();
      toast.success("Shift unpublished");
      onOpenChange(false);
    } catch (err: any) {
      const errMsg = err?.data?.message || "Failed to unpublish";
      setError(errMsg);
      toast.error(errMsg);
    }
  }

  async function handleDelete() {
    if (!shift) return;
    setError("");
    try {
      await deleteShift(shift.id).unwrap();
      toast.success("Shift deleted");
      onOpenChange(false);
    } catch (err: any) {
      const errMsg = err?.data?.message || "Failed to delete shift";
      setError(errMsg);
      toast.error(errMsg);
    }
  }

  async function handleAssign() {
    if (!shift || !selectedUserId) return;
    setError("");
    setWarning("");
    try {
      const result = await assignStaff({
        shiftId: shift.id,
        userId: selectedUserId,
        ...(needsOverride && overrideReason ? { overrideReason } : {}),
      }).unwrap();
      if (result.overtimeWarning) {
        setWarning(result.overtimeWarning);
        toast.warning("Overtime", { description: result.overtimeWarning });
      } else {
        toast.success("Staff assigned");
      }
      setSelectedUserId("");
      setAssigningStaff(false);
      setNeedsOverride(false);
      setOverrideReason("");
    } catch (err: any) {
      const msg = err?.data?.message || "Failed to assign staff";
      const errStr = Array.isArray(msg) ? msg.join(", ") : msg;
      // If 7th consecutive day error, prompt for override reason
      if (errStr.includes("7th day")) {
        setNeedsOverride(true);
        setError(errStr);
      } else {
        setNeedsOverride(false);
        setError(errStr);
      }
      toast.error(errStr);
    }
  }

  async function handleUnassign(assignmentId: string) {
    if (!shift) return;
    setError("");
    try {
      await unassignStaff({
        shiftId: shift.id,
        assignmentId,
      }).unwrap();
      toast.success("Staff removed from shift");
    } catch (err: any) {
      const errMsg = err?.data?.message || "Failed to remove assignment";
      setError(errMsg);
      toast.error(errMsg);
    }
  }

  // Filter out already-assigned staff; backend already sorts available first
  const assignedIds = new Set(shift.assignments.map((a) => a.user.id));
  const availableStaff =
    eligibleStaff?.filter((s) => !assignedIds.has(s.id)) || [];

  // Check if selected staff member is available
  const selectedStaffInfo = availableStaff.find((s) => s.id === selectedUserId);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setSwapSuccess("");
          setError("");
          setShowSwapPicker(false);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Shift Details
            <Badge
              variant={shift.status === "PUBLISHED" ? "default" : "outline"}
              className={
                shift.status === "DRAFT"
                  ? "text-amber-600 border-amber-300"
                  : shift.status === "CANCELLED"
                    ? "text-red-600 border-red-300"
                    : ""
              }
            >
              {shift.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {shift.location.name} · {shift.requiredSkill.name.replace("_", " ")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Info */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {shift.location.name}{" "}
                <span className="text-xs">({shift.location.timezone})</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {formatDateTime(shift.startTime, shift.location.timezone)} –{" "}
                {formatDateTime(shift.endTime, shift.location.timezone)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {shift.assignments.length}/{shift.headcount} assigned
              </span>
            </div>
          </div>

          <Separator />

          {/* Assignments */}
          <div>
            <p className="text-sm font-medium mb-2">Assigned Staff</p>
            {shift.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No one assigned yet.
              </p>
            ) : (
              <div className="space-y-2">
                {shift.assignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {a.user.firstName[0]}
                        {a.user.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {a.user.firstName} {a.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.user.email}
                        </p>
                      </div>
                    </div>
                    {effectiveCanEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleUnassign(a.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Assign staff inline */}
            {effectiveCanEdit && !isFull && (
              <div className="mt-3">
                {!assigningStaff ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssigningStaff(true)}
                    className="w-full"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Staff
                  </Button>
                ) : (
                  <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                    <Select
                      value={selectedUserId}
                      onValueChange={(v) => {
                        setSelectedUserId(v);
                        if (v && shift)
                          fetchWhatIf({ shiftId: shift.id, userId: v });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStaff.map((s) => (
                          <SelectItem
                            key={s.id}
                            value={s.id}
                            disabled={s.available === false}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={
                                  s.available === false
                                    ? "text-muted-foreground"
                                    : ""
                                }
                              >
                                {s.firstName} {s.lastName}
                              </span>
                              {s.available === false && s.conflict && (
                                <span className="text-xs text-destructive">
                                  ({s.conflict})
                                </span>
                              )}
                              {s.available === true && (
                                <span className="text-xs text-emerald-600">
                                  ✓
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                        {availableStaff.length === 0 && (
                          <div className="p-2 text-sm text-muted-foreground">
                            No eligible staff available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    {selectedStaffInfo?.available === false && (
                      <p className="text-xs text-destructive">
                        {selectedStaffInfo.conflict}
                      </p>
                    )}
                    {needsOverride && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-amber-700">
                          7th consecutive day — provide override reason:
                        </label>
                        <input
                          type="text"
                          className="flex h-8 w-full rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                          placeholder="e.g. Short-staffed, coverage needed"
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                        />
                      </div>
                    )}
                    {/* What-if impact preview */}
                    {selectedUserId && whatIfData && !loadingWhatIf && (
                      <div
                        className={`rounded-md border p-2.5 text-xs space-y-1 ${whatIfData.blocked ? "border-destructive bg-destructive/5" : whatIfData.warnings.length > 0 ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50"}`}
                      >
                        <p className="font-medium text-muted-foreground">
                          Impact Preview
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                          <span className="text-muted-foreground">
                            Daily hours:
                          </span>
                          <span>
                            {whatIfData.impact.currentDailyHours}h →{" "}
                            <strong>
                              {whatIfData.impact.projectedDailyHours}h
                            </strong>
                          </span>
                          <span className="text-muted-foreground">
                            Weekly hours:
                          </span>
                          <span>
                            {whatIfData.impact.currentWeeklyHours}h →{" "}
                            <strong>
                              {whatIfData.impact.projectedWeeklyHours}h
                            </strong>
                          </span>
                          <span className="text-muted-foreground">
                            Consecutive days:
                          </span>
                          <span>
                            <strong>{whatIfData.impact.consecutiveDays}</strong>
                          </span>
                          {whatIfData.impact.overtimeHours > 0 && (
                            <>
                              <span className="text-muted-foreground">
                                Overtime hours:
                              </span>
                              <span className="text-amber-700 font-medium">
                                {whatIfData.impact.overtimeHours}h
                              </span>
                            </>
                          )}
                          <span className="text-muted-foreground">
                            Cost impact:
                          </span>
                          <span>
                            +${whatIfData.impact.additionalCost.toFixed(2)}
                          </span>
                        </div>
                        {whatIfData.warnings.map((w, i) => (
                          <p
                            key={i}
                            className="text-amber-700 flex items-center gap-1"
                          >
                            <AlertTriangle className="h-3 w-3 shrink-0" /> {w}
                          </p>
                        ))}
                        {whatIfData.blocked && (
                          <p className="text-destructive font-medium">
                            Assignment blocked — requires override
                          </p>
                        )}
                      </div>
                    )}
                    {selectedUserId && loadingWhatIf && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Analyzing
                        impact…
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAssign}
                        disabled={
                          !selectedUserId ||
                          assigning ||
                          (needsOverride && !overrideReason.trim())
                        }
                      >
                        {assigning && (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        )}
                        Assign
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAssigningStaff(false);
                          setSelectedUserId("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 48h cutoff notice */}
          {canEdit && isWithin48h && (
            <Card className="p-3 border-amber-300 bg-amber-50">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-700">
                  This published shift starts within 48 hours and cannot be
                  edited.
                </p>
              </div>
            </Card>
          )}

          {/* Error */}
          {error && (
            <Card className="p-3 border-destructive bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </Card>
          )}

          {/* Overtime warning */}
          {warning && (
            <Card className="p-3 border-amber-400 bg-amber-50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-700">{warning}</p>
              </div>
            </Card>
          )}

          {/* Swap success */}
          {swapSuccess && (
            <Card className="p-3 border-green-400 bg-green-50">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                <p className="text-sm text-green-700">{swapSuccess}</p>
              </div>
            </Card>
          )}

          {/* Staff: Request Swap / Drop */}
          {myAssignment && !swapSuccess && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium">Shift Actions</p>

                {!showSwapPicker ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowSwapPicker(true)}
                      disabled={creatingSwap}
                      className="flex-1"
                    >
                      <ArrowLeftRight className="h-4 w-4 mr-2" />
                      Request Swap
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDropRequest}
                      disabled={creatingSwap}
                      className="flex-1"
                    >
                      {creatingSwap ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowDown className="h-4 w-4 mr-2" />
                      )}
                      Request Drop
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Select a coworker to swap with
                    </p>
                    {coworkers.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        No coworkers found at this location.
                      </p>
                    ) : (
                      <TooltipProvider>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {coworkers.map((cw) => (
                            <Tooltip key={cw.id}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  disabled={!cw.available || creatingSwap}
                                  onClick={() => handleSwapRequest(cw.id)}
                                  className={`flex w-full items-center gap-2 rounded-md border p-2 text-left transition-colors ${
                                    cw.available
                                      ? "hover:bg-primary/5 hover:border-primary/30 cursor-pointer"
                                      : "opacity-50 cursor-not-allowed bg-muted/20"
                                  }`}
                                >
                                  <div
                                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                                      cw.available
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {cw.firstName[0]}
                                    {cw.lastName[0]}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {cw.firstName} {cw.lastName}
                                    </p>
                                    {!cw.available && (
                                      <p className="text-[11px] text-amber-600">
                                        {cw.conflictReason}
                                      </p>
                                    )}
                                  </div>
                                  {cw.available ? (
                                    <Badge
                                      variant="outline"
                                      className="text-green-700 border-green-300 text-[10px] shrink-0"
                                    >
                                      Available
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-amber-600 border-amber-300 text-[10px] shrink-0"
                                    >
                                      Busy
                                    </Badge>
                                  )}
                                </button>
                              </TooltipTrigger>
                              {!cw.available && (
                                <TooltipContent>
                                  <p>{cw.conflictReason}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          ))}
                        </div>
                      </TooltipProvider>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSwapPicker(false)}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          {effectiveCanEdit && (
            <>
              <Separator />
              <div className="flex gap-2">
                {shift.status === "DRAFT" && (
                  <Button
                    size="sm"
                    onClick={handlePublish}
                    disabled={updating}
                    className="flex-1"
                  >
                    {updating ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-1" />
                    )}
                    Publish
                  </Button>
                )}
                {shift.status === "PUBLISHED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleUnpublish}
                    disabled={updating}
                    className="flex-1"
                  >
                    Unpublish
                  </Button>
                )}
                {shift.status === "DRAFT" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useAppSelector } from "@/store/store";
import {
  useListShiftsQuery,
  useGetLocationsQuery,
  useGetSkillsQuery,
  useMoveShiftMutation,
  type Shift,
} from "@/store/api/shiftsApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  Users,
} from "lucide-react";
import { ShiftCard } from "./shift-card";
import { CreateShiftDialog } from "./create-shift-dialog";
import { ShiftDetailDialog } from "./shift-detail-dialog";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** Return YYYY-MM-DD in a given timezone (or UTC if not provided). */
function dateStrInTz(d: Date, tz?: string): string {
  if (!tz) return d.toISOString().split("T")[0];
  // Format as YYYY-MM-DD in the location's timezone
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${day}`;
}

/** Return YYYY-MM-DD in UTC for a Date. */
function utcDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function toDateStr(d: Date): string {
  return utcDateStr(d);
}

function isToday(d: Date): boolean {
  return utcDateStr(d) === utcDateStr(new Date());
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function WeeklyCalendar() {
  const { user } = useAppSelector((s) => s.auth);
  const role = user?.role || "STAFF";
  const canEdit = role === "ADMIN" || role === "MANAGER";

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<{ date?: string }>({});
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const weekEnd = addDays(weekStart, 6);

  const { data: locations = [] } = useGetLocationsQuery();
  const { data: skills = [] } = useGetSkillsQuery();
  const {
    data: shifts = [],
    isLoading,
    isFetching,
  } = useListShiftsQuery({
    weekStart: toDateStr(weekStart),
    weekEnd: toDateStr(weekEnd),
    ...(selectedLocationId !== "all" && { locationId: selectedLocationId }),
  });

  const [moveShift] = useMoveShiftMutation();

  // For MANAGER with a single location, auto-select it
  const effectiveDefaultLocationId =
    role === "MANAGER" && locations.length === 1 ? locations[0].id : undefined;

  // Group shifts by day index using the shift's location timezone
  const shiftsByDay = useMemo(() => {
    const map = new Map<number, Shift[]>();
    for (const shift of shifts) {
      const shiftKey = dateStrInTz(
        new Date(shift.startTime),
        shift.location?.timezone,
      );
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const colKey = utcDateStr(addDays(weekStart, dayIdx));
        if (shiftKey === colKey) {
          const arr = map.get(dayIdx) || [];
          arr.push(shift);
          map.set(dayIdx, arr);
          break;
        }
      }
    }
    return map;
  }, [shifts, weekStart]);

  // ─── Event Handlers ────────────────────────────────────────────────────

  function handlePrevWeek() {
    setWeekStart((prev) => addDays(prev, -7));
  }

  function handleNextWeek() {
    setWeekStart((prev) => addDays(prev, 7));
  }

  function handleToday() {
    setWeekStart(getWeekStart(new Date()));
  }

  function handleCellClick(dayIdx: number) {
    if (!canEdit) return;
    const d = addDays(weekStart, dayIdx);
    setCreatePrefill({ date: toDateStr(d) });
    setShowCreateDialog(true);
  }

  function handleCreateClick() {
    setCreatePrefill({});
    setShowCreateDialog(true);
  }

  // ─── Drag and Drop ────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent, cellKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCell(cellKey);
  }

  function handleDragLeave() {
    setDragOverCell(null);
  }

  async function handleDrop(e: React.DragEvent, dayIdx: number) {
    e.preventDefault();
    setDragOverCell(null);

    const shiftId = e.dataTransfer.getData("shiftId");
    if (!shiftId) return;

    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    // Keep same time-of-day, move to the new date
    const oldStart = new Date(shift.startTime);
    const oldEnd = new Date(shift.endTime);
    const duration = oldEnd.getTime() - oldStart.getTime();

    const dropDate = addDays(weekStart, dayIdx);
    const newStart = new Date(dropDate);
    newStart.setUTCHours(
      oldStart.getUTCHours(),
      oldStart.getUTCMinutes(),
      oldStart.getUTCSeconds(),
      0,
    );
    const newEnd = new Date(newStart.getTime() + duration);

    try {
      await moveShift({
        id: shift.id,
        body: {
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
          date: toDateStr(dropDate),
          version: shift.version,
        },
      }).unwrap();
    } catch {
      // Revert will happen via re-fetch
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  const weekLabel = `${weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })} – ${weekEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })}`;

  return (
    <div className="space-y-3">
      {/* ── Header + Navigation + Filters + Create ────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Schedule
          </h1>
          <p className="text-sm text-muted-foreground">
            {role === "STAFF"
              ? "Your scheduled shifts"
              : "Manage shifts across your locations"}
          </p>
        </div>
      </div>

      {/* ── Navigation + Filters + Create — all on one row ──────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToday}>
            Today
          </Button>
          <span className="min-w-[180px] text-center text-sm font-medium">
            {weekLabel}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {isFetching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Location filter */}
          {(role === "ADMIN" || locations.length > 1) && (
            <Select
              value={selectedLocationId}
              onValueChange={setSelectedLocationId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                {role === "ADMIN" && (
                  <SelectItem value="all">All Locations</SelectItem>
                )}
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {canEdit && (
            <Button onClick={handleCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Create Shift
            </Button>
          )}
        </div>
      </div>

      {/* ── Calendar Grid — day columns ─────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header row */}
            <div className="grid grid-cols-7 border-b bg-muted/30">
              {DAYS.map((day, idx) => {
                const date = addDays(weekStart, idx);
                const today = isToday(date);
                return (
                  <div
                    key={day}
                    className={`p-3 text-center ${today ? "bg-primary/5" : ""}`}
                  >
                    <p
                      className={`text-xs font-medium ${today ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {day.slice(0, 3)}
                    </p>
                    <p
                      className={`text-lg font-semibold ${today ? "text-primary" : ""}`}
                    >
                      {date.getUTCDate()}
                    </p>
                    {today && (
                      <Badge
                        variant="default"
                        className="mt-0.5 text-[10px] px-1.5 py-0"
                      >
                        Today
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Day columns — single row with all shifts per day */}
            {isLoading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading schedule…
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {DAYS.map((_, dayIdx) => {
                  const cellKey = `${dayIdx}`;
                  const dayShifts = shiftsByDay.get(dayIdx) || [];
                  const date = addDays(weekStart, dayIdx);
                  const today = isToday(date);
                  const isDragOver = dragOverCell === cellKey;

                  return (
                    <div
                      key={dayIdx}
                      className={`min-h-[300px] border-r last:border-r-0 p-2 transition-colors ${
                        today ? "bg-primary/[0.02]" : ""
                      } ${isDragOver ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : ""} ${
                        canEdit ? "cursor-pointer" : ""
                      }`}
                      onClick={() => {
                        if (dayShifts.length === 0) {
                          handleCellClick(dayIdx);
                        }
                      }}
                      onDragOver={(e) => handleDragOver(e, cellKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dayIdx)}
                    >
                      <div className="space-y-2">
                        {dayShifts.map((shift) => (
                          <ShiftCard
                            key={shift.id}
                            shift={shift}
                            canEdit={canEdit}
                            onClick={(s) => setSelectedShift(s)}
                          />
                        ))}
                        {dayShifts.length === 0 && canEdit && (
                          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50">
                            + Click to add
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <Card className="p-3">
        <div className="flex items-center gap-6 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">
            Legend:
          </span>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded border-l-2 border-l-green-500 bg-white border" />
            <span className="text-xs">Published</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded border-l-2 border-l-amber-400 bg-amber-50 border" />
            <span className="text-xs">Draft</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3 w-3 text-green-600" />
            <span className="text-xs">Fully staffed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3 w-3 text-orange-600" />
            <span className="text-xs">Needs assignment</span>
          </div>
        </div>
      </Card>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <CreateShiftDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        locations={locations}
        skills={skills}
        prefillDate={createPrefill.date}
        defaultLocationId={effectiveDefaultLocationId}
      />

      <ShiftDetailDialog
        shift={selectedShift}
        open={!!selectedShift}
        onOpenChange={(open) => {
          if (!open) setSelectedShift(null);
        }}
        canEdit={canEdit}
      />
    </div>
  );
}

"use client";

import type { Shift } from "@/store/api/shiftsApi";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Users } from "lucide-react";

interface ShiftCardProps {
  shift: Shift;
  onDragStart?: (shift: Shift) => void;
  onClick?: (shift: Shift) => void;
  canEdit: boolean;
}

const skillColors: Record<string, string> = {
  bartender: "bg-purple-100 text-purple-700 border-purple-200",
  server: "bg-blue-100 text-blue-700 border-blue-200",
  line_cook: "bg-orange-100 text-orange-700 border-orange-200",
  host: "bg-pink-100 text-pink-700 border-pink-200",
  prep_cook: "bg-yellow-100 text-yellow-700 border-yellow-200",
  dishwasher: "bg-gray-100 text-gray-700 border-gray-200",
};

const statusColors: Record<string, string> = {
  DRAFT: "border-l-amber-400 bg-amber-50/60",
  PUBLISHED: "border-l-green-500 bg-white",
  CANCELLED: "border-l-red-400 bg-red-50/40 opacity-60",
};

function formatTime(iso: string, tz?: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...(tz ? { timeZone: tz } : {}),
  });
}

export function ShiftCard({
  shift,
  onDragStart,
  onClick,
  canEdit,
}: ShiftCardProps) {
  const isFull = shift.assignments.length >= shift.headcount;

  return (
    <div
      className={`group relative cursor-pointer rounded-md border border-l-4 p-2 text-xs shadow-sm transition-all hover:shadow-md ${statusColors[shift.status] || "bg-white"}`}
      draggable={canEdit}
      onDragStart={(e) => {
        if (!canEdit) return;
        e.dataTransfer.setData("shiftId", shift.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(shift);
      }}
      onClick={() => onClick?.(shift)}
    >
      {canEdit && (
        <GripVertical className="absolute right-0.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}

      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="font-medium truncate">
          {formatTime(shift.startTime, shift.location.timezone)} –{" "}
          {formatTime(shift.endTime, shift.location.timezone)}
        </span>
        {shift.status === "DRAFT" && (
          <Badge
            variant="outline"
            className="text-[10px] px-1 py-0 text-amber-600 border-amber-300"
          >
            Draft
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={`inline-block rounded-full border px-1.5 py-0 text-[10px] font-medium ${
            skillColors[shift.requiredSkill.name] || "bg-gray-100 text-gray-600"
          }`}
        >
          {shift.requiredSkill.name.replace("_", " ")}
        </span>
        <span className="text-[10px] text-muted-foreground truncate">
          {shift.location.name}
        </span>
      </div>

      <div className="flex items-center gap-1 text-muted-foreground">
        <Users className="h-3 w-3" />
        <span
          className={`text-[10px] font-medium ${isFull ? "text-green-600" : "text-orange-600"}`}
        >
          {shift.assignments.length}/{shift.headcount}
        </span>
        {shift.assignments.length > 0 && (
          <span className="truncate text-[10px]">
            {shift.assignments
              .slice(0, 2)
              .map((a) => a.user.firstName)
              .join(", ")}
            {shift.assignments.length > 2 &&
              ` +${shift.assignments.length - 2}`}
          </span>
        )}
      </div>
    </div>
  );
}

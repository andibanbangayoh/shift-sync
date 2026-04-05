"use client";

import { useState } from "react";
import { useGetAuditLogsQuery, type AuditLogEntry } from "@/store/api/auditApi";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ClipboardList,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  ArrowRight,
} from "lucide-react";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  SHIFT_CREATED: {
    label: "Shift Created",
    color: "bg-green-100 text-green-800",
  },
  SHIFT_UPDATED: {
    label: "Shift Updated",
    color: "bg-blue-100 text-blue-800",
  },
  SHIFT_PUBLISHED: {
    label: "Shift Published",
    color: "bg-purple-100 text-purple-800",
  },
  SHIFT_MOVED: { label: "Shift Moved", color: "bg-amber-100 text-amber-800" },
  SHIFT_DELETED: { label: "Shift Deleted", color: "bg-red-100 text-red-800" },
  STAFF_ASSIGNED: {
    label: "Staff Assigned",
    color: "bg-teal-100 text-teal-800",
  },
  STAFF_UNASSIGNED: {
    label: "Staff Unassigned",
    color: "bg-orange-100 text-orange-800",
  },
  SWAP_REQUESTED: {
    label: "Swap Requested",
    color: "bg-indigo-100 text-indigo-800",
  },
  DROP_REQUESTED: {
    label: "Drop Requested",
    color: "bg-indigo-100 text-indigo-800",
  },
  SWAP_ACCEPTED: {
    label: "Swap Accepted",
    color: "bg-cyan-100 text-cyan-800",
  },
  SWAP_REJECTED_BY_TARGET: {
    label: "Swap Rejected (Staff)",
    color: "bg-rose-100 text-rose-800",
  },
  SWAP_CANCELLED: {
    label: "Swap Cancelled",
    color: "bg-gray-100 text-gray-800",
  },
  SWAP_APPROVED: {
    label: "Swap Approved",
    color: "bg-emerald-100 text-emerald-800",
  },
  SWAP_REJECTED_BY_MANAGER: {
    label: "Swap Rejected (Manager)",
    color: "bg-red-100 text-red-800",
  },
};

const ENTITY_LABELS: Record<string, string> = {
  SHIFT: "Shift",
  SHIFT_ASSIGNMENT: "Assignment",
  SWAP_REQUEST: "Swap Request",
  USER: "User",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(iso);
}

/** Build a human-readable summary from audit log data. */
function summarizeLog(log: AuditLogEntry): string {
  const state = log.afterState || log.beforeState;
  if (!state) return "";
  const parts: string[] = [];

  if (state.location) parts.push(`at ${state.location}`);
  if (state.staffName) parts.push(state.staffName);
  if (state.staffEmail) parts.push(`(${state.staffEmail})`);
  if (state.requestor) parts.push(`by ${state.requestor}`);
  if (state.target) parts.push(`→ ${state.target}`);
  if (state.shiftLocation) parts.push(`at ${state.shiftLocation}`);

  // Format shift date/time
  const dateField = state.shiftDate || state.date || state.startTime;
  if (dateField) {
    try {
      const d = new Date(dateField);
      parts.push(
        `on ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`,
      );
    } catch {
      // skip
    }
  }

  if (state.status) parts.push(`→ ${state.status}`);
  if (state.reason) parts.push(`— "${state.reason}"`);

  return parts.join(" ");
}

export default function AuditPage() {
  const [entityType, setEntityType] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [detailLog, setDetailLog] = useState<AuditLogEntry | null>(null);

  const { data, isLoading } = useGetAuditLogsQuery({
    ...(entityType !== "all" && { entityType }),
    ...(action !== "all" && { action }),
    ...(fromDate && { from: fromDate }),
    ...(toDate && { to: toDate }),
    page,
    limit: 20,
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Audit Trail
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track all schedule changes, assignments, and staff actions
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Entity
            </label>
            <Select
              value={entityType}
              onValueChange={(v) => {
                setEntityType(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="SHIFT">Shifts</SelectItem>
                <SelectItem value="SHIFT_ASSIGNMENT">Assignments</SelectItem>
                <SelectItem value="SWAP_REQUEST">Swaps</SelectItem>
                <SelectItem value="USER">Users</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Action
            </label>
            <Select
              value={action}
              onValueChange={(v) => {
                setAction(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="SHIFT_CREATED">Shift Created</SelectItem>
                <SelectItem value="SHIFT_UPDATED">Shift Updated</SelectItem>
                <SelectItem value="SHIFT_PUBLISHED">Shift Published</SelectItem>
                <SelectItem value="SHIFT_MOVED">Shift Moved</SelectItem>
                <SelectItem value="SHIFT_DELETED">Shift Deleted</SelectItem>
                <SelectItem value="STAFF_ASSIGNED">Staff Assigned</SelectItem>
                <SelectItem value="STAFF_UNASSIGNED">
                  Staff Unassigned
                </SelectItem>
                <SelectItem value="SWAP_REQUESTED">Swap Requested</SelectItem>
                <SelectItem value="DROP_REQUESTED">Drop Requested</SelectItem>
                <SelectItem value="SWAP_ACCEPTED">Swap Accepted</SelectItem>
                <SelectItem value="SWAP_REJECTED_BY_TARGET">
                  Swap Rejected (Staff)
                </SelectItem>
                <SelectItem value="SWAP_CANCELLED">Swap Cancelled</SelectItem>
                <SelectItem value="SWAP_APPROVED">Swap Approved</SelectItem>
                <SelectItem value="SWAP_REJECTED_BY_MANAGER">
                  Swap Rejected (Manager)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              From
            </label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-[150px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              To
            </label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-[150px]"
            />
          </div>

          {(entityType !== "all" || action !== "all" || fromDate || toDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEntityType("all");
                setAction("all");
                setFromDate("");
                setToDate("");
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          )}

          {meta && (
            <div className="ml-auto text-sm text-muted-foreground">
              {meta.total} {meta.total === 1 ? "entry" : "entries"}
            </div>
          )}
        </div>
      </Card>

      {/* Logs */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-muted rounded" />
                  <div className="h-3 w-64 bg-muted rounded" />
                </div>
                <div className="h-5 w-24 bg-muted rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No audit logs found</p>
          <p className="text-sm mt-1">
            {entityType !== "all" || action !== "all" || fromDate || toDate
              ? "Try adjusting your filters"
              : "Actions will appear here as changes are made"}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <AuditRow key={log.id} log={log} onViewDetail={setDetailLog} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit Log Detail</DialogTitle>
          </DialogHeader>
          {detailLog && <AuditDetail log={detailLog} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AuditRow({
  log,
  onViewDetail,
}: {
  log: AuditLogEntry;
  onViewDetail: (log: AuditLogEntry) => void;
}) {
  const actionInfo = ACTION_LABELS[log.action] ?? {
    label: log.action,
    color: "bg-gray-100 text-gray-800",
  };

  return (
    <Card
      className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
      onClick={() => onViewDetail(log)}
    >
      <div className="flex items-center gap-4">
        {/* User avatar */}
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
          {log.user.firstName[0]}
          {log.user.lastName[0]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {log.user.firstName} {log.user.lastName}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 ${actionInfo.color}`}
            >
              {actionInfo.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5">
              {ENTITY_LABELS[log.entityType] ?? log.entityType}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {summarizeLog(log) ||
              (ENTITY_LABELS[log.entityType] ?? log.entityType)}{" "}
            &middot; {formatRelative(log.createdAt)}
          </p>
        </div>

        {/* View button */}
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

/** Format state keys into friendly labels. */
const FIELD_LABELS: Record<string, string> = {
  location: "Location",
  shiftLocation: "Shift Location",
  skill: "Skill",
  date: "Date",
  startTime: "Start Time",
  endTime: "End Time",
  shiftDate: "Shift Date",
  headcount: "Headcount",
  status: "Status",
  type: "Type",
  staffName: "Staff Member",
  staffEmail: "Staff Email",
  requestor: "Requestor",
  requestorEmail: "Requestor Email",
  target: "Target Staff",
  respondedBy: "Responded By",
  approvedBy: "Approved By",
  reason: "Reason",
  overrideReason: "Override Reason",
  recurrence: "Recurrence",
};

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined) return "—";
  if (
    typeof value === "string" &&
    (key.toLowerCase().includes("date") ||
      key.toLowerCase().includes("time")) &&
    !isNaN(Date.parse(value))
  ) {
    return new Date(value).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function StateTable({
  label,
  state,
  variant,
}: {
  label: string;
  state: Record<string, any>;
  variant: "before" | "after";
}) {
  const bg =
    variant === "before"
      ? "bg-red-50 border-red-200"
      : "bg-green-50 border-green-200";
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <div className={`rounded-lg border ${bg} overflow-hidden`}>
        <table className="w-full text-xs">
          <tbody>
            {Object.entries(state)
              .filter(([, v]) => v !== undefined)
              .map(([key, value]) => (
                <tr key={key} className="border-t first:border-t-0">
                  <td className="px-3 py-1.5 font-medium text-muted-foreground w-1/3">
                    {FIELD_LABELS[key] ?? key}
                  </td>
                  <td className="px-3 py-1.5">{formatValue(key, value)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditDetail({ log }: { log: AuditLogEntry }) {
  const actionInfo = ACTION_LABELS[log.action] ?? {
    label: log.action,
    color: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-4">
      {/* Action & Time */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={actionInfo.color}>{actionInfo.label}</Badge>
        <Badge variant="outline">
          {ENTITY_LABELS[log.entityType] ?? log.entityType}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatDateTime(log.createdAt)}
        </span>
      </div>

      {/* Actor */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {log.user.firstName} {log.user.lastName}
        </span>
        <span className="text-xs text-muted-foreground">
          ({log.user.email})
        </span>
        <Badge variant="outline" className="text-[10px] ml-auto">
          {log.user.role}
        </Badge>
      </div>

      {/* Before / After as formatted tables */}
      {(log.beforeState || log.afterState) && (
        <div className="grid grid-cols-1 gap-3">
          {log.beforeState && (
            <StateTable
              label="Before"
              state={log.beforeState}
              variant="before"
            />
          )}
          {log.afterState && (
            <StateTable label="After" state={log.afterState} variant="after" />
          )}
        </div>
      )}

      {/* Reason */}
      {log.reason && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-xs font-medium text-amber-800 mb-1">Reason</p>
          <p className="text-sm text-amber-900">{log.reason}</p>
        </div>
      )}
    </div>
  );
}

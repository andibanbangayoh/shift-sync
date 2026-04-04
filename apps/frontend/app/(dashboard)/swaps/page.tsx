"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/store";
import {
  useListSwapsQuery,
  useGetSwapStatsQuery,
  useResolveSwapMutation,
  useRespondToSwapMutation,
  useCancelSwapMutation,
  type SwapRequest,
} from "@/store/api/swapsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeftRight,
  ArrowDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  User,
  Loader2,
} from "lucide-react";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function statusBadge(status: SwapRequest["status"]) {
  const map: Record<
    SwapRequest["status"],
    { label: string; className: string }
  > = {
    PENDING: {
      label: "Pending",
      className: "bg-amber-100 text-amber-800 border-amber-200",
    },
    ACCEPTED: {
      label: "Accepted",
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
    MANAGER_APPROVED: {
      label: "Approved",
      className: "bg-green-100 text-green-800 border-green-200",
    },
    REJECTED: {
      label: "Rejected",
      className: "bg-red-100 text-red-800 border-red-200",
    },
    CANCELLED: {
      label: "Cancelled",
      className: "bg-gray-100 text-gray-800 border-gray-200",
    },
    EXPIRED: {
      label: "Expired",
      className: "border-gray-300 text-gray-500 bg-transparent",
    },
  };
  const s = map[status];
  return <Badge className={s.className}>{s.label}</Badge>;
}

// ─── Swap Request Card ─────────────────────────────────────────────────────────

function SwapRequestCard({
  swap,
  userRole,
  userId,
  onResolve,
  onRespond,
  onCancel,
  isResolving,
}: {
  swap: SwapRequest;
  userRole: string;
  userId: string;
  onResolve: (id: string, action: "approve" | "reject") => void;
  onRespond: (id: string, action: "accept" | "reject") => void;
  onCancel: (id: string) => void;
  isResolving: boolean;
}) {
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "MANAGER";
  const isRequestor = swap.requestor.id === userId;
  const isTarget = swap.targetUser?.id === userId;

  // Can this user approve/reject (manager action)?
  const canResolve =
    isManagerOrAdmin &&
    (swap.type === "DROP"
      ? swap.status === "PENDING"
      : swap.status === "ACCEPTED" || swap.status === "PENDING");

  // Can target staff respond?
  const canRespondAsTarget =
    isTarget && swap.status === "PENDING" && swap.type === "SWAP";

  // Can requestor cancel?
  const canCancel =
    isRequestor && (swap.status === "PENDING" || swap.status === "ACCEPTED");

  return (
    <Card className="overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          {swap.type === "SWAP" ? (
            <ArrowLeftRight className="h-4 w-4 text-blue-600" />
          ) : (
            <ArrowDown className="h-4 w-4 text-orange-600" />
          )}
          <span className="text-sm font-semibold">
            {swap.type === "SWAP" ? "Shift Swap" : "Shift Drop"}
          </span>
          {statusBadge(swap.status)}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDate(swap.requestedAt)}
        </span>
      </div>

      {/* Body — 3-column grid: From | Shift Details | To */}
      <CardContent className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* From */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              From
            </p>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                {swap.requestor.firstName[0]}
                {swap.requestor.lastName[0]}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {swap.requestor.firstName} {swap.requestor.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {swap.requestor.email}
                </p>
              </div>
            </div>
          </div>

          {/* Shift Details */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Shift
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{formatDate(swap.requestorAssignment.shift.date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {formatTime(swap.requestorAssignment.shift.startTime)} –{" "}
                  {formatTime(swap.requestorAssignment.shift.endTime)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{swap.requestorAssignment.shift.location.name}</span>
              </div>
            </div>
          </div>

          {/* To */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {swap.type === "SWAP" ? "To" : "Coverage"}
            </p>
            {swap.type === "SWAP" && swap.targetUser ? (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  {swap.targetUser.firstName[0]}
                  {swap.targetUser.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {swap.targetUser.firstName} {swap.targetUser.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {swap.targetUser.email}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>
                  {swap.type === "DROP"
                    ? "Requesting to drop"
                    : "Awaiting target"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Expiry note */}
        {swap.expiresAt &&
          (swap.status === "PENDING" || swap.status === "ACCEPTED") && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Expires {formatDate(swap.expiresAt)}</span>
            </div>
          )}

        {/* Rejection reason */}
        {swap.cancellationReason &&
          (swap.status === "REJECTED" || swap.status === "CANCELLED") && (
            <div className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700">
              <strong>Reason:</strong> {swap.cancellationReason}
            </div>
          )}

        {/* Resolved by info */}
        {swap.resolvedBy && swap.resolvedAt && (
          <div className="mt-3 text-xs text-muted-foreground">
            Resolved by {swap.resolvedBy.firstName} {swap.resolvedBy.lastName}{" "}
            on {formatDate(swap.resolvedAt)}
          </div>
        )}

        {/* Action buttons */}
        {(canResolve || canRespondAsTarget || canCancel) && (
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
            {canResolve && (
              <>
                <Button
                  size="sm"
                  onClick={() => onResolve(swap.id, "approve")}
                  disabled={isResolving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isResolving ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onResolve(swap.id, "reject")}
                  disabled={isResolving}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  Reject
                </Button>
              </>
            )}
            {canRespondAsTarget && (
              <>
                <Button
                  size="sm"
                  onClick={() => onRespond(swap.id, "accept")}
                  disabled={isResolving}
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Accept Swap
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onRespond(swap.id, "reject")}
                  disabled={isResolving}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  Decline
                </Button>
              </>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel(swap.id)}
                disabled={isResolving}
              >
                Cancel Request
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SwapsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [tab, setTab] = useState("pending");
  const { data: swaps = [], isLoading } = useListSwapsQuery();
  const { data: stats } = useGetSwapStatsQuery();
  const [resolveSwap, { isLoading: isResolving }] = useResolveSwapMutation();
  const [respondToSwap] = useRespondToSwapMutation();
  const [cancelSwap] = useCancelSwapMutation();

  if (!user) return null;

  const handleResolve = async (id: string, action: "approve" | "reject") => {
    try {
      await resolveSwap({ id, action }).unwrap();
    } catch {
      // Error handled by RTK Query
    }
  };

  const handleRespond = async (id: string, action: "accept" | "reject") => {
    try {
      await respondToSwap({ id, action }).unwrap();
    } catch {
      // Error handled by RTK Query
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelSwap(id).unwrap();
    } catch {
      // Error handled by RTK Query
    }
  };

  // Filter swaps by tab
  const pendingSwaps = swaps.filter(
    (s) => s.status === "PENDING" || s.status === "ACCEPTED",
  );
  const approvedSwaps = swaps.filter((s) => s.status === "MANAGER_APPROVED");
  const historySwaps = swaps.filter((s) =>
    ["REJECTED", "CANCELLED", "EXPIRED"].includes(s.status),
  );

  const tabSwaps =
    tab === "pending"
      ? pendingSwaps
      : tab === "approved"
        ? approvedSwaps
        : historySwaps;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Swaps &amp; Coverage
        </h1>
        <p className="text-sm text-muted-foreground">
          {user.role === "STAFF"
            ? "View and manage your shift swap and drop requests."
            : "Review and approve shift swap and drop requests from staff."}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Needs Action</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats?.needsAction ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.pending ?? 0} pending · {stats?.accepted ?? 0} accepted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.approved ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Rejected / Expired
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {(stats?.rejected ?? 0) + (stats?.expired ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.rejected ?? 0} rejected · {stats?.expired ?? 0} expired
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Request List */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pendingSwaps.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                {pendingSwaps.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading swap requests…
            </div>
          ) : tabSwaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ArrowLeftRight className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">
                {tab === "pending"
                  ? "No pending swap or drop requests."
                  : tab === "approved"
                    ? "No approved requests yet."
                    : "No history to show."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tabSwaps.map((swap) => (
                <SwapRequestCard
                  key={swap.id}
                  swap={swap}
                  userRole={user.role}
                  userId={user.id}
                  onResolve={handleResolve}
                  onRespond={handleRespond}
                  onCancel={handleCancel}
                  isResolving={isResolving}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

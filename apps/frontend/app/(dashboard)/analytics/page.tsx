"use client";

import { useState } from "react";
import {
  useGetAnalyticsQuery,
  type StaffAnalytics,
} from "@/store/api/analyticsApi";
import { useGetLocationsQuery } from "@/store/api/shiftsApi";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Star,
  Users,
  Clock,
  Award,
} from "lucide-react";

function getFairnessColor(score: number) {
  if (score >= 80) return "text-green-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function getDiffColor(diff: number) {
  if (diff > 0) return "text-amber-600";
  if (diff < 0) return "text-blue-600";
  return "text-green-600";
}

function getDiffBg(diff: number) {
  if (diff > 0) return "bg-amber-100 text-amber-800 border-amber-200";
  if (diff < 0) return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-green-100 text-green-800 border-green-200";
}

export default function AnalyticsPage() {
  const [locationId, setLocationId] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: locations = [] } = useGetLocationsQuery();
  const { data, isLoading } = useGetAnalyticsQuery({
    ...(locationId !== "all" && { locationId }),
    ...(fromDate && { from: fromDate }),
    ...(toDate && { to: toDate }),
  });

  const summary = data?.summary;
  const staff = data?.staff ?? [];
  const period = data?.period;

  // Find max hours for bar scaling
  const maxHours = Math.max(
    ...staff.map((s) => Math.max(s.avgWeeklyHours, s.desiredWeeklyHours)),
    1,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Fairness Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor equitable distribution of hours and premium shifts
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Location
            </label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc: any) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
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
              onChange={(e) => setFromDate(e.target.value)}
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
              onChange={(e) => setToDate(e.target.value)}
              className="w-[150px]"
            />
          </div>

          {period && (
            <p className="text-xs text-muted-foreground ml-auto">
              Showing {period.weeks} week{period.weeks !== 1 ? "s" : ""} of data
            </p>
          )}
        </div>
      </Card>

      {/* Summary Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-8 w-12" />
            </Card>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Avg Hours/wk</p>
            </div>
            <p className="text-2xl font-bold">{summary.avgWeeklyHours}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-muted-foreground">Over-Scheduled</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {summary.overScheduledCount}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">Under-Scheduled</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {summary.underScheduledCount}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-xs text-muted-foreground">Balanced</p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {summary.balancedCount}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Fairness Score</p>
            </div>
            <p
              className={`text-2xl font-bold ${getFairnessColor(summary.fairnessScore)}`}
            >
              {summary.fairnessScore}%
            </p>
          </Card>
        </div>
      ) : null}

      {/* Hours Distribution */}
      {!isLoading && staff.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold mb-1">Hours Distribution</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Comparing average weekly assigned hours vs desired hours
          </p>

          <div className="space-y-3">
            {staff.map((s) => (
              <HoursBar key={s.id} staff={s} maxHours={maxHours} />
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 justify-center mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-primary/80 rounded" />
              <span className="text-xs text-muted-foreground">Assigned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-gray-200 rounded" />
              <span className="text-xs text-muted-foreground">Desired</span>
            </div>
          </div>
        </Card>
      )}

      {/* Premium Shifts Distribution */}
      {!isLoading && staff.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold">Premium Shift Distribution</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Friday & Saturday evening shifts — tracked for equitable
            distribution
          </p>

          <div className="space-y-2">
            {staff
              .slice()
              .sort((a, b) => b.premiumShifts - a.premiumShifts)
              .map((s) => {
                const total = s.premiumShifts + s.regularShifts;
                const premiumPct =
                  total > 0 ? (s.premiumShifts / total) * 100 : 0;
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-32 text-sm font-medium truncate">
                      {s.firstName} {s.lastName.charAt(0)}.
                    </div>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden flex">
                      {s.premiumShifts > 0 && (
                        <div
                          className="bg-amber-400 h-full flex items-center justify-center text-[10px] font-semibold text-amber-900"
                          style={{
                            width: `${premiumPct}%`,
                            minWidth: s.premiumShifts > 0 ? "20px" : 0,
                          }}
                        >
                          {s.premiumShifts}
                        </div>
                      )}
                      {s.regularShifts > 0 && (
                        <div
                          className="bg-primary/20 h-full flex items-center justify-center text-[10px] font-semibold text-primary"
                          style={{
                            width: `${100 - premiumPct}%`,
                            minWidth: s.regularShifts > 0 ? "20px" : 0,
                          }}
                        >
                          {s.regularShifts}
                        </div>
                      )}
                    </div>
                    <div className="w-16 text-xs text-muted-foreground text-right">
                      {total} total
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="flex items-center gap-6 justify-center mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-amber-400 rounded" />
              <span className="text-xs text-muted-foreground">Premium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-primary/20 rounded" />
              <span className="text-xs text-muted-foreground">Regular</span>
            </div>
          </div>
        </Card>
      )}

      {/* Detailed Staff Table */}
      {!isLoading && staff.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Staff Details
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium text-right">Assigned</th>
                  <th className="pb-2 font-medium text-right">Desired</th>
                  <th className="pb-2 font-medium text-right">Avg/wk</th>
                  <th className="pb-2 font-medium text-right">Shifts</th>
                  <th className="pb-2 font-medium text-right">Premium</th>
                  <th className="pb-2 font-medium text-right">Diff</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => {
                  const utilization =
                    s.desiredTotal > 0
                      ? Math.round((s.totalHours / s.desiredTotal) * 100)
                      : 0;
                  return (
                    <tr
                      key={s.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                            {s.firstName[0]}
                            {s.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium">
                              {s.firstName} {s.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right">{s.totalHours}h</td>
                      <td className="py-3 text-right">{s.desiredTotal}h</td>
                      <td className="py-3 text-right">{s.avgWeeklyHours}h</td>
                      <td className="py-3 text-right">{s.shiftCount}</td>
                      <td className="py-3 text-right">{s.premiumShifts}</td>
                      <td className="py-3 text-right">
                        <Badge
                          variant="outline"
                          className={getDiffBg(s.difference)}
                        >
                          {s.difference > 0 ? "+" : ""}
                          {s.difference}h
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && staff.length === 0 && (
        <Card className="p-12 text-center text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No data for this period</p>
          <p className="text-sm mt-1">
            Try expanding the date range or selecting a different location
          </p>
        </Card>
      )}
    </div>
  );
}

function HoursBar({
  staff,
  maxHours,
}: {
  staff: StaffAnalytics;
  maxHours: number;
}) {
  const assignedPct = (staff.avgWeeklyHours / maxHours) * 100;
  const desiredPct = (staff.desiredWeeklyHours / maxHours) * 100;

  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-sm font-medium truncate">
        {staff.firstName} {staff.lastName.charAt(0)}.
      </div>
      <div className="flex-1 space-y-1">
        {/* Assigned bar */}
        <div className="h-4 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/80 rounded-full transition-all"
            style={{ width: `${assignedPct}%` }}
          />
        </div>
        {/* Desired bar (thinner) */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-300 rounded-full transition-all"
            style={{ width: `${desiredPct}%` }}
          />
        </div>
      </div>
      <div className="w-24 text-right">
        <span className="text-sm font-medium">{staff.avgWeeklyHours}h</span>
        <span className="text-xs text-muted-foreground">
          /{staff.desiredWeeklyHours}h
        </span>
      </div>
      <Badge
        variant="outline"
        className={`text-[10px] w-14 justify-center ${getDiffBg(staff.difference)}`}
      >
        {staff.difference > 0 ? "+" : ""}
        {staff.difference}h
      </Badge>
    </div>
  );
}

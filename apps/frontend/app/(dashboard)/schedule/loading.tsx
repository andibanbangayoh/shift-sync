import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScheduleLoading() {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-9" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded" />
          ))}
        </div>
        {/* Time slots */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-2 mb-2">
            {Array.from({ length: 7 }).map((_, j) => (
              <Skeleton key={j} className="h-14 rounded" />
            ))}
          </div>
        ))}
      </Card>
    </div>
  );
}

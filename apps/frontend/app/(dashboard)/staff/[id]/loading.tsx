import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StaffDetailLoading() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-8 w-28 mb-3" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card skeleton */}
        <div className="lg:col-span-1">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-8 w-12" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
            <Skeleton className="h-9 w-full mt-2" />
          </Card>
        </div>

        {/* Right column skeletons */}
        <div className="lg:col-span-2 space-y-4">
          {/* Skills skeleton */}
          <Card className="p-5 space-y-3">
            <Skeleton className="h-5 w-14" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-full" />
              ))}
            </div>
          </Card>
          {/* Locations skeleton */}
          <Card className="p-5 space-y-3">
            <Skeleton className="h-5 w-20" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </Card>
          {/* Availability skeleton */}
          <Card className="p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-8 flex-1 rounded" />
              ))}
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

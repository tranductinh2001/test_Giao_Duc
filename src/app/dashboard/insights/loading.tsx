import { StatsSkeleton, CardSkeleton } from "@/components/LoadingStates";

export default function InsightsLoading() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Header Skeleton */}
        <div className="animate-pulse rounded-xl border border-border bg-card p-6 shadow-subtle">
          <div className="flex items-end justify-between">
            <div className="flex-1 space-y-3">
              <div className="h-3 w-32 rounded bg-muted"></div>
              <div className="h-8 w-64 rounded bg-muted"></div>
              <div className="h-4 w-96 rounded bg-muted/70"></div>
            </div>
            <div className="h-10 w-48 rounded-full bg-muted"></div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <StatsSkeleton />

        {/* Charts and Content Skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>

        <CardSkeleton />
      </div>
    </div>
  );
}

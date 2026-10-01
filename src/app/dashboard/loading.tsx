import { StatsSkeleton, CardSkeleton } from "@/components/LoadingStates";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header Skeleton */}
        <div className="animate-pulse rounded-xl border border-border bg-card p-6 shadow-elevated">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 space-y-3">
              <div className="h-3 w-32 rounded bg-muted"></div>
              <div className="h-8 w-48 rounded bg-muted"></div>
              <div className="h-4 w-64 rounded bg-muted/70"></div>
              <div className="flex gap-2">
                <div className="h-6 w-32 rounded-full bg-muted"></div>
                <div className="h-6 w-24 rounded-full bg-muted"></div>
              </div>
            </div>
            <div className="h-24 w-48 rounded-xl bg-muted/50"></div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <StatsSkeleton />

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="space-y-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

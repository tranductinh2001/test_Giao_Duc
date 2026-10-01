import { StatsSkeleton, CardSkeleton } from "@/components/LoadingStates";

export default function ExamsLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-8">
        {/* Header Skeleton */}
        <div className="animate-pulse rounded-xl border border-border bg-card p-6 shadow-subtle sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 space-y-3">
              <div className="h-3 w-32 rounded bg-muted"></div>
              <div className="h-8 w-64 rounded bg-muted"></div>
              <div className="h-4 w-96 rounded bg-muted/70"></div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-40 rounded-full bg-muted"></div>
              <div className="h-10 w-32 rounded-full bg-muted"></div>
            </div>
          </div>

          {/* Quick Stats Skeleton */}
          <div className="mt-6">
            <StatsSkeleton />
          </div>
        </div>

        {/* Exam List Skeleton */}
        <div>
          <div className="mb-4 h-4 w-32 rounded bg-muted"></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <CardSkeleton key={idx} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

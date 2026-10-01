import React from "react";

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-border border-t-primary`}
    ></div>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-muted-foreground">Đang tải...</p>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-6 shadow-subtle">
      <div className="h-4 w-3/4 rounded bg-muted"></div>
      <div className="mt-3 h-3 w-1/2 rounded bg-muted/70"></div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-muted/50"></div>
        <div className="h-3 w-5/6 rounded bg-muted/50"></div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="animate-pulse rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-muted"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-muted"></div>
              <div className="h-2 w-1/2 rounded bg-muted/70"></div>
            </div>
            <div className="h-8 w-20 rounded bg-muted"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="animate-pulse rounded-xl border border-border bg-card p-4 shadow-subtle"
        >
          <div className="h-3 w-1/2 rounded bg-muted"></div>
          <div className="mt-2 h-6 w-1/3 rounded bg-muted"></div>
        </div>
      ))}
    </div>
  );
}

export function ButtonLoader({ text = "Đang xử lý..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Spinner size="sm" />
      <span>{text}</span>
    </div>
  );
}

export function QuestionSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-subtle">
        <div className="h-4 w-1/4 rounded bg-muted"></div>
        <div className="mt-4 h-5 w-full rounded bg-muted"></div>
        <div className="mt-2 h-5 w-3/4 rounded bg-muted"></div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-12 rounded-xl border border-border bg-muted/30"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      ></div>
    </div>
  );
}

export function PulseLoader() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:0ms]"></div>
      <div className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:150ms]"></div>
      <div className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:300ms]"></div>
    </div>
  );
}

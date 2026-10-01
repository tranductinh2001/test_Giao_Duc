import React from "react";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function LoadingSkeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
  count = 1,
}: LoadingSkeletonProps) {
  const baseStyles = "animate-pulse bg-muted";

  const variantStyles = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
    card: "rounded-xl h-48",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  if (count === 1) {
    return (
      <div
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        style={style}
      />
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${baseStyles} ${variantStyles[variant]} ${className}`}
          style={style}
        />
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-subtle">
      <div className="flex items-start justify-between mb-4">
        <LoadingSkeleton variant="circular" width={48} height={48} />
        <LoadingSkeleton variant="text" width={60} height={24} />
      </div>
      <LoadingSkeleton variant="text" width="100%" height={16} className="mb-2" />
      <LoadingSkeleton variant="text" width="70%" height={14} />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <LoadingSkeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton variant="text" width="80%" height={16} />
            <LoadingSkeleton variant="text" width="60%" height={14} />
          </div>
          <LoadingSkeleton variant="rectangular" width={80} height={32} />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-start gap-4">
            <LoadingSkeleton variant="rectangular" width={64} height={64} />
            <div className="flex-1 space-y-2">
              <LoadingSkeleton variant="text" width="90%" height={18} />
              <LoadingSkeleton variant="text" width="70%" height={14} />
              <LoadingSkeleton variant="text" width="50%" height={14} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;

import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "outline" | "muted" | "gold";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-[var(--primary-soft)] text-[var(--primary)] border-transparent",
    primary: "bg-[var(--primary-soft)] text-[var(--primary)] border-transparent",
    secondary: "bg-[var(--secondary-soft)] text-[var(--secondary)] border-transparent",
    success: "bg-[var(--success-soft)] text-[var(--success)] border-transparent",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-transparent",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-transparent",
    info: "bg-[var(--info-soft)] text-[var(--info)] border-transparent",
    outline: "border border-[var(--border)] text-[var(--foreground)] bg-transparent",
    muted: "bg-[var(--kraft)] text-[var(--muted)] border-transparent",
    gold: "bg-[var(--warning-soft)] text-[var(--warning)] border-transparent",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-5.5 px-2 text-xs font-semibold rounded-full transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };

"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  // Pass props to first child element only
  const firstChild = React.isValidElement(children) ? children : null;

  if (firstChild) {
    return React.cloneElement(firstChild as React.ReactElement<any>, {
      open,
      onClose: onOpenChange,
    });
  }

  return <>{children}</>;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onClose?: () => void;
}

export function DialogContent({ open = false, className, children, onClose, ...props }: DialogContentProps) {
  const prevOpenRef = useRef(open);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose?.();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      document.body.style.overflow = "hidden";
    } else if (!open && prevOpenRef.current) {
      document.body.style.overflow = "";
    }
    prevOpenRef.current = open;
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
        onClick={() => onClose?.()}
      />
      {/* Content */}
      <div
        className={cn(
          "relative z-50 w-full max-w-lg rounded-[var(--radius-md)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lift)] overflow-visible border border-[var(--border)]",
          "animate-in fade-in-0 zoom-in-95",
          className
        )}
        role="dialog"
        aria-modal="true"
        {...props}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-[var(--radius-sm)] p-1.5 hover:bg-[var(--kraft)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold text-[var(--foreground)]", className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-[var(--muted)]", className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-6 flex justify-end gap-3", className)}
      {...props}
    />
  );
}

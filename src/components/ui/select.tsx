"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

interface SelectContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string;
  setValue: (value: string) => void;
  triggerPosition: { top: number; left: number; width: number };
  setTriggerPosition: (pos: { top: number; left: number; width: number }) => void;
  disabled: boolean;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within a Select");
  }
  return context;
}

// Root Select component
interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({ value = "", onValueChange, children, className, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [triggerPosition, setTriggerPosition] = useState({ top: 0, left: 0, width: 0 });

  return (
    <SelectContext.Provider value={{ open, setOpen, value, setValue: onValueChange || (() => {}), triggerPosition, setTriggerPosition, disabled }}>
      <div className={cn("relative overflow-visible", className)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

// Trigger button
interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, disabled: disabledProp, ...props }, ref) => {
    const { open, setOpen, value, setTriggerPosition, disabled: contextDisabled } = useSelectContext();
    const isDisabled = disabledProp || contextDisabled;
    const triggerRef = useRef<HTMLButtonElement>(null);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return;
      e.preventDefault();
      e.stopPropagation();

      // Get trigger position for dropdown positioning
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setTriggerPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
      setOpen(!open);
    };

    // Update position on scroll/resize when open
    useEffect(() => {
      if (open && triggerRef.current) {
        const updatePosition = () => {
          const rect = triggerRef.current!.getBoundingClientRect();
          setTriggerPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
          });
        };
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
          window.removeEventListener('scroll', updatePosition, true);
          window.removeEventListener('resize', updatePosition);
        };
      }
    }, [open, setTriggerPosition]);

    // Use forwarded ref or internal ref
    const handleRef = (el: HTMLButtonElement | null) => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(el);
        } else {
          ref.current = el;
        }
      }
      triggerRef.current = el;
    };

    return (
      <button
        ref={handleRef}
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm",
          "placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "min-h-[44px]",
          className
        )}
        aria-expanded={open}
        aria-disabled={isDisabled}
        {...props}
      >
        <span className={value ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>
          {children || (value || "Chọn...")}
        </span>
        <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", open && "rotate-180")} />
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

const SelectValue: React.FC<React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }> = ({
  placeholder,
  className,
  children,
  ...props
}) => {
  const { value } = useSelectContext();

  return (
    <span className={cn(!value && "text-[var(--muted)]", className)} {...props}>
      {children || (value ? value : placeholder)}
    </span>
  );
};

// Dropdown content
interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen, value, setValue, triggerPosition } = useSelectContext();
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      };

      if (open) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [open, setOpen]);

    if (!open) {
      return null;
    }

    const dropdown = (
      <div
        ref={contentRef}
        className={cn(
          "fixed z-[100] mt-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lift)]",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          "pointer-events-auto",
          className
        )}
        style={{
          top: triggerPosition.top,
          left: triggerPosition.left,
          width: triggerPosition.width,
        }}
        {...props}
      >
        <div className="max-h-60 overflow-y-auto p-1">{children}</div>
      </div>
    );

    // Use portal to render outside Dialog
    if (typeof document !== 'undefined') {
      return createPortal(dropdown, document.body);
    }

    return dropdown;
  }
);
SelectContent.displayName = "SelectContent";

// Select item
interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value: itemValue, ...props }, ref) => {
    const { value, setValue, setOpen, disabled } = useSelectContext();
    const isSelected = value === itemValue;

    const handleSelect = () => {
      if (disabled) return;
      setValue(itemValue);
      setOpen(false);
    };

    return (
      <div
        ref={ref}
        onClick={handleSelect}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-[var(--radius-sm)] py-2.5 px-3 text-sm",
          "hover:bg-[var(--kraft)] focus:bg-[var(--kraft)]",
          "outline-none",
          "min-h-[44px]",
          isSelected && "bg-[var(--primary-soft)] text-[var(--primary)]",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        <span className="flex-1">{children}</span>
        {isSelected && <Check className="h-4 w-4 text-[var(--primary)]" />}
      </div>
    );
  }
);
SelectItem.displayName = "SelectItem";

// Group
const SelectGroup: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return <div className={cn("p-1", className)} {...props}>{children}</div>;
};

// Label
const SelectLabel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn("px-2 py-1.5 text-xs font-semibold text-[var(--muted)]", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
};

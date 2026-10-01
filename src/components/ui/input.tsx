import React, { useState } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: "default" | "floating";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      variant = "default",
      className = "",
      type = "text",
      id,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      props.onChange?.(e);
    };

    if (variant === "floating") {
      return (
        <div className={`relative ${className}`}>
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={`peer w-full rounded-[var(--radius-sm)] border bg-[var(--surface)] px-4 pt-6 pb-2 text-sm text-[var(--foreground)] outline-none transition-colors duration-200 touch-action-manipulation ${
              error
                ? "border-[var(--danger)] focus-visible:border-[var(--danger)] focus-visible:ring-2 focus-visible:ring-[var(--danger)]/20"
                : "border-[var(--border)] focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20"
            } ${leftIcon ? "pl-11" : ""} ${rightIcon ? "pr-11" : ""}`}
            placeholder=" "
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={handleChange}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            {...props}
          />
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true">
              {leftIcon}
            </div>
          )}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true">
              {rightIcon}
            </div>
          )}
          <label
            htmlFor={inputId}
            className={`absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] transition-all duration-200 pointer-events-none ${
              isFocused || hasValue
                ? "text-xs top-3 translate-y-0 text-[var(--primary)]"
                : "text-sm"
            } ${leftIcon && !(isFocused || hasValue) ? "left-11" : "left-4"}`}
          >
            {label}
          </label>
          {error && <p className="mt-1.5 text-xs text-[var(--danger)] font-medium">{error}</p>}
          {!error && helperText && (
            <p className="mt-1.5 text-xs text-[var(--muted)]">{helperText}</p>
          )}
        </div>
      );
    }

    return (
      <div className={className}>
        {label && (
          <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={`w-full rounded-[var(--radius-sm)] border bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors duration-200 placeholder:text-[var(--muted)] touch-action-manipulation ${
              error
                ? "border-[var(--danger)] focus-visible:border-[var(--danger)] focus-visible:ring-2 focus-visible:ring-[var(--danger)]/20"
                : "border-[var(--border)] focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20"
            } ${leftIcon ? "pl-11" : ""} ${rightIcon ? "pr-11" : ""}`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-[var(--danger)] font-medium">{error}</p>}
        {!error && helperText && (
          <p className="mt-1.5 text-xs text-[var(--muted)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary)] text-[var(--foreground-inverted)] hover:bg-[var(--primary-hover)] focus-visible:ring-[var(--primary)]",
        primary: "bg-[var(--primary)] text-[var(--foreground-inverted)] hover:bg-[var(--primary-hover)] focus-visible:ring-[var(--primary)]",
        secondary: "bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] shadow-[var(--shadow-paper)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]",
        outline: "border border-[var(--border)] bg-transparent hover:bg-[var(--kraft)] hover:text-[var(--foreground)] focus-visible:ring-[var(--primary)]",
        ghost: "text-[var(--muted)] hover:bg-[var(--kraft)] hover:text-[var(--foreground)]",
        destructive: "bg-[var(--danger)] text-[var(--foreground-inverted)] hover:bg-[var(--danger)]/90 focus-visible:ring-[var(--danger)]",
        danger: "bg-[var(--danger)] text-[var(--foreground-inverted)] hover:bg-[var(--danger)]/90 focus-visible:ring-[var(--danger)]",
        success: "bg-[var(--success)] text-[var(--foreground-inverted)] hover:bg-[var(--success)]/90 focus-visible:ring-[var(--primary)]",
        link: "text-[var(--primary)] underline-offset-4 hover:underline",
        forest: "bg-[var(--primary)] text-[var(--foreground-inverted)] hover:bg-[var(--primary-hover)]",
        indigo: "bg-[var(--secondary)] text-[var(--foreground-inverted)] hover:bg-[var(--secondary-hover)]",
        warning: "bg-[var(--warning)] text-[var(--foreground)] hover:bg-[var(--warning)]/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 py-2",
        lg: "h-11 px-8",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Đang tải...</span>
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
export default Button

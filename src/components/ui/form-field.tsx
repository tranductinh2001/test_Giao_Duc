import React from "react";
import { AlertCircle } from "lucide-react";

interface FieldErrorProps {
  errors?: string[];
  className?: string;
}

export function FieldError({ errors, className = "" }: FieldErrorProps) {
  if (!errors || errors.length === 0) return null;

  return (
    <div className={`mt-2 space-y-1 ${className}`}>
      {errors.map((error, idx) => (
        <p key={idx} className="text-sm text-destructive flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          {error}
        </p>
      ))}
    </div>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string[];
  helpText?: string;
}

export function FormInput({ label, error, helpText, className = "", ...props }: FormInputProps) {
  const hasError = error && error.length > 0;

  const inputClassName = `w-full h-12 px-4 text-base rounded-xl border ${
    hasError
      ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
      : 'border-border hover:border-primary/50 focus:border-primary focus:ring-primary/20'
  } bg-background text-foreground transition-all duration-200 focus:ring-2 focus:outline-none placeholder:text-muted-foreground ${className}`;

  return (
    <div>
      <label className="mb-2.5 block text-sm font-semibold text-foreground">
        {label}
      </label>
      <input {...props} className={inputClassName} />
      <FieldError errors={error} />
      {!hasError && helpText && (
        <p className="mt-2 text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string[];
  helpText?: string;
}

export function FormTextarea({ label, error, helpText, className = "", ...props }: FormTextareaProps) {
  const hasError = error && error.length > 0;

  const textareaClassName = `w-full min-h-32 px-4 py-3 text-base rounded-xl border ${
    hasError
      ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
      : 'border-border hover:border-primary/50 focus:border-primary focus:ring-primary/20'
  } bg-background text-foreground transition-all duration-200 focus:ring-2 focus:outline-none placeholder:text-muted-foreground resize-y ${className}`;

  return (
    <div>
      <label className="mb-2.5 block text-sm font-semibold text-foreground">
        {label}
      </label>
      <textarea {...props} className={textareaClassName} />
      <FieldError errors={error} />
      {!hasError && helpText && (
        <p className="mt-2 text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

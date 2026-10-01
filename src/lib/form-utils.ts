/**
 * Form validation utilities for better UX
 */

export interface ValidationError {
  message: string;
  details?: Record<string, string[]>;
}

/**
 * Parse API error response and return user-friendly messages
 */
export function parseValidationError(response: any): ValidationError {
  if (response.details) {
    // Has field-level errors
    return {
      message: "Vui lòng kiểm tra lại thông tin bên dưới.",
      details: response.details,
    };
  }

  // Generic error message
  return {
    message: response.message || "Có lỗi xảy ra. Vui lòng thử lại.",
  };
}

/**
 * Get first error message for a field
 */
export function getFieldError(
  fieldErrors: Record<string, string[]> | undefined,
  fieldName: string
): string | null {
  if (!fieldErrors || !fieldErrors[fieldName]) return null;
  return fieldErrors[fieldName][0];
}

/**
 * Check if a field has errors
 */
export function hasFieldError(
  fieldErrors: Record<string, string[]> | undefined,
  fieldName: string
): boolean {
  return !!(fieldErrors && fieldErrors[fieldName] && fieldErrors[fieldName].length > 0);
}

/**
 * Get input className with error state
 */
export function getInputClassName(
  baseClassName: string,
  hasError: boolean
): string {
  if (hasError) {
    return `${baseClassName} border-destructive focus:border-destructive focus:ring-destructive/20`;
  }
  return `${baseClassName} border-border hover:border-primary/50 focus:border-primary focus:ring-primary/20`;
}

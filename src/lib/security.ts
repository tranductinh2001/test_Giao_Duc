import { NextRequest } from "next/server";
import { getActiveModels, getModelById } from "@/lib/ai-models";

export function getClientInfo(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ipAddress = forwarded?.split(",")[0] || realIp || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  return { ipAddress, userAgent };
}

/**
 * Validate request body against expected schema
 */
export function validateRequestBody<T>(
  body: any,
  requiredFields: (keyof T)[],
  optionalFields?: (keyof T)[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      errors.push(`Thiếu trường bắt buộc: ${String(field)}`);
    }
  }

  // Check for unexpected fields
  const allowedFields = [...requiredFields, ...(optionalFields || [])];
  const bodyFields = Object.keys(body);

  for (const field of bodyFields) {
    if (!allowedFields.includes(field as keyof T)) {
      errors.push(`Trường không hợp lệ: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize string input to prevent XSS and injection
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove HTML tags
    .substring(0, 10000); // Limit length
}

/**
 * Validate and sanitize model name - uses single source of truth from ai-models.ts
 */
export function validateModelName(model: string): { valid: boolean; error?: string } {
  // Use single source of truth from ai-models.ts
  const allowedModels = getActiveModels().map(m => m.id);

  if (!allowedModels.includes(model)) {
    return {
      valid: false,
      error: `Model không hợp lệ. Chỉ cho phép: ${allowedModels.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Check for suspicious patterns that might indicate attack attempts
 */
export function detectSuspiciousPatterns(input: string): { suspicious: boolean; reason?: string } {
  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(union.*select)/i,
    /(;|\-\-|\/\*|\*\/)/,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      return { suspicious: true, reason: "Phát hiện mẫu SQL injection" };
    }
  }

  // Check for path traversal
  if (input.includes("../") || input.includes("..\\")) {
    return { suspicious: true, reason: "Phát hiện path traversal" };
  }

  // Check for script injection
  const scriptPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
  ];

  for (const pattern of scriptPatterns) {
    if (pattern.test(input)) {
      return { suspicious: true, reason: "Phát hiện script injection" };
    }
  }

  return { suspicious: false };
}

/**
 * Validate file upload
 * Note: Use @/lib/file-validator for unified file validation with type-based limits
 * This function is kept for backward compatibility but delegates to the shared validator
 */
import { validateFile as validateFileUploadShared, getMaxFileSizeMB, getFileCategory } from "@/lib/file-validator";

export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  // Use shared validator with type-based limits
  const result = validateFileUploadShared({
    name: file.name,
    size: file.size,
    type: file.type,
  });

  if (!result.valid) {
    return { valid: false, error: result.error };
  }

  return { valid: true };
}

/**
 * Get client IP address from request
 */
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIP = req.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP.trim();
  }

  return "unknown";
}

/**
 * Log security event
 */
export async function logSecurityEvent(params: {
  userId?: string;
  event: string;
  details: any;
  ipAddress: string;
  userAgent?: string;
  severity: "low" | "medium" | "high" | "critical";
}) {
  // In production, send to logging service (Sentry, LogRocket, etc.)
  console.warn(`[SECURITY] ${params.severity.toUpperCase()}: ${params.event}`, {
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: params.details,
    timestamp: new Date().toISOString(),
  });

  // Could also save to database AuditLog table
  // await prisma.auditLog.create({ ... })
}

/**
 * Check if request is from suspicious IP
 */
export function isKnownMaliciousIP(ip: string): boolean {
  // In production, check against threat intelligence feeds
  // For now, just a placeholder
  const blacklist: string[] = [
    // Add known malicious IPs here
  ];

  return blacklist.includes(ip);
}

export function isRateLimited(attempts: number, windowMinutes: number = 15): boolean {
  const maxAttempts = 5;
  return attempts >= maxAttempts;
}

export function calculateLockoutDuration(attemptCount: number): number {
  // Exponential backoff: 1min, 5min, 15min, 1hr
  if (attemptCount <= 5) return 1 * 60 * 1000; // 1 min
  if (attemptCount <= 10) return 5 * 60 * 1000; // 5 min
  if (attemptCount <= 15) return 15 * 60 * 1000; // 15 min
  return 60 * 60 * 1000; // 1 hour
}

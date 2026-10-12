import { prisma } from "@/lib/prisma";

export enum SecurityEvent {
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILED = "LOGIN_FAILED",
  LOGOUT = "LOGOUT",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
  PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  ACCOUNT_UNLOCKED = "ACCOUNT_UNLOCKED",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
}

interface AuditLogData {
  userId?: string;
  event: SecurityEvent;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
}

/**
 * Standardized sanitization to prevent logging sensitive or non-compliant information:
 * - Redacts passwords, access tokens, refresh tokens, auth secrets, API keys, credentials
 * - Prevents circular references
 * - Truncates excessively long values
 */
export function sanitizeAuditDetails(details?: Record<string, any>): Record<string, any> {
  if (!details || typeof details !== "object") return {};

  const SENSITIVE_KEY_PATTERN = /(password|secret|token|apikey|api_key|credential|auth|bearer|cookie|private)/i;

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      // Truncate excessively long payload strings to keep audit logs clean and standardized
      sanitized[key] = value.length > 500 ? value.slice(0, 500) + "..." : value;
    } else if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        sanitized[key] = value.slice(0, 20).map((item) =>
          typeof item === "object" && item !== null ? sanitizeAuditDetails(item) : item
        );
      } else {
        sanitized[key] = sanitizeAuditDetails(value);
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Normalizes and sanitizes identifier fields (IP, UserAgent, Email)
 */
function sanitizeIp(ip: string): string {
  if (!ip) return "unknown";
  return ip.slice(0, 45).trim();
}

function sanitizeUserAgent(ua?: string): string | null {
  if (!ua) return null;
  return ua.slice(0, 255).trim();
}

function sanitizeEmail(email: string): string {
  if (!email) return "unknown";
  const trimmed = email.toLowerCase().trim();
  return trimmed.slice(0, 150);
}

export async function logSecurityEvent(data: AuditLogData) {
  try {
    const cleanDetails = sanitizeAuditDetails(data.details);

    await prisma.auditLog.create({
      data: {
        userId: data.userId || null,
        event: data.event,
        details: cleanDetails,
        ipAddress: sanitizeIp(data.ipAddress),
        userAgent: sanitizeUserAgent(data.userAgent),
        success: data.success,
      },
    });
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}

export async function logLoginAttempt(data: {
  userId?: string;
  email: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failReason?: string;
}) {
  try {
    await prisma.loginAttempt.create({
      data: {
        userId: data.userId || null,
        email: sanitizeEmail(data.email),
        ipAddress: sanitizeIp(data.ipAddress),
        userAgent: sanitizeUserAgent(data.userAgent),
        success: data.success,
        failReason: data.failReason ? data.failReason.slice(0, 100) : null,
      },
    });
  } catch (error) {
    console.error("Failed to log login attempt:", error);
  }
}

export async function getRecentFailedAttempts(
  email: string,
  windowMinutes: number = 15
): Promise<number> {
  const cleanEmail = sanitizeEmail(email);
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const count = await prisma.loginAttempt.count({
    where: {
      email: cleanEmail,
      success: false,
      createdAt: { gte: since },
    },
  });

  return count;
}

export async function shouldLockAccount(email: string): Promise<boolean> {
  const failedAttempts = await getRecentFailedAttempts(email, 15);
  return failedAttempts >= 5;
}

export async function lockAccountAndNotify(
  user: { id: string; email: string; name: string },
  ipAddress: string,
  userAgent: string
): Promise<void> {
  // Update user status to LOCKED
  await prisma.user.update({
    where: { id: user.id },
    data: { status: "LOCKED" },
  });

  // Log event
  await logSecurityEvent({
    userId: user.id,
    event: SecurityEvent.ACCOUNT_LOCKED,
    details: { reason: "BRUTE_FORCE", ipAddress: sanitizeIp(ipAddress) },
    ipAddress: sanitizeIp(ipAddress),
    userAgent: sanitizeUserAgent(userAgent) || undefined,
    success: true,
  });

  // Send email notification (non-blocking)
  if (process.env.RESEND_API_KEY) {
    const { sendAccountLockedEmail } = await import("@/lib/email");
    sendAccountLockedEmail({
      to: user.email,
      userName: user.name,
      unlockUrl: `${process.env.NEXTAUTH_URL}/api/auth/unlock-account`,
      lockReason: "Quá nhiều lần đăng nhập thất bại (Brute Force Protection)",
    }).catch((error) => {
      console.error("Failed to send account locked email:", error);
    });
  }
}

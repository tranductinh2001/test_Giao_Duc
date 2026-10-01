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

export async function logSecurityEvent(data: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId || null,
        event: data.event,
        details: data.details || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent || null,
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
        email: data.email,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent || null,
        success: data.success,
        failReason: data.failReason || null,
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
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const count = await prisma.loginAttempt.count({
    where: {
      email,
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
    details: { reason: "BRUTE_FORCE", ipAddress },
    ipAddress,
    userAgent,
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

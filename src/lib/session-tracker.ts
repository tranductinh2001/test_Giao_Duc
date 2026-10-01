import { prisma } from "@/lib/prisma";

export interface ActiveSession {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  lastActivity: Date;
  createdAt: Date;
}

export async function trackSession(
  userId: string,
  ipAddress: string,
  userAgent: string,
  tokenHash: string
): Promise<void> {
  // Store session info in audit log for now
  // TODO: Create dedicated ActiveSession table in Phase 2.5
  await prisma.auditLog.create({
    data: {
      userId,
      event: "SESSION_CREATED",
      details: { tokenHash, userAgent },
      ipAddress,
      userAgent,
      success: true,
    },
  });
}

export async function getActiveSessions(userId: string): Promise<any[]> {
  // Get recent login successes
  const recentLogins = await prisma.auditLog.findMany({
    where: {
      userId,
      event: "LOGIN_SUCCESS",
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return recentLogins.map((log) => ({
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    lastActivity: log.createdAt,
    details: log.details,
  }));
}

export async function detectSuspiciousActivity(
  userId: string,
  newIpAddress: string
): Promise<boolean> {
  // Get recent sessions
  const recentSessions = await prisma.auditLog.findMany({
    where: {
      userId,
      event: "LOGIN_SUCCESS",
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (recentSessions.length === 0) return false;

  // Check if new IP is from different subnet
  const lastIp = recentSessions[0].ipAddress;
  const lastIpParts = lastIp.split(".");
  const newIpParts = newIpAddress.split(".");

  // Different /24 subnet
  if (
    lastIpParts[0] !== newIpParts[0] ||
    lastIpParts[1] !== newIpParts[1] ||
    lastIpParts[2] !== newIpParts[2]
  ) {
    return true; // Suspicious - different location
  }

  // Check for simultaneous sessions from different IPs (within 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentIps = recentSessions
    .filter((s) => s.createdAt > fiveMinutesAgo)
    .map((s) => s.ipAddress);

  const uniqueIps = new Set(recentIps);
  if (uniqueIps.size > 1) {
    return true; // Suspicious - concurrent sessions
  }

  return false;
}

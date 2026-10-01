import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { authConfig } from "./auth.config";
import {
  logLoginAttempt,
  logSecurityEvent,
  SecurityEvent,
  shouldLockAccount,
} from "@/lib/audit";
import { calculateLockoutDuration } from "@/lib/security";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder-client-secret",
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
        ipAddress: { label: "IP", type: "text" },
        userAgent: { label: "UA", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const ipAddress = (credentials.ipAddress as string) || "unknown";
        const userAgent = (credentials.userAgent as string) || "unknown";

        const user = await prisma.user.findUnique({
          where: { email },
        });

        // Log failed attempt - user not found
        if (!user || !user.password) {
          await logLoginAttempt({
            email,
            ipAddress,
            userAgent,
            success: false,
            failReason: "USER_NOT_FOUND",
          });
          return null;
        }

        // Check if account is locked
        if (user.status === "LOCKED") {
          await logLoginAttempt({
            userId: user.id,
            email,
            ipAddress,
            userAgent,
            success: false,
            failReason: "ACCOUNT_LOCKED",
          });
          throw new Error("ACCOUNT_LOCKED");
        }

        // Check if should be locked due to brute force
        const shouldLock = await shouldLockAccount(email);
        if (shouldLock) {
          await prisma.user.update({
            where: { id: user.id },
            data: { status: "LOCKED" },
          });

          await logSecurityEvent({
            userId: user.id,
            event: SecurityEvent.ACCOUNT_LOCKED,
            details: { reason: "BRUTE_FORCE", ipAddress },
            ipAddress,
            userAgent,
            success: true,
          });

          throw new Error("ACCOUNT_LOCKED");
        }

        // Verify password
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          await logLoginAttempt({
            userId: user.id,
            email,
            ipAddress,
            userAgent,
            success: false,
            failReason: "INVALID_PASSWORD",
          });
          return null;
        }

        // Success - log it
        await logLoginAttempt({
          userId: user.id,
          email,
          ipAddress,
          userAgent,
          success: true,
        });

        await logSecurityEvent({
          userId: user.id,
          event: SecurityEvent.LOGIN_SUCCESS,
          details: { ipAddress, userAgent },
          ipAddress,
          userAgent,
          success: true,
        });

        // Check for suspicious activity
        const { detectSuspiciousActivity } = await import("@/lib/session-tracker");
        const isSuspicious = await detectSuspiciousActivity(user.id, ipAddress);
        if (isSuspicious) {
          await logSecurityEvent({
            userId: user.id,
            event: SecurityEvent.SUSPICIOUS_ACTIVITY,
            details: {
              reason: "LOGIN_FROM_NEW_LOCATION",
              ipAddress,
              userAgent,
            },
            ipAddress,
            userAgent,
            success: true,
          });
          // TODO: Send email alert
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          licenseExpiresAt: user.licenseExpiresAt,
        };
      },
    }),
  ],
});

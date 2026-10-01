import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";
import { getClientInfo } from "@/lib/security";
import { checkRateLimit, passwordResetRateLimit } from "@/lib/ratelimit";
import { logSecurityEvent, SecurityEvent } from "@/lib/audit";

// Force Node.js runtime (not Edge) because we use crypto and Prisma
export const runtime = "nodejs";

const requestSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

export async function POST(req: NextRequest) {
  try {
    const { ipAddress, userAgent } = getClientInfo(req);
    const body = await req.json();
    const { email } = requestSchema.parse(body);

    // Rate limiting by email
    const { success, reset } = await checkRateLimit(passwordResetRateLimit, email);
    if (!success) {
      await logSecurityEvent({
        event: SecurityEvent.RATE_LIMIT_EXCEEDED,
        details: { operation: "password_reset", email, ipAddress },
        ipAddress,
        userAgent,
        success: false,
      });

      return NextResponse.json(
        {
          success: false,
          message: `Quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau ${Math.ceil((reset - Date.now()) / 1000 / 60)} phút.`,
        },
        { status: 429 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    // Security: Always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.",
      });
    }

    // Generate secure random token (32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expires: expiresAt,
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`;

    // Send email with Resend (production)
    if (process.env.RESEND_API_KEY) {
      const { sendPasswordResetEmail } = await import("@/lib/email");
      const emailResult = await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetUrl,
        expiresAt,
      });

      if (!emailResult.success) {
        console.error("Failed to send password reset email:", emailResult.error);
        // Continue anyway - don't block user, log for monitoring
      }
    } else {
      // Development fallback - log to console
      console.log("==============================================");
      console.log("PASSWORD RESET REQUEST (DEV MODE)");
      console.log(`User: ${user.name} (${user.email})`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log(`Token expires at: ${expiresAt.toLocaleString("vi-VN")}`);
      console.log("==============================================");
    }

    return NextResponse.json({
      success: true,
      message: "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientInfo } from "@/lib/security";
import { logSecurityEvent, SecurityEvent } from "@/lib/audit";

// Force Node.js runtime (not Edge) because we use Prisma
export const runtime = "nodejs";

const LOCKOUT_EMAIL_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const { ipAddress, userAgent } = getClientInfo(req);

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email không hợp lệ" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Security: Don't reveal if account exists
      return NextResponse.json({
        success: true,
        message: "Nếu tài khoản tồn tại, chúng tôi đã gửi hướng dẫn mở khóa.",
      });
    }

    if (user.status !== "LOCKED") {
      return NextResponse.json({
        success: false,
        message: "Tài khoản không bị khóa.",
      });
    }

    // Check cooldown (prevent spam)
    const recentUnlockRequest = await prisma.auditLog.findFirst({
      where: {
        userId: user.id,
        event: SecurityEvent.ACCOUNT_UNLOCKED,
        createdAt: { gte: new Date(Date.now() - LOCKOUT_EMAIL_COOLDOWN) },
      },
    });

    if (recentUnlockRequest) {
      return NextResponse.json({
        success: true,
        message: "Nếu tài khoản tồn tại, chúng tôi đã gửi hướng dẫn mở khóa.",
      });
    }

    // Unlock account
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "ACTIVE" },
    });

    // Clear failed login attempts
    await prisma.loginAttempt.deleteMany({
      where: {
        email,
        success: false,
      },
    });

    // Log event
    await logSecurityEvent({
      userId: user.id,
      event: SecurityEvent.ACCOUNT_UNLOCKED,
      details: { reason: "MANUAL_REQUEST", ipAddress },
      ipAddress,
      userAgent,
      success: true,
    });

    // TODO: Send email notification

    return NextResponse.json({
      success: true,
      message: "Tài khoản đã được mở khóa thành công.",
    });
  } catch (error) {
    console.error("Unlock account error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

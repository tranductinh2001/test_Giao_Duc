import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/licenses/check - Check current user's license status
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        licenseExpiresAt: true,
        activatedLicenses: {
          where: { status: "ACTIVATED" },
          orderBy: { activatedAt: "desc" },
          take: 1,
          select: {
            code: true,
            durationDays: true,
            activatedAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy user" },
        { status: 404 }
      );
    }

    const now = new Date();
    const hasLicense = !!user.licenseExpiresAt;
    const expiresAt = user.licenseExpiresAt;
    const isExpired = hasLicense
      ? new Date(expiresAt!) < now
      : false;

    let daysRemaining = 0;
    if (hasLicense && !isExpired) {
      const diffTime = new Date(expiresAt!).getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      success: true,
      data: {
        hasLicense,
        expiresAt,
        isExpired,
        daysRemaining,
        isActive: hasLicense && !isExpired,
        activeLicense: user.activatedLicenses[0] || null,
      },
    });
  } catch (error) {
    console.error("Error checking license:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi kiểm tra license" },
      { status: 500 }
    );
  }
}

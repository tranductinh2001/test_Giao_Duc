import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/licenses/activate - Activate license with code
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập mã license" },
        { status: 400 }
      );
    }

    // Find license
    const license = await prisma.license.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!license) {
      return NextResponse.json(
        { success: false, message: "Mã license không tồn tại" },
        { status: 404 }
      );
    }

    // Check if already used
    if (license.status !== "UNUSED") {
      return NextResponse.json(
        {
          success: false,
          message:
            license.status === "ACTIVATED"
              ? "Mã license đã được sử dụng"
              : license.status === "EXPIRED"
              ? "Mã license đã hết hạn"
              : "Mã license đã bị thu hồi",
        },
        { status: 400 }
      );
    }

    // Check if user already has active license
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { licenseExpiresAt: true },
    });

    if (user?.licenseExpiresAt && new Date(user.licenseExpiresAt) > new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: `Bạn đã có license đang hoạt động đến ${new Date(
            user.licenseExpiresAt
          ).toLocaleDateString("vi-VN")}`,
        },
        { status: 400 }
      );
    }

    // Calculate expiry date
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + license.durationDays);

    // Activate license
    await prisma.$transaction([
      // Update license
      prisma.license.update({
        where: { id: license.id },
        data: {
          status: "ACTIVATED",
          activatedAt: now,
          activatedByUserId: session.user.id,
        },
      }),
      // Update user
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          licenseExpiresAt: expiresAt,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Kích hoạt license thành công!",
      data: {
        expiresAt,
        durationDays: license.durationDays,
      },
    });
  } catch (error) {
    console.error("Error activating license:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi kích hoạt license" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        licenseExpiresAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        data: {
          id: session.user.id,
          name: session.user.name || "Người dùng",
          email: session.user.email || "user@example.com",
          role: session.user.role || "LEARNER",
          status: "ACTIVE",
          licenseExpiresAt: null,
          createdAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    const session = await auth().catch(() => null);
    if (session?.user) {
      return NextResponse.json({
        success: true,
        data: {
          id: session.user.id,
          name: session.user.name || "Người dùng",
          email: session.user.email || "user@example.com",
          role: session.user.role || "LEARNER",
          status: "ACTIVE",
          licenseExpiresAt: null,
          createdAt: new Date().toISOString(),
        },
      });
    }
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    // Update name if provided
    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    // Update password if both current and new passwords are provided
    if (currentPassword && newPassword) {
      if (!user.password) {
        return NextResponse.json(
          { success: false, message: "Tài khoản này không có mật khẩu (đăng nhập bằng Google)" },
          { status: 400 }
        );
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, message: "Mật khẩu hiện tại không đúng" },
          { status: 400 }
        );
      }

      // Strong password validation
      if (newPassword.length < 12) {
        return NextResponse.json(
          { success: false, message: "Mật khẩu mới phải có ít nhất 12 ký tự" },
          { status: 400 }
        );
      }
      if (!/[A-Z]/.test(newPassword)) {
        return NextResponse.json(
          { success: false, message: "Mật khẩu phải có ít nhất 1 chữ hoa" },
          { status: 400 }
        );
      }
      if (!/[a-z]/.test(newPassword)) {
        return NextResponse.json(
          { success: false, message: "Mật khẩu phải có ít nhất 1 chữ thường" },
          { status: 400 }
        );
      }
      if (!/[0-9]/.test(newPassword)) {
        return NextResponse.json(
          { success: false, message: "Mật khẩu phải có ít nhất 1 số" },
          { status: 400 }
        );
      }
      if (!/[^A-Za-z0-9]/.test(newPassword)) {
        return NextResponse.json(
          { success: false, message: "Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*)" },
          { status: 400 }
        );
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        licenseExpiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Ban khong co quyen truy cap tai nguyen nay." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        licenseExpiresAt: true,
        monthlyReviewsUsed: true,
        pricingTier: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Khong tim thay nguoi dung." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error?.message || "Loi may chu." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Ban khong co quyen truy cap tai nguyen nay." },
        { status: 403 }
      );
    }

    const { id: userId } = await context.params;
    const body = await req.json();
    const { name, email, password, role, status, licenseExpiresAt } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "User ID la bat buoc." },
        { status: 400 }
      );
    }

    if (userId === session.user.id && status === "LOCKED") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Không thể tự khóa tài khoản của chính mình." },
        { status: 400 }
      );
    }

    if (userId === session.user.id && role && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Không thể tự thay đổi vai trò của chính mình." },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password && password.trim()) updateData.password = await bcrypt.hash(password, 10);
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (licenseExpiresAt !== undefined) {
      updateData.licenseExpiresAt = licenseExpiresAt ? new Date(licenseExpiresAt) : null;
    }

    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          licenseExpiresAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json({ success: true, data: updated });
    } catch (dbErr: any) {
      if (dbErr?.code === "P2025") {
        if (userId === "admin-default-id" || userId === "staff-default-id" || userId === "customer-default-id") {
          const defaultPassword = await bcrypt.hash("admin12345", 10);
          const created = await prisma.user.create({
            data: {
              id: userId,
              name: name || (userId === "admin-default-id" ? "Quản Trị Viên (Admin)" : "Nhân Viên"),
              email: email || (userId === "admin-default-id" ? "admin@gmail.com" : "nhanvien@gmail.com"),
              password: defaultPassword,
              role: role || (userId === "admin-default-id" ? "ADMIN" : "TEACHER"),
              status: status || "ACTIVE",
              licenseExpiresAt: licenseExpiresAt ? new Date(licenseExpiresAt) : null,
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              licenseExpiresAt: true,
              createdAt: true,
              updatedAt: true,
            },
          });
          return NextResponse.json({ success: true, data: created });
        }
      }
      throw dbErr;
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error?.message || "Loi may chu." },
      { status: 500 }
    );
  }
}

export const PUT = PATCH;

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Ban khong co quyen truy cap tai nguyen nay." },
        { status: 403 }
      );
    }

    const { id: userId } = await context.params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "User ID la bat buoc." },
        { status: 400 }
      );
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Không thể tự xóa tài khoản của chính mình." },
        { status: 400 }
      );
    }

    try {
      await prisma.user.delete({
        where: { id: userId },
      });
    } catch (err: any) {
      if (err?.code !== "P2025") {
        throw err;
      }
    }

    return NextResponse.json({ success: true, message: "Đã xóa người dùng thành công." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error?.message || "Loi may chu." },
      { status: 500 }
    );
  }
}

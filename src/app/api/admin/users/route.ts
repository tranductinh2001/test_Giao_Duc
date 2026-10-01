import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/api";
import bcrypt from "bcrypt";

const PAGE_SIZE_FALLBACK = 10;

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Ban khong co quyen truy cap tai nguyen nay." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const role = searchParams.get("role") || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || String(PAGE_SIZE_FALLBACK), 10), 1), 50);

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(status ? { status: status as "ACTIVE" | "LOCKED" | "INACTIVE" } : {}),
      ...(role ? { role: role as "ADMIN" | "LEARNER" } : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          licenseExpiresAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              examAttempts: true,
              bookmarks: true,
              wrongAnswers: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: users,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Ban khong co quyen truy cap tai nguyen nay." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, role, status, licenseExpiresAt } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "Ten, email va mat khau la bat buoc." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "DUPLICATE_EMAIL", message: "Email da ton tai trong he thong." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "LEARNER",
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

    return NextResponse.json({ success: true, data: user });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Ban khong co quyen truy cap tai nguyen nay." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, name, email, password, role, status, licenseExpiresAt } = body;

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
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (licenseExpiresAt !== undefined) {
      updateData.licenseExpiresAt = licenseExpiresAt ? new Date(licenseExpiresAt) : null;
    }

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
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Ban khong co quyen truy cap tai nguyen nay." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

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

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true, message: "Đã xóa người dùng thành công." });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

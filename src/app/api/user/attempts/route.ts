import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const attempts = await prisma.examAttempt.findMany({
      where: {
        userId: user.id,
        status: { in: ["SUBMITTED", "SYSTEM_SUBMITTED"] },
      },
      orderBy: { submittedAt: "desc" },
      include: {
        exam: {
          select: {
            title: true,
            timeLimit: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    console.error("Get attempts error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra khi tải lịch sử thi." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const feedbackSchema = z.object({
  subject: z.string().min(5, "Tiêu đề phải có ít nhất 5 ký tự").max(200),
  message: z.string().min(10, "Nội dung phải có ít nhất 10 ký tự"),
  category: z.enum(["Bug", "Suggestion", "Question", "Other"]).optional(),
});

// POST /api/feedback - Create new feedback
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = feedbackSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu không hợp lệ", errors: validation.error.issues },
        { status: 400 }
      );
    }

    const { subject, message, category } = validation.data;

    const feedback = await prisma.feedback.create({
      data: {
        userId: session.user.id,
        subject,
        message,
        category: category || "Other",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // TODO: Send email notification to admin
    // await sendEmailToAdmin(feedback);

    return NextResponse.json({
      success: true,
      message: "Góp ý của bạn đã được gửi thành công. Cảm ơn bạn!",
      data: feedback,
    });
  } catch (error) {
    console.error("Error creating feedback:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server" },
      { status: 500 }
    );
  }
}

// GET /api/feedback - List user's feedbacks or all (admin)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where = isAdmin
      ? status
        ? { status: status as any }
        : {}
      : { userId: session.user.id };

    const feedbacks = await prisma.feedback.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: feedbacks,
    });
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const validateSchema = z.object({
  token: z.string().min(1, "Token không hợp lệ"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = validateSchema.parse(body);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!resetToken) {
      return NextResponse.json(
        { success: false, message: "Link đặt lại mật khẩu không hợp lệ." },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (new Date() > resetToken.expires) {
      // Delete expired token
      await prisma.passwordResetToken.delete({ where: { token } });
      return NextResponse.json(
        { success: false, message: "Link đã hết hạn. Vui lòng yêu cầu link mới." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Token hợp lệ",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Validate reset token error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

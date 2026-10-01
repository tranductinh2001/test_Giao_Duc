import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";
import { getClientInfo } from "@/lib/security";
import { checkRateLimit, registerRateLimit } from "@/lib/ratelimit";
import { logSecurityEvent, SecurityEvent } from "@/lib/audit";

// Force Node.js runtime (not Edge) because we use bcrypt and Prisma
export const runtime = "nodejs";

const RegisterSchema = z.object({
  name: z.string().min(2, "Tên phải từ 2 ký tự trở lên"),
  email: z.string().email("Định dạng email không hợp lệ"),
  password: z.string()
    .min(12, "Mật khẩu phải có ít nhất 12 ký tự")
    .regex(/[A-Z]/, "Mật khẩu phải có ít nhất 1 chữ hoa")
    .regex(/[a-z]/, "Mật khẩu phải có ít nhất 1 chữ thường")
    .regex(/[0-9]/, "Mật khẩu phải có ít nhất 1 số")
    .regex(/[^A-Za-z0-9]/, "Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*)"),
});

export async function POST(req: NextRequest) {
  try {
    const { ipAddress, userAgent } = getClientInfo(req);

    // Rate limiting by IP
    const { success, reset } = await checkRateLimit(registerRateLimit, ipAddress);
    if (!success) {
      await logSecurityEvent({
        event: SecurityEvent.RATE_LIMIT_EXCEEDED,
        details: { operation: "register", ipAddress },
        ipAddress,
        userAgent,
        success: false,
      });

      return NextResponse.json(
        {
          success: false,
          message: `Quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau ${Math.ceil((reset - Date.now()) / 1000 / 60)} phút.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Dữ liệu đăng ký không hợp lệ.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    
    const { name, email, password } = parsed.data;
    
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "EMAIL_ALREADY_EXISTS",
          message: "Email này đã được sử dụng.",
        },
        { status: 400 }
      );
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "LEARNER",
        status: "ACTIVE",
      },
    });

    // Send welcome email (non-blocking)
    if (process.env.RESEND_API_KEY) {
      const { sendWelcomeEmail } = await import("@/lib/email");
      sendWelcomeEmail({
        to: user.email,
        userName: user.name,
      }).catch((error) => {
        console.error("Failed to send welcome email:", error);
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Có lỗi xảy ra trong quá trình xử lý.",
      },
      { status: 500 }
    );
  }
}

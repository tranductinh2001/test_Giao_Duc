import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const announcementSchema = z.object({
  content: z.string().min(10),
  isActive: z.boolean().optional(),
  priority: z.number().int().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
});

// POST - Create announcement (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const validation = announcementSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, message: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const data = validation.data;
    const announcement = await prisma.announcement.create({
      data: {
        content: data.content,
        isActive: data.isActive ?? true,
        priority: data.priority ?? 0,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({ success: true, data: announcement });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Lỗi server" }, { status: 500 });
  }
}

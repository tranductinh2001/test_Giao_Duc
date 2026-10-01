import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const recruitmentSchema = z.object({
  title: z.string().min(10, "Tiêu đề phải có ít nhất 10 ký tự"),
  field: z.string().optional(),
  recruitmentType: z.string().optional(),
  province: z.string().min(2),
  district: z.string().optional(),
  ward: z.string().optional(),
  organization: z.string().min(5),
  applicationAddress: z.string().optional(),
  totalQuota: z.number().int().positive(),
  quotaDetails: z.string().optional(),
  round1Format: z.string().optional(),
  round2Format: z.string().optional(),
  applicationStartDate: z.string().optional(),
  applicationEndDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["OPEN", "CLOSED", "UPCOMING"]).optional(),
});

// GET /api/recruitment - List all recruitments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const province = searchParams.get("province");
    const status = searchParams.get("status");

    const where: any = { status: "OPEN" };
    if (province) where.province = province;
    if (status) where.status = status;

    const take = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    const recruitments = await prisma.recruitment.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take,
    });

    return NextResponse.json({
      success: true,
      data: recruitments,
    });
  } catch (error) {
    console.error("Error fetching recruitments:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server" },
      { status: 500 }
    );
  }
}

// POST /api/recruitment - Create (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = recruitmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu không hợp lệ", errors: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    const recruitment = await prisma.recruitment.create({
      data: {
        title: data.title,
        field: data.field || null,
        recruitmentType: data.recruitmentType || null,
        province: data.province,
        district: data.district || null,
        ward: data.ward || null,
        organization: data.organization,
        applicationAddress: data.applicationAddress || null,
        totalQuota: data.totalQuota,
        quotaDetails: data.quotaDetails ? JSON.parse(data.quotaDetails) : null,
        round1Format: data.round1Format || null,
        round2Format: data.round2Format || null,
        applicationStartDate: data.applicationStartDate ? new Date(data.applicationStartDate) : null,
        applicationEndDate: data.applicationEndDate ? new Date(data.applicationEndDate) : null,
        notes: data.notes || null,
        status: data.status || "OPEN",
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tạo tin tuyển dụng thành công",
      data: recruitment,
    });
  } catch (error) {
    console.error("Error creating recruitment:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

export const runtime = "nodejs";

// Helper to convert empty strings to null
const toNullIfEmpty = (val: string | null | undefined) =>
  val === "" || val === null || val === undefined ? null : val;

const recruitmentSchema = z.object({
  title: z.string().min(5, "Tiêu đề phải có ít nhất 5 ký tự"),
  field: z.string().transform(toNullIfEmpty).optional(),
  recruitmentType: z.string().transform(toNullIfEmpty).optional(),
  status: z.enum(["OPEN", "CLOSED", "UPCOMING"]).optional(),
  recruitmentYear: z.number().int().optional(),
  province: z.string().min(1, "Tỉnh/Thành phố không được để trống"),
  district: z.string().transform(toNullIfEmpty).optional(),
  ward: z.string().transform(toNullIfEmpty).optional(),
  organization: z.string().min(1, "Đơn vị tuyển dụng không được để trống"),
  applicationAddress: z.string().transform(toNullIfEmpty).optional(),
  totalQuota: z.number().int().positive("Tổng chỉ tiêu phải lớn hơn 0"),
  quotaDetails: z.string().transform(toNullIfEmpty).optional(),
  round1Format: z.string().transform(toNullIfEmpty).optional(),
  round2Format: z.string().transform(toNullIfEmpty).optional(),
  applicationStartDate: z.string().transform(toNullIfEmpty).optional(),
  applicationEndDate: z.string().transform(toNullIfEmpty).optional(),
  notes: z.string().transform(toNullIfEmpty).optional(),
});

// GET single recruitment post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await prisma.recruitment.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tin tuyển dụng." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("Fetch recruitment post error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra." },
      { status: 500 }
    );
  }
}

// PUT update recruitment post (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // Support legacy toggleActive call
    if (body.isActive !== undefined) {
      const post = await prisma.recruitment.update({
        where: { id },
        data: { status: body.isActive ? "OPEN" : "CLOSED" },
      });
      return NextResponse.json({ success: true, data: post });
    }

    // Validate with Zod
    const validation = recruitmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu không hợp lệ", errors: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    const updateData: any = {
      title: data.title,
      field: data.field,
      recruitmentType: data.recruitmentType,
      status: data.status,
      recruitmentYear: data.recruitmentYear,
      province: data.province,
      district: data.district,
      ward: data.ward,
      organization: data.organization,
      applicationAddress: data.applicationAddress,
      totalQuota: data.totalQuota,
      quotaDetails: data.quotaDetails,
      round1Format: data.round1Format,
      round2Format: data.round2Format,
      applicationStartDate: data.applicationStartDate ? new Date(data.applicationStartDate) : null,
      applicationEndDate: data.applicationEndDate ? new Date(data.applicationEndDate) : null,
      notes: data.notes,
    };

    const post = await prisma.recruitment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("Update recruitment post error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra." },
      { status: 500 }
    );
  }
}

// DELETE recruitment post (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    await prisma.recruitment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa tin tuyển dụng.",
    });
  } catch (error) {
    console.error("Delete recruitment post error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra." },
      { status: 500 }
    );
  }
}

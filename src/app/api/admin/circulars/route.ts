import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { circularService, CreateCircularInput } from "@/lib/services";

// GET /api/admin/circulars - List all circulars
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Khong co quyen truy cap" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || undefined;

    const result = await circularService.getAll({
      page,
      limit,
      isActive: activeOnly ? true : undefined,
    });

    return NextResponse.json({ success: true, data: result.data, total: result.total });
  } catch (error) {
    console.error("Error fetching circulars:", error);
    return NextResponse.json({ success: false, message: "Loi khi tai danh sach" }, { status: 500 });
  }
}

// POST /api/admin/circulars - Create a new circular
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Khong co quyen truy cap" }, { status: 403 });
    }

    const body = await req.json();

    // Validate input using Zod schema from service
    const input: CreateCircularInput = {
      code: body.code,
      title: body.title,
      type: body.type || "GUIDELINE",
      content: body.content,
      summary: body.summary,
      issuedDate: body.issuedDate,
      effectiveDate: body.effectiveDate,
      applicableLevel: body.applicableLevel || [],
      applicableSubjects: body.applicableSubjects || [],
      isActive: body.isActive ?? true,
      templateId: body.templateId,
    };

    const circular = await circularService.create(input);

    return NextResponse.json({ success: true, data: circular, message: "Tao cong van thanh cong" }, { status: 201 });
  } catch (error) {
    console.error("Error creating circular:", error);
    const message = error instanceof Error ? error.message : "Loi khi tao cong van";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSystemUsageStats } from "@/lib/usage-tracking";

// GET /api/admin/usage-stats - Get system-wide usage statistics (Admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // Get query params for date range
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const params = startDate && endDate
      ? {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }
      : undefined;

    const stats = await getSystemUsageStats(params);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi lấy thống kê" },
      { status: 500 }
    );
  }
}

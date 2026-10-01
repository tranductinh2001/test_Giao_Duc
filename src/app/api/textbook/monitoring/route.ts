import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDashboardStats, getPerformanceMetrics, getRecentActivity, getErrorSummary } from "@/core/textbook/monitoring";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const days = parseInt(searchParams.get("days") || "7");

    switch (action) {
      case "metrics":
        const metrics = await getPerformanceMetrics(days);
        return NextResponse.json({ success: true, data: metrics });

      case "activity":
        const limit = parseInt(searchParams.get("limit") || "20");
        const activity = await getRecentActivity(limit);
        return NextResponse.json({ success: true, data: activity });

      case "errors":
        const errors = await getErrorSummary();
        return NextResponse.json({ success: true, data: errors });

      default:
        const stats = await getDashboardStats();
        return NextResponse.json({ success: true, data: stats });
    }
  } catch (error) {
    console.error("[TextbookMonitoring] Error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Lỗi khi lấy dữ liệu monitoring" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

// GET /api/admin/recruitment/template - Download Excel template
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Create sample data with new headers
    const sampleData = [
      {
        "Tiêu đề": "Tuyển dụng viên chức ngành Giáo dục",
        "Lĩnh vực": "Giáo dục",
        "Loại tuyển dụng": "Viên chức",
        "Năm tuyển dụng": 2026,
        "Tỉnh/Thành phố": "Hà Nội",
        "Quận/Huyện": "Cầu Giấy",
        "Phường/Xã": "Dịch Vọng",
        "Đơn vị tuyển dụng": "Sở Giáo dục Hà Nội",
        "Địa chỉ nhận hồ sơ": "Số 23, Phố Quốc Tử Giám, Q. Đống Đa, Hà Nội",
        "Tổng chỉ tiêu": 50,
        "Chi tiết chỉ tiêu": '{"Giáo viên Toán": 15, "Giáo viên Văn": 10, "Giáo viên Anh": 25}',
        "Hình thức vòng 1": "Trắc nghiệm",
        "Hình thức vòng 2": "Phỏng vấn",
        "Ngày bắt đầu nhận hồ sơ": "2026-07-01",
        "Ngày kết thúc nhận hồ sơ": "2026-07-31",
        "Ghi chú": "Hồ sơ gồm: Đơn xin việc, CV, bằng cấp",
      },
    ];

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tin tuyển dụng");

    // Set column widths
    ws["!cols"] = [
      { wch: 35 }, // Tiêu đề
      { wch: 15 }, // Lĩnh vực
      { wch: 15 }, // Loại tuyển dụng
      { wch: 12 }, // Năm tuyển dụng
      { wch: 15 }, // Tỉnh/Thành phố
      { wch: 15 }, // Quận/Huyện
      { wch: 15 }, // Phường/Xã
      { wch: 25 }, // Đơn vị tuyển dụng
      { wch: 35 }, // Địa chỉ nhận hồ sơ
      { wch: 12 }, // Tổng chỉ tiêu
      { wch: 30 }, // Chi tiết chỉ tiêu
      { wch: 15 }, // Hình thức vòng 1
      { wch: 15 }, // Hình thức vòng 2
      { wch: 18 }, // Ngày bắt đầu
      { wch: 18 }, // Ngày kết thúc
      { wch: 35 }, // Ghi chú
    ];

    // Generate Excel buffer
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Return as file download
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="recruitment_template.xlsx"',
      },
    });
  } catch (error) {
    console.error("Generate template error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra khi tạo file mẫu." },
      { status: 500 }
    );
  }
}

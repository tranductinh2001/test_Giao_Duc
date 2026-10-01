import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const methods = await prisma.teachingMethod.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        gradeLevelMethods: true,
        subjectMethods: true,
        activityTypeMethods: true,
      },
    });

    // Column headers for new fields
    const headers = [
      "Mã",
      "Tên phương pháp",
      "Mô tả",
      "Mục tiêu",
      "Quy trình thực hiện",
      "Ưu điểm",
      "Hạn chế",
      "Điều kiện áp dụng",
      "Ví dụ minh họa",
      "Từ khóa nhận diện",
      "Dấu hiệu nhận diện",
      "Tiêu chí đánh giá",
      "Gợi ý cải thiện",
      "Cấp học áp dụng",
      "Môn học áp dụng",
      "Hoạt động phù hợp",
      "Trạng thái",
      "Thứ tự",
    ];

    // Build rows
    const rows = methods.map((m) => {
      return [
        m.code || "",
        m.name || "",
        m.description || "",
        m.objectives || "",
        m.process || "",
        m.advantages || "",
        m.limitations || "",
        m.conditions || "",
        m.examples || "",
        m.keywords || "",
        m.indicators || "",
        m.criteria || "",
        m.improvementSuggestions || "",
        m.gradeLevelMethods.map(g => g.gradeCode).join(", "),
        m.subjectMethods.map(s => s.subjectCode).join(", "),
        m.activityTypeMethods.map(a => a.activityType).join(", "),
        m.isActive ? "Hoạt động" : "Không hoạt động",
        String(m.sortOrder || 0),
      ];
    });

    // Create CSV content
    const csvLines = [headers.join(",")];

    for (const row of rows) {
      const cells = row.map((cell) => {
        const str = String(cell);
        return `"${str.replace(/"/g, '""')}"`;
      });
      csvLines.push(cells.join(","));
    }

    const csvString = csvLines.join("\n");

    // Convert to UTF-8 buffer with BOM
    const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
    const utf8Buffer = Buffer.from(csvString, "utf-8");
    const finalBuffer = Buffer.concat([BOM, utf8Buffer]);

    return new NextResponse(finalBuffer, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="phuong-phap-giang-day-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting teaching methods:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi xuất dữ liệu" },
      { status: 500 }
    );
  }
}

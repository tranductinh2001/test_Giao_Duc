import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn file để import" },
        { status: 400 }
      );
    }

    // Read file content
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, message: "File không có dữ liệu" },
        { status: 400 }
      );
    }

    // Parse CSV
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());

    // Map column names for new fields
    const codeIndex = headers.findIndex((h) => h.includes("mã") || h === "code");
    const nameIndex = headers.findIndex((h) => h.includes("tên") && !h.includes("mã") || h === "name");
    const descIndex = headers.findIndex((h) => h.includes("mô tả") || h === "description");
    const objIndex = headers.findIndex((h) => h.includes("mục tiêu") || h === "objectives");
    const procIndex = headers.findIndex((h) => h.includes("quy trình") || h === "process");
    const advIndex = headers.findIndex((h) => h.includes("ưu điểm") || h === "advantages");
    const limitIndex = headers.findIndex((h) => h.includes("hạn chế") || h === "limitations");
    const condIndex = headers.findIndex((h) => h.includes("điều kiện") || h === "conditions");
    const exIndex = headers.findIndex((h) => h.includes("ví dụ") || h === "examples");
    const kwIndex = headers.findIndex((h) => h.includes("từ khóa") || h.includes("keyword"));
    const indIndex = headers.findIndex((h) => h.includes("dấu hiệu") || h.includes("indicator"));
    const critIndex = headers.findIndex((h) => h.includes("tiêu chí") || h.includes("criteria"));
    const impIndex = headers.findIndex((h) => h.includes("gợi ý cải thiện") || h.includes("improvement"));
    const gradeIndex = headers.findIndex((h) => h.includes("cấp học") || h.includes("grade"));
    const subjectIndex = headers.findIndex((h) => h.includes("môn học") || h.includes("subject"));
    const activityIndex = headers.findIndex((h) => h.includes("hoạt động") || h.includes("activity"));
    const activeIndex = headers.findIndex((h) => h.includes("trạng thái") || h === "isactive" || h === "active");
    const sortIndex = headers.findIndex((h) => h.includes("thứ tự") || h === "sortorder" || h === "sort");

    if (nameIndex === -1 && codeIndex === -1) {
      return NextResponse.json(
        { success: false, message: "File phải có cột 'Mã' hoặc 'Tên phương pháp'" },
        { status: 400 }
      );
    }

    // Get max sortOrder
    const maxOrder = await prisma.teachingMethod.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    let sortOrder = (maxOrder?.sortOrder ?? -1) + 1;

    const imported: string[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const code = codeIndex !== -1 ? values[codeIndex]?.trim() : undefined;
      const name = nameIndex !== -1 ? values[nameIndex]?.trim() : undefined;

      if (!code && !name) {
        errors.push(`Dòng ${i + 1}: Thiếu mã và tên phương pháp`);
        continue;
      }

      try {
        // Use code if provided, otherwise generate from name
        const finalCode = code?.trim()
          ? code.trim().toUpperCase()
          : name!.toUpperCase()
              .normalize("NFD")
              .replace(/[̀-ͯ]/g, "")
              .replace(/[^A-Z0-9]/g, "_")
              .replace(/_+/g, "_")
              .replace(/^_|_$/g, "") || `METHOD_${i + 1}`;

        // Parse grade levels (comma-separated)
        const gradeLevels = gradeIndex !== -1 && values[gradeIndex]?.trim()
          ? values[gradeIndex].split(",").map((g: string) => g.trim()).filter(Boolean)
          : [];

        // Parse subjects (comma-separated)
        const subjects = subjectIndex !== -1 && values[subjectIndex]?.trim()
          ? values[subjectIndex].split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];

        // Parse activities (comma-separated)
        const activities = activityIndex !== -1 && values[activityIndex]?.trim()
          ? values[activityIndex].split(",").map((a: string) => a.trim()).filter(Boolean)
          : [];

        await prisma.teachingMethod.create({
          data: {
            code: finalCode,
            name: name?.trim() || finalCode,
            description: descIndex !== -1 ? values[descIndex]?.trim() || null : null,
            objectives: objIndex !== -1 ? values[objIndex]?.trim() || null : null,
            process: procIndex !== -1 ? values[procIndex]?.trim() || null : null,
            advantages: advIndex !== -1 ? values[advIndex]?.trim() || null : null,
            limitations: limitIndex !== -1 ? values[limitIndex]?.trim() || null : null,
            conditions: condIndex !== -1 ? values[condIndex]?.trim() || null : null,
            examples: exIndex !== -1 ? values[exIndex]?.trim() || null : null,
            keywords: kwIndex !== -1 ? values[kwIndex]?.trim() || null : null,
            indicators: indIndex !== -1 ? values[indIndex]?.trim() || null : null,
            criteria: critIndex !== -1 ? values[critIndex]?.trim() || null : null,
            improvementSuggestions: impIndex !== -1 ? values[impIndex]?.trim() || null : null,
            isActive: activeIndex !== -1 ? values[activeIndex]?.toLowerCase().includes("hoạt động") || values[activeIndex]?.toLowerCase() === "active" || values[activeIndex]?.toLowerCase() === "true" : true,
            sortOrder: sortOrder++,
            // Add grade level links
            gradeLevelMethods: gradeLevels.length > 0 ? {
              create: gradeLevels.map((g: string) => ({ gradeCode: g }))
            } : undefined,
            // Add subject links
            subjectMethods: subjects.length > 0 ? {
              create: subjects.map((s: string) => ({ subjectCode: s }))
            } : undefined,
            // Add activity type links
            activityTypeMethods: activities.length > 0 ? {
              create: activities.map((a: string) => ({ activityType: a }))
            } : undefined,
          },
        });
        imported.push(name || finalCode);
      } catch (e) {
        errors.push(`Dòng ${i + 1}: Lỗi khi tạo "${name || code}"`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã import ${imported.length} phương pháp${errors.length > 0 ? `, ${errors.length} lỗi` : ""}`,
      imported: imported.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error importing teaching methods:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi import dữ liệu" },
      { status: 500 }
    );
  }
}

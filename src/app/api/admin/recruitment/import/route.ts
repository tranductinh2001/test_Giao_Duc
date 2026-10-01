import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

// POST /api/admin/recruitment/import - Import from Excel
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy file" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { success: false, message: "File phải có định dạng Excel (.xlsx hoặc .xls)" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return NextResponse.json(
        { success: false, message: "File Excel không có dữ liệu" },
        { status: 400 }
      );
    }

    const posts = [];
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row: any = jsonData[i];
      const rowNum = i + 2;

      try {
        if (!row["Tiêu đề"] || !row["Đơn vị tuyển dụng"]) {
          errors.push(`Dòng ${rowNum}: Thiếu Tiêu đề hoặc Đơn vị tuyển dụng`);
          continue;
        }

        if (!row["Tỉnh/Thành phố"]) {
          errors.push(`Dòng ${rowNum}: Thiếu Tỉnh/Thành phố`);
          continue;
        }

        // Parse dates - now optional
        let applicationEndDate: Date | null = null;
        if (row["Ngày kết thúc nhận hồ sơ"]) {
          try {
            if (typeof row["Ngày kết thúc nhận hồ sơ"] === "number") {
              const parsed = XLSX.SSF.parse_date_code(row["Ngày kết thúc nhận hồ sơ"]);
              applicationEndDate = new Date(parsed.y, parsed.m - 1, parsed.d);
            } else {
              applicationEndDate = new Date(row["Ngày kết thúc nhận hồ sơ"]);
            }
            if (isNaN(applicationEndDate.getTime())) applicationEndDate = null;
          } catch (e) {
            applicationEndDate = null;
          }
        }

        let applicationStartDate: Date | null = null;
        if (row["Ngày bắt đầu nhận hồ sơ"]) {
          try {
            if (typeof row["Ngày bắt đầu nhận hồ sơ"] === "number") {
              const parsed = XLSX.SSF.parse_date_code(row["Ngày bắt đầu nhận hồ sơ"]);
              applicationStartDate = new Date(parsed.y, parsed.m - 1, parsed.d);
            } else {
              applicationStartDate = new Date(row["Ngày bắt đầu nhận hồ sơ"]);
            }
            if (isNaN(applicationStartDate.getTime())) applicationStartDate = null;
          } catch (e) {
            applicationStartDate = null;
          }
        }

        // Parse total quota
        const totalQuota = parseInt(String(row["Tổng chỉ tiêu"] || 1));
        if (isNaN(totalQuota) || totalQuota < 1) {
          errors.push(`Dòng ${rowNum}: Tổng chỉ tiêu phải là số nguyên dương`);
          continue;
        }

        // Parse quota details if provided
        let quotaDetails = null;
        if (row["Chi tiết chỉ tiêu"]) {
          try {
            quotaDetails = JSON.parse(String(row["Chi tiết chỉ tiêu"]));
          } catch (e) {
            // If not valid JSON, store as string
            quotaDetails = String(row["Chi tiết chỉ tiêu"]);
          }
        }

        // Parse recruitment year
        let recruitmentYear = null;
        if (row["Năm tuyển dụng"]) {
          recruitmentYear = parseInt(String(row["Năm tuyển dụng"]));
          if (isNaN(recruitmentYear)) recruitmentYear = null;
        }

        // Build post data - include all fields with proper null handling
        const postData: any = {};
        postData.title = String(row["Tiêu đề"]).trim();
        postData.field = row["Lĩnh vực"] ? String(row["Lĩnh vực"]).trim() : null;
        postData.recruitmentType = row["Loại tuyển dụng"] ? String(row["Loại tuyển dụng"]).trim() : null;
        postData.recruitmentYear = recruitmentYear;
        postData.province = String(row["Tỉnh/Thành phố"]).trim();
        postData.district = row["Quận/Huyện"] ? String(row["Quận/Huyện"]).trim() : null;
        postData.ward = row["Phường/Xã"] ? String(row["Phường/Xã"]).trim() : null;
        postData.organization = String(row["Đơn vị tuyển dụng"]).trim();
        postData.applicationAddress = row["Địa chỉ nhận hồ sơ"] ? String(row["Địa chỉ nhận hồ sơ"]).trim() : null;
        postData.totalQuota = totalQuota;
        postData.quotaDetails = quotaDetails;
        postData.round1Format = row["Hình thức vòng 1"] ? String(row["Hình thức vòng 1"]).trim() : null;
        postData.round2Format = row["Hình thức vòng 2"] ? String(row["Hình thức vòng 2"]).trim() : null;

        // Debug log
        console.log("DEBUG applicationEndDate:", applicationEndDate, typeof applicationEndDate);

        // Add date fields explicitly
        if (applicationStartDate) {
          postData.applicationStartDate = applicationStartDate;
        }
        if (applicationEndDate) {
          postData.applicationEndDate = applicationEndDate;
        }

        postData.notes = row["Ghi chú"] ? String(row["Ghi chú"]).trim() : null;
        postData.status = "OPEN";
        postData.createdBy = session.user.id;

        posts.push(postData);
      } catch (error) {
        errors.push(`Dòng ${rowNum}: Lỗi xử lý dữ liệu`);
      }
    }

    if (errors.length > 0 && posts.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Có ${errors.length} dòng lỗi, ${posts.length} dòng hợp lệ. Vui lòng sửa file và thử lại.`,
        errors: errors.slice(0, 10),
        validCount: posts.length,
      });
    }

    if (posts.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Không có dòng nào hợp lệ để import",
        errors: errors.slice(0, 10),
      });
    }

    // Use create instead of createMany to handle optional dates properly
    let createdCount = 0;
    for (const post of posts) {
      try {
        await prisma.recruitment.create({ data: post });
        createdCount++;
      } catch (err) {
        console.error("Error creating recruitment:", err);
        errors.push(`Lỗi khi tạo bản ghi: ${post.title}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã import thành công ${createdCount} tin tuyển dụng`,
      count: createdCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error("Import recruitment posts error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra khi import dữ liệu." },
      { status: 500 }
    );
  }
}

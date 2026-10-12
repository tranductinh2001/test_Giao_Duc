import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, readFile } from "fs/promises";
import path from "path";

// GET /api/admin/settings - Lấy thông tin cấu hình API Beeknoee
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Chỉ Quản trị viên mới có quyền truy cập cấu hình hệ thống" },
        { status: 403 }
      );
    }

    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    try {
      envContent = await readFile(envPath, "utf-8");
    } catch {
      // .env chưa tồn tại
    }

    // Trích xuất các biến cấu hình Beeknoee
    const keyMatch = envContent.match(/(?:BEE_API_KEY|BEEKNOEE_API_KEY)="?([^"\n]+)"?/);
    const urlMatch = envContent.match(/(?:BEE_BASE_URL|BEEKNOEE_BASE_URL)="?([^"\n]+)"?/);
    const modelMatch = envContent.match(/(?:BEE_MODEL|AI_MODEL)="?([^"\n]+)"?/);
    const timeoutMatch = envContent.match(/(?:BEEKNOEE_TIMEOUT|AI_TIMEOUT)="?([^"\n]+)"?/);

    const beeApiKey = keyMatch ? keyMatch[1] : (process.env.BEE_API_KEY || process.env.BEEKNOEE_API_KEY || "");
    const beeBaseUrl = urlMatch ? urlMatch[1] : (process.env.BEE_BASE_URL || process.env.BEEKNOEE_BASE_URL || "https://platform.beeknoee.com/api/v1");
    const beeModel = modelMatch ? modelMatch[1] : (process.env.BEE_MODEL || process.env.AI_MODEL || "gemini-3.1-flash-lite");
    const beeTimeout = timeoutMatch ? parseInt(timeoutMatch[1], 10) : parseInt(process.env.BEEKNOEE_TIMEOUT || "120000", 10);

    return NextResponse.json({
      success: true,
      data: {
        beeApiKey,
        beeBaseUrl,
        beeModel,
        beeTimeout,
        hasKey: Boolean(beeApiKey && beeApiKey !== "your-beeknoee-api-key-here" && beeApiKey.length >= 10),
      },
    });
  } catch (error) {
    console.error("Error getting settings:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải cấu hình hệ thống" },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings - Cập nhật cấu hình API Beeknoee
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Chỉ Quản trị viên mới có quyền cập nhật cấu hình" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { beeApiKey, beeBaseUrl, beeModel, beeTimeout } = body;

    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    try {
      envContent = await readFile(envPath, "utf-8");
    } catch {
      envContent = `DATABASE_URL=""\nNEXTAUTH_SECRET=""\nNEXTAUTH_URL="http://localhost:3000"\n`;
    }

    // Helper hàm cập nhật hoặc thêm biến env
    const updateEnvVar = (key: string, value: string) => {
      const regex = new RegExp(`^${key}="?[^"\\n]*"?`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}="${value}"`);
      } else {
        envContent += `\n${key}="${value}"`;
      }
    };

    if (beeApiKey && typeof beeApiKey === "string") {
      const cleanKey = beeApiKey.trim();
      updateEnvVar("BEE_API_KEY", cleanKey);
      updateEnvVar("BEEKNOEE_API_KEY", cleanKey);
      process.env.BEE_API_KEY = cleanKey;
      process.env.BEEKNOEE_API_KEY = cleanKey;
    }

    if (beeBaseUrl && typeof beeBaseUrl === "string") {
      const cleanUrl = beeBaseUrl.trim();
      updateEnvVar("BEE_BASE_URL", cleanUrl);
      updateEnvVar("BEEKNOEE_BASE_URL", cleanUrl);
      process.env.BEE_BASE_URL = cleanUrl;
      process.env.BEEKNOEE_BASE_URL = cleanUrl;
    }

    if (beeModel && typeof beeModel === "string") {
      const cleanModel = beeModel.trim();
      updateEnvVar("BEE_MODEL", cleanModel);
      updateEnvVar("AI_MODEL", cleanModel);
      process.env.BEE_MODEL = cleanModel;
      process.env.AI_MODEL = cleanModel;
    }

    if (beeTimeout) {
      const timeoutVal = String(beeTimeout).trim();
      updateEnvVar("BEEKNOEE_TIMEOUT", timeoutVal);
      updateEnvVar("AI_TIMEOUT", timeoutVal);
      process.env.BEEKNOEE_TIMEOUT = timeoutVal;
      process.env.AI_TIMEOUT = timeoutVal;
    }

    // Ghi lại vào file .env
    await writeFile(envPath, envContent, "utf-8");

    return NextResponse.json({
      success: true,
      message: "Đã lưu cấu hình API Beeknoee thành công.",
      data: {
        beeBaseUrl: process.env.BEE_BASE_URL,
        beeModel: process.env.BEE_MODEL,
      },
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi lưu cấu hình API Beeknoee" },
      { status: 500 }
    );
  }
}

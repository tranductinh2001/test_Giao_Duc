import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, readFile } from "fs/promises";
import path from "path";

// GET /api/admin/settings - Get current settings (masked)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Chỉ Admin mới có quyền truy cập" },
        { status: 403 }
      );
    }

    // Read current .env file
    // eslint-disable-next-line turbopack/no-turbopack-imports
    const envPath = path.join(/*turbopackIgnore: true*/ process.cwd(), ".env");
    let envContent = "";
    try {
      envContent = await readFile(envPath, "utf-8");
    } catch (error) {
      // .env file doesn't exist yet
    }

    // Extract BEE_API_KEY
    const match = envContent.match(/BEE_API_KEY="?([^"\n]+)"?/);
    const beeApiKey = match ? match[1] : "";

    return NextResponse.json({
      success: true,
      data: {
        beeApiKey,
        hasKey: beeApiKey && beeApiKey !== "your-beeknoee-api-key-here",
      },
    });
  } catch (error) {
    console.error("Error getting settings:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải cài đặt" },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings - Update settings
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Chỉ Admin mới có quyền truy cập" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { beeApiKey } = body;

    if (!beeApiKey || typeof beeApiKey !== "string") {
      return NextResponse.json(
        { success: false, message: "API key không hợp lệ" },
        { status: 400 }
      );
    }

    // Read current .env file
    // eslint-disable-next-line turbopack/no-turbopack-imports
    const envPath = path.join(/*turbopackIgnore: true*/ process.cwd(), ".env");
    let envContent = "";
    try {
      envContent = await readFile(envPath, "utf-8");
    } catch (error) {
      // .env file doesn't exist, create template
      envContent = `DATABASE_URL=""\nNEXTAUTH_SECRET=""\nNEXTAUTH_URL="http://localhost:3000"\n`;
    }

    // Update or add BEE_API_KEY
    if (envContent.includes("BEE_API_KEY=")) {
      // Replace existing key
      envContent = envContent.replace(
        /BEE_API_KEY="?[^"\n]*"?/,
        `BEE_API_KEY="${beeApiKey}"`
      );
    } else {
      // Add new key at the end
      envContent += `\n# Beeknoee AI API Key for lesson plan review\nBEE_API_KEY="${beeApiKey}"\n`;
    }

    // Write back to .env file
    await writeFile(envPath, envContent, "utf-8");

    // Update process.env (note: requires server restart to fully take effect)
    process.env.BEE_API_KEY = beeApiKey;

    return NextResponse.json({
      success: true,
      message: "Đã lưu API key. Vui lòng restart server để áp dụng.",
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi lưu cài đặt" },
      { status: 500 }
    );
  }
}

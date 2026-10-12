import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// POST /api/admin/settings/test - Kiểm tra kết nối API Beeknoee
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Chỉ Quản trị viên mới có quyền kiểm tra kết nối API" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { beeApiKey, beeBaseUrl, beeModel } = body;

    const apiKey = (beeApiKey || process.env.BEE_API_KEY || process.env.BEEKNOEE_API_KEY || "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập API Key để kiểm tra kết nối" },
        { status: 400 }
      );
    }

    const baseUrl = (beeBaseUrl || process.env.BEE_BASE_URL || process.env.BEEKNOEE_BASE_URL || "https://platform.beeknoee.com/api/v1").trim().replace(/\/+$/, "");
    const model = (beeModel || process.env.BEE_MODEL || process.env.AI_MODEL || "gemini-3.1-flash-lite").trim();

    // Thử gọi endpoint test completions
    const testUrl = `${baseUrl}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    let response;
    try {
      response = await fetch(testUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: "ping"
            }
          ],
          max_tokens: 5
        }),
        signal: controller.signal
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json(
          { success: false, message: `Hết thời gian kết nối (Timeout) tới ${baseUrl}` },
          { status: 408 }
        );
      }
      return NextResponse.json(
        { success: false, message: `Không thể kết nối tới máy chủ Beeknoee (${fetchErr.message})` },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Beeknoee API test failed:", response.status, errorText);

      let errorMessage = `API Beeknoee trả về lỗi (mã ${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        // Not JSON
      }

      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 400 }
      );
    }

    const data = await response.json();

    if (data.choices && data.choices.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Kết nối thành công! API Key và mô hình ${model} hoạt động tốt.`,
        data: {
          model,
          testPassed: true,
        },
      });
    }

    return NextResponse.json(
      { success: true, message: "Kết nối thành công tới API Beeknoee." }
    );
  } catch (error) {
    console.error("Error testing Beeknoee API:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Lỗi kiểm tra kết nối API"
      },
      { status: 500 }
    );
  }
}

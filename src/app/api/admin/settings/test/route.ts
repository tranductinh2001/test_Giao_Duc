import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// POST /api/admin/settings/test - Test Beeknoee API key
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

    // Test API key by making a simple request to Beeknoee API
    const BEE_BASE_URL = process.env.BEE_BASE_URL || "https://platform.beeknoee.com/api/v1";
    const testUrl = `${BEE_BASE_URL}/chat/completions`;

    const response = await fetch(testUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${beeApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.1-flash-lite",
        messages: [
          {
            role: "user",
            content: "Hello"
          }
        ],
        max_tokens: 10
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Beeknoee API test failed:", error);

      // Parse error message
      let errorMessage = "API key không hợp lệ";
      try {
        const errorJson = JSON.parse(error);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch (e) {
        // Error is not JSON
      }

      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 400 }
      );
    }

    const data = await response.json();

    // Check if we got a valid response
    if (data.choices && data.choices.length > 0) {
      return NextResponse.json({
        success: true,
        message: "API key hợp lệ",
        data: {
          model: "gemini-3.1-flash-lite",
          testPassed: true,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "Không thể xác thực API key" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error testing API key:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Lỗi khi test API key"
      },
      { status: 500 }
    );
  }
}

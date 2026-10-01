import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/api";

/**
 * GET /api/admin/theme
 * Fetch the global theme configuration
 * Public endpoint - any user can read the theme
 */
export async function GET() {
  try {
    // Find the most recent theme (there should only be one)
    const systemTheme = await prisma.systemTheme.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!systemTheme) {
      // Return default theme if none exists
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        theme: systemTheme.theme,
        updatedAt: systemTheme.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error("Failed to fetch theme:", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/theme
 * Save the global theme configuration
 * Admin-only endpoint
 */
export async function POST(req: Request) {
  try {
    const session = await auth();

    // Check authentication and admin role
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Only admins can update the global theme" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { theme } = body;

    if (!theme || typeof theme !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Invalid theme data provided",
        },
        { status: 400 }
      );
    }

    // Validate required theme fields
    const requiredFields = ["backgroundType", "backgroundColor", "primaryColor", "accentColor"];
    for (const field of requiredFields) {
      if (!(field in theme)) {
        return NextResponse.json(
          {
            success: false,
            error: "VALIDATION_ERROR",
            message: `Missing required field: ${field}`,
          },
          { status: 400 }
        );
      }
    }

    // Delete all existing themes (we only keep one global theme)
    await prisma.systemTheme.deleteMany({});

    // Create new theme record
    const systemTheme = await prisma.systemTheme.create({
      data: {
        theme: theme,
        updatedBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        theme: systemTheme.theme,
        updatedAt: systemTheme.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error("Failed to save theme:", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}

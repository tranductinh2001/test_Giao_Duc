import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LicenseService } from "@/features/licenses/services/LicenseService";
import { ActivateLicenseSchema } from "@/features/licenses/schemas";
import { getErrorMessage } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ActivateLicenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Du lieu license khong hop le.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const service = new LicenseService();
    const result = await service.activateLicense(session.user.id, parsed.data.code);

    return NextResponse.json({
      success: true,
      data: {
        message: "Kich hoat license thanh cong",
        expiresAt: result.licenseExpiresAt,
        durationDays: result.durationDays,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message === "LICENSE_NOT_FOUND"
        ? "Không tìm thấy mã license."
        : error instanceof Error && error.message === "LICENSE_ALREADY_USED"
          ? "Mã license này đã được sử dụng."
          : error instanceof Error && error.message === "USER_NOT_FOUND"
            ? "Không tìm thấy tài khoản hiện tại."
            : error instanceof Error && error.message === "USER_LOCKED"
              ? "Tài khoản của bạn đã bị khóa."
              : getErrorMessage(error);

    const status =
      error instanceof Error && error.message === "LICENSE_NOT_FOUND"
        ? 404
        : error instanceof Error && error.message === "LICENSE_ALREADY_USED"
          ? 409
          : error instanceof Error && error.message === "USER_NOT_FOUND"
            ? 404
            : error instanceof Error && error.message === "USER_LOCKED"
              ? 403
              : 500;

    return NextResponse.json(
      { success: false, error: "LICENSE_ACTIVATION_FAILED", message },
      { status }
    );
  }
}

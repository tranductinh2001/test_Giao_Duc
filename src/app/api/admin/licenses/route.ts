import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LicenseService } from "@/features/licenses/services/LicenseService";
import { GenerateLicensesSchema } from "@/features/licenses/schemas";
import { getErrorMessage } from "@/lib/api";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const service = new LicenseService();
    const licenses = await service.listLicenses();
    return NextResponse.json({ success: true, data: licenses });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = GenerateLicensesSchema.safeParse({
      durationDays: Number(body.durationDays),
      count: Number(body.count),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Du lieu sinh license khong hop le.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const service = new LicenseService();
    await service.generateLicenses(parsed.data.durationDays, parsed.data.count);
    const licenses = await service.listLicenses();

    return NextResponse.json({
      success: true,
      data: licenses,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

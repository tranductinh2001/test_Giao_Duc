import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, apiRateLimit } from "@/lib/ratelimit";
import { getClientInfo } from "@/lib/security";
import { logSecurityEvent, SecurityEvent } from "@/lib/audit";
import { auth } from "@/auth";

export async function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const session = await auth();
    const { ipAddress, userAgent } = getClientInfo(req);
    const identifier = session?.user?.id || ipAddress;

    // Check rate limit
    const { success, reset } = await checkRateLimit(apiRateLimit, identifier);

    if (!success) {
      await logSecurityEvent({
        userId: session?.user?.id,
        event: SecurityEvent.RATE_LIMIT_EXCEEDED,
        details: { operation: "api_call", path: req.nextUrl.pathname, identifier },
        ipAddress,
        userAgent,
        success: false,
      });

      return NextResponse.json(
        {
          success: false,
          error: "RATE_LIMIT_EXCEEDED",
          message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${Math.ceil((reset - Date.now()) / 1000)} giây.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      );
    }

    return handler(req);
  };
}

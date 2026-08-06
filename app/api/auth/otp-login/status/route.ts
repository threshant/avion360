import { NextResponse } from "next/server";
import { getOtpLoginConfig } from "@/lib/otp-login-config";

/** GET /api/auth/otp-login/status — public; used by login page */
export async function GET() {
  try {
    const config = await getOtpLoginConfig();
    return NextResponse.json({
      enabled: config.enabled,
      configured: config.configured,
      active: config.enabled && config.configured,
    });
  } catch (err) {
    console.error("otp-login status error:", err);
    return NextResponse.json({
      enabled: false,
      configured: false,
      active: false,
    });
  }
}

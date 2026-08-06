import { NextRequest, NextResponse } from "next/server";
import {
  getSystemSetting,
  updateSystemSetting,
} from "@/services/systemSettingsService";
import { getOtpLoginConfig } from "@/lib/otp-login-config";

const SETTING_KEY = "otp_login_enabled";

/** GET /api/settings/otp-login */
export async function GET() {
  try {
    const config = await getOtpLoginConfig();
    return NextResponse.json({
      enabled: config.enabled,
      configured: config.configured,
      active: config.enabled && config.configured,
    });
  } catch (err) {
    console.error("otp-login settings GET error:", err);
    return NextResponse.json({
      enabled: false,
      configured: false,
      active: false,
    });
  }
}

/** PUT /api/settings/otp-login */
export async function PUT(request: NextRequest) {
  try {
    let body: { enabled: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 },
      );
    }

    const existing = await getSystemSetting(SETTING_KEY);
    await updateSystemSetting(
      SETTING_KEY,
      String(body.enabled),
      "boolean",
      existing?.description ??
        "When enabled and MSG91 credentials are set, users can sign in with phone OTP on the login page.",
    );

    const config = await getOtpLoginConfig();
    return NextResponse.json({
      enabled: config.enabled,
      configured: config.configured,
      active: config.enabled && config.configured,
    });
  } catch (err) {
    console.error("otp-login settings PUT error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

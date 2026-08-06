import { NextRequest, NextResponse } from "next/server";
import { msg91SendOtp } from "@/lib/msg91";
import { requireOtpLoginActive } from "@/lib/otp-login-config";
import {
  canSendOtp,
  recordOtpSend,
  secondsUntilResend,
} from "@/lib/otp-rate-limit";
import { findActiveUserByPhone } from "@/lib/find-user-by-phone";
import { isValidIndianMobile, normalizePhoneE164 } from "@/lib/phone";

/** POST /api/auth/otp/send — send OTP via MSG91 */
export async function POST(request: NextRequest) {
  try {
    const gate = await requireOtpLoginActive();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const body = await request.json();
    const phone = String(body?.phone ?? "").trim();
    const mobile = normalizePhoneE164(phone);

    if (!isValidIndianMobile(mobile)) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit Indian mobile number" },
        { status: 400 },
      );
    }

    const user = await findActiveUserByPhone(mobile);
    if (!user) {
      return NextResponse.json(
        { error: "No account found for this phone number" },
        { status: 404 },
      );
    }

    if (!canSendOtp(mobile)) {
      return NextResponse.json(
        {
          error: "Please wait before requesting another OTP",
          retryAfterSeconds: secondsUntilResend(mobile),
        },
        { status: 429 },
      );
    }

    const result = await msg91SendOtp(mobile, gate.config);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }

    recordOtpSend(mobile);
    return NextResponse.json({
      message: "OTP sent successfully",
      retryAfterSeconds: 60,
    });
  } catch (error) {
    console.error("OTP send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

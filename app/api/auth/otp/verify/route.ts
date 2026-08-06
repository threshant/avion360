import {
  buildLoginResponse,
  createLoginNextResponse,
} from "@/lib/auth-session";
import { findActiveUserByPhone } from "@/lib/find-user-by-phone";
import { msg91VerifyOtp } from "@/lib/msg91";
import { requireOtpLoginActive } from "@/lib/otp-login-config";
import { isValidIndianMobile, normalizePhoneE164 } from "@/lib/phone";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { resolveActiveTenantForUser } from "@/lib/tenant-auth";
import { NextRequest, NextResponse } from "next/server";

/** POST /api/auth/otp/verify — verify OTP and sign in */
export async function POST(request: NextRequest) {
  try {
    const gate = await requireOtpLoginActive();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const body = await request.json();
    const phone = String(body?.phone ?? "").trim();
    const otp = String(body?.otp ?? "").trim();
    const mobile = normalizePhoneE164(phone);

    if (!isValidIndianMobile(mobile)) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit Indian mobile number" },
        { status: 400 },
      );
    }

    if (!/^\d{4,8}$/.test(otp)) {
      return NextResponse.json({ error: "Enter a valid OTP" }, { status: 400 });
    }

    const user = await findActiveUserByPhone(mobile);
    if (!user) {
      return NextResponse.json(
        { error: "No account found for this phone number" },
        { status: 404 },
      );
    }

    const verifyResult = await msg91VerifyOtp(mobile, otp, gate.config.authKey);
    if (!verifyResult.ok) {
      return NextResponse.json(
        { error: verifyResult.message },
        { status: 401 },
      );
    }

    const supabase = createServerSupabaseClient();
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    const tenantId = await resolveActiveTenantForUser(
      supabase,
      {
        id: String(user.id),
        name:
          typeof user.name === "string" && user.name.trim() ? user.name : null,
      },
      typeof body?.tenantId === "string" ? body.tenantId : null,
    );

    const response = buildLoginResponse(
      user as Record<string, unknown>,
      tenantId,
    );
    return createLoginNextResponse(response);
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

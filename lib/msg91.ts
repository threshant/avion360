import type { OtpLoginConfig } from "@/lib/otp-login-config";

const MSG91_OTP_BASE = "https://control.msg91.com/api/v5/otp";

type Msg91Result = { ok: true } | { ok: false; message: string };

function extractMsg91Message(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "MSG91 request failed";
  const data = payload as Record<string, unknown>;
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  return "MSG91 request failed";
}

function isMsg91Success(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const data = payload as Record<string, unknown>;
  const type = String(data.type ?? "").toLowerCase();
  if (type === "success") return true;
  const message = String(data.message ?? "").toLowerCase();
  return (
    message.includes("otp sent") ||
    message.includes("number_verified") ||
    message.includes("verified")
  );
}

export async function msg91SendOtp(
  mobileE164: string,
  config: Pick<OtpLoginConfig, "authKey" | "templateId" | "otpLength" | "otpExpiryMinutes">,
): Promise<Msg91Result> {
  const url = new URL(MSG91_OTP_BASE);
  url.searchParams.set("template_id", config.templateId);
  url.searchParams.set("mobile", mobileE164);
  url.searchParams.set("otp_length", String(config.otpLength));
  url.searchParams.set("otp_expiry", String(config.otpExpiryMinutes));

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      authkey: config.authKey,
      "Content-Type": "application/json",
    },
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok || !isMsg91Success(payload)) {
    return { ok: false, message: extractMsg91Message(payload) };
  }

  return { ok: true };
}

export async function msg91VerifyOtp(
  mobileE164: string,
  otp: string,
  authKey: string,
): Promise<Msg91Result> {
  const url = new URL(`${MSG91_OTP_BASE}/verify`);
  url.searchParams.set("mobile", mobileE164);
  url.searchParams.set("otp", otp.trim());

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      authkey: authKey,
      accept: "application/json",
    },
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok || !isMsg91Success(payload)) {
    return { ok: false, message: extractMsg91Message(payload) };
  }

  return { ok: true };
}

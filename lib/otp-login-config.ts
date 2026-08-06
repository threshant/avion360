import {
  getSystemSetting,
  getSystemSettings,
} from "@/services/systemSettingsService";

export type OtpLoginConfig = {
  enabled: boolean;
  authKey: string;
  templateId: string;
  otpLength: number;
  otpExpiryMinutes: number;
  configured: boolean;
};

const ENABLED_KEY = "otp_login_enabled";
const AUTH_KEY = "MSG91_AUTH_KEY";
const TEMPLATE_KEY = "MSG91_TEMPLATE_ID";
const OTP_LENGTH_KEY = "MSG91_OTP_LENGTH";
const OTP_EXPIRY_KEY = "MSG91_OTP_EXPIRY";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export async function getOtpLoginConfig(): Promise<OtpLoginConfig> {
  const settings = await getSystemSettings([
    ENABLED_KEY,
    AUTH_KEY,
    TEMPLATE_KEY,
    OTP_LENGTH_KEY,
    OTP_EXPIRY_KEY,
  ]);

  const byKey = (key: string) => settings.find((s) => s.key === key)?.value;

  const authKey =
    byKey(AUTH_KEY)?.trim() || process.env.MSG91_AUTH_KEY?.trim() || "";
  const templateId =
    byKey(TEMPLATE_KEY)?.trim() || process.env.MSG91_TEMPLATE_ID?.trim() || "";

  const enabled =
    parseBoolean(byKey(ENABLED_KEY), false) ||
    parseBoolean(process.env.OTP_LOGIN_ENABLED, false);

  const otpLength = parsePositiveInt(byKey(OTP_LENGTH_KEY), 6);
  const otpExpiryMinutes = parsePositiveInt(byKey(OTP_EXPIRY_KEY), 5);

  return {
    enabled,
    authKey,
    templateId,
    otpLength,
    otpExpiryMinutes,
    configured: Boolean(authKey && templateId),
  };
}

export async function isOtpLoginActive(): Promise<boolean> {
  const config = await getOtpLoginConfig();
  return config.enabled && config.configured;
}

export async function requireOtpLoginActive(): Promise<
  | { ok: true; config: OtpLoginConfig }
  | { ok: false; status: number; error: string }
> {
  const config = await getOtpLoginConfig();

  if (!config.enabled) {
    return {
      ok: false,
      status: 403,
      error: "Phone OTP login is not enabled",
    };
  }

  if (!config.configured) {
    return {
      ok: false,
      status: 503,
      error: "MSG91 credentials are not configured",
    };
  }

  return { ok: true, config };
}

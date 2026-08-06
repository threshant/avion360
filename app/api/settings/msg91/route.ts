import { NextResponse } from "next/server";
import {
  getSystemSetting,
  updateSystemSetting,
} from "@/services/systemSettingsService";

const ALLOWED_KEYS = [
  "MSG91_AUTH_KEY",
  "MSG91_TEMPLATE_ID",
  "MSG91_OTP_LENGTH",
  "MSG91_OTP_EXPIRY",
] as const;

/** GET /api/settings/msg91?key=MSG91_AUTH_KEY */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key || !ALLOWED_KEYS.includes(key as (typeof ALLOWED_KEYS)[number])) {
      return NextResponse.json({ error: "Invalid or missing key" }, { status: 400 });
    }

    const setting = await getSystemSetting(key);
    return NextResponse.json({ data: setting ?? null });
  } catch (err) {
    console.error("msg91 settings GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

/** POST /api/settings/msg91 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value, description } = body;

    if (!key || value === undefined || value === null) {
      return NextResponse.json(
        { error: "Missing key or value" },
        { status: 400 },
      );
    }

    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json({ error: "Invalid setting key" }, { status: 400 });
    }

    const type =
      key === "MSG91_OTP_LENGTH" || key === "MSG91_OTP_EXPIRY"
        ? "number"
        : "string";

    const updated = await updateSystemSetting(
      key,
      String(value).trim(),
      type,
      description,
    );

    return NextResponse.json({
      data: updated,
      message: `Setting ${key} updated successfully`,
    });
  } catch (err) {
    console.error("msg91 settings POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

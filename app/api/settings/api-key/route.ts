import { getUserIdFromRequest } from "@/lib/auth-middleware";
import {
  getSystemSetting,
  updateSystemSetting,
} from "@/services/systemSettingsService";
import { NextRequest, NextResponse } from "next/server";

const API_KEY_SETTING = "CRM_PUBLIC_API_KEY";

function generateApiKey() {
  return `sk_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setting = await getSystemSetting(API_KEY_SETTING);
    const value = setting?.value || "";
    return NextResponse.json({ data: { apiKey: value } });
  } catch (error) {
    console.error("Failed to get API key:", error);
    return NextResponse.json(
      { error: "Failed to get API key" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const regenerate = Boolean(body.regenerate);
    const nextValue = regenerate ? generateApiKey() : String(body.apiKey || "");

    const saved = await updateSystemSetting(
      API_KEY_SETTING,
      nextValue,
      "string",
      "CRM API key for API & Webhooks settings section",
    );

    return NextResponse.json({ data: { apiKey: saved.value } });
  } catch (error) {
    console.error("Failed to update API key:", error);
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 },
    );
  }
}

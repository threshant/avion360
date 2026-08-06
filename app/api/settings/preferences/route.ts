import { getUserIdFromRequest } from "@/lib/auth-middleware";
import {
  getSystemSettings,
  updateSystemSetting,
} from "@/services/systemSettingsService";
import { NextRequest, NextResponse } from "next/server";

function keyFor(userId: string, key: string) {
  return `USER_${userId}_${key}`;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = [
      keyFor(userId, "EMAIL_NOTIF"),
      keyFor(userId, "WP_NOTIF"),
      keyFor(userId, "CALL_NOTIF"),
      keyFor(userId, "LEAD_NOTIF"),
      keyFor(userId, "THEME"),
      keyFor(userId, "COMPACT_MODE"),
      keyFor(userId, "LANGUAGE"),
      keyFor(userId, "WEBHOOK_URL"),
    ];

    const settings = await getSystemSettings(keys);
    const valueOf = (k: string) => settings.find((s) => s.key === k)?.value;

    return NextResponse.json({
      data: {
        emailNotif: valueOf(keyFor(userId, "EMAIL_NOTIF")) !== "false",
        wpNotif: valueOf(keyFor(userId, "WP_NOTIF")) !== "false",
        callNotif: valueOf(keyFor(userId, "CALL_NOTIF")) !== "false",
        leadNotif: valueOf(keyFor(userId, "LEAD_NOTIF")) !== "false",
        theme: valueOf(keyFor(userId, "THEME")) || "Light",
        compactMode: valueOf(keyFor(userId, "COMPACT_MODE")) === "true",
        language: valueOf(keyFor(userId, "LANGUAGE")) || "English",
        webhookUrl: valueOf(keyFor(userId, "WEBHOOK_URL")) || "",
      },
    });
  } catch (error) {
    console.error("Failed to load user preferences:", error);
    return NextResponse.json(
      { error: "Failed to load user preferences" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates = [
      updateSystemSetting(
        keyFor(userId, "EMAIL_NOTIF"),
        String(Boolean(body.emailNotif)),
        "boolean",
      ),
      updateSystemSetting(
        keyFor(userId, "WP_NOTIF"),
        String(Boolean(body.wpNotif)),
        "boolean",
      ),
      updateSystemSetting(
        keyFor(userId, "CALL_NOTIF"),
        String(Boolean(body.callNotif)),
        "boolean",
      ),
      updateSystemSetting(
        keyFor(userId, "LEAD_NOTIF"),
        String(Boolean(body.leadNotif)),
        "boolean",
      ),
      updateSystemSetting(
        keyFor(userId, "THEME"),
        String(body.theme || "Light"),
        "string",
      ),
      updateSystemSetting(
        keyFor(userId, "COMPACT_MODE"),
        String(Boolean(body.compactMode)),
        "boolean",
      ),
      updateSystemSetting(
        keyFor(userId, "LANGUAGE"),
        String(body.language || "English"),
        "string",
      ),
      updateSystemSetting(
        keyFor(userId, "WEBHOOK_URL"),
        String(body.webhookUrl || ""),
        "string",
      ),
    ];

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save user preferences:", error);
    return NextResponse.json(
      { error: "Failed to save user preferences" },
      { status: 500 },
    );
  }
}

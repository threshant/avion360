import { NextResponse } from "next/server";
import {
  getSystemSetting,
  updateSystemSetting,
} from "@/services/systemSettingsService";

/**
 * GET /api/settings/aviontive
 * Fetch Aviontive API configuration
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Missing key parameter" },
        { status: 400 },
      );
    }

    const setting = await getSystemSetting(key);

    if (!setting) {
      return NextResponse.json({ data: null }, { status: 200 });
    }

    return NextResponse.json({
      data: setting,
    });
  } catch (err) {
    console.error("Error fetching setting:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/settings/aviontive
 * Update Aviontive API configuration
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value, description } = body;

    if (!key || !value) {
      return NextResponse.json(
        { error: "Missing key or value" },
        { status: 400 },
      );
    }

    // Validate key is one of the allowed settings
    const allowedKeys = [
      "AVIONTIVE_API_KEY",
      "AVIONTIVE_BRAND_ID",
      "AVIONTIVE_API_BASE_URL",
    ];

    if (!allowedKeys.includes(key)) {
      return NextResponse.json(
        { error: "Invalid setting key" },
        { status: 400 },
      );
    }

    const updated = await updateSystemSetting(
      key,
      value,
      "string",
      description,
    );

    return NextResponse.json({
      data: updated,
      message: `Setting ${key} updated successfully`,
    });
  } catch (err) {
    console.error("Error updating setting:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

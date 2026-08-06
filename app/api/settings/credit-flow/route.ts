import { NextRequest, NextResponse } from "next/server";
import {
  getSystemSetting,
  updateSystemSetting,
} from "@/services/systemSettingsService";

const SETTING_KEY = "credit_flow_enabled";

// ── GET /api/settings/credit-flow ─────────────────────────────────────────────

export async function GET() {
  try {
    const setting = await getSystemSetting(SETTING_KEY);
    const enabled = setting ? setting.value === "true" : true;
    return NextResponse.json({ enabled });
  } catch (err) {
    console.error("credit-flow GET error:", err);
    return NextResponse.json({ enabled: true });
  }
}

// ── PUT /api/settings/credit-flow ─────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    let body: { enabled: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
    }

    await updateSystemSetting(
      SETTING_KEY,
      String(body.enabled),
      "boolean",
      "When true, manual cash-balance credits appear in Finance totals and transaction history.",
    );

    return NextResponse.json({ enabled: body.enabled });
  } catch (err) {
    console.error("credit-flow PUT error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DEPRECATED — Superfone webhook endpoint.
 *
 * This endpoint is no longer active. The CRM has migrated to TeleCMI.
 * Configure the TeleCMI webhook URL in your TeleCMI dashboard to point to:
 *   POST /api/webhooks/telecmi
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Superfone integration has been removed. Please use the TeleCMI webhook at /api/webhooks/telecmi.",
    },
    { status: 410 },
  );
}

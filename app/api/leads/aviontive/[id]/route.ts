import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.AVIONTIVE_API_BASE_URL;
const apiKey = process.env.AVIONTIVE_API_KEY;
const brandId = process.env.AVIONTIVE_BRAND_ID;

function validateConfig() {
  if (!baseUrl || !apiKey || !brandId) {
    console.error("Missing Aviontive API configuration");
    return NextResponse.json(
      { error: "Missing API configuration" },
      { status: 500 },
    );
  }
  return null;
}

/**
 * GET /api/leads/aviontive/:id
 * Retrieves a single lead by ID with full details (lead sheet).
 * Includes linked conversation, contact, stage, labels, tasks, amount, currency, and temperature.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const configError = validateConfig();
    if (configError) return configError;

    const leadId = id;

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 },
      );
    }

    const url = `${baseUrl}/leads/leads/${leadId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey!,
        "X-Brand-ID": brandId!,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Aviontive API Error:", response.status, errorData);
      return NextResponse.json(
        { error: errorData.error || `Aviontive API Error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch Aviontive lead:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/leads/aviontive/:id
 * Updates a lead's details — title, notes, amount, currency, temperature, contact, and/or stage.
 *
 * Request body fields (all optional):
 * - title: string
 * - notes: string
 * - amount: number | null
 * - currency: string
 * - temperature: "cold" | "warm" | "hot"
 * - contact_id: string | null
 * - stage_id: string
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const configError = validateConfig();
    if (configError) return configError;

    const leadId = id;

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const url = `${baseUrl}/leads/leads/${leadId}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey!,
        "X-Brand-ID": brandId!,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Aviontive API Error:", response.status, errorData);
      return NextResponse.json(
        { error: errorData.error || `Aviontive API Error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to update Aviontive lead:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 },
    );
  }
}

import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { getSystemSettings } from "@/services/systemSettingsService";
import { NextRequest, NextResponse } from "next/server";

type AviontiveConfig = { baseUrl: string; apiKey: string; brandId: string };

const cachedConfigByTenant = new Map<string, AviontiveConfig>();
const cacheTimeByTenant = new Map<string, number>();

async function getAviontiveConfig(tenantId: string) {
  // Use cache for 1 minute to avoid constant database queries
  const now = Date.now();
  const cachedConfig = cachedConfigByTenant.get(tenantId);
  const cacheTime = cacheTimeByTenant.get(tenantId) || 0;
  if (cachedConfig && now - cacheTime < 60000) {
    return cachedConfig;
  }

  let baseUrl = process.env.AVIONTIVE_API_BASE_URL;
  let apiKey = process.env.AVIONTIVE_API_KEY;
  let brandId = process.env.AVIONTIVE_BRAND_ID;

  // Try to fetch from database
  try {
    const settings = await getSystemSettings(
      ["AVIONTIVE_API_KEY", "AVIONTIVE_BRAND_ID", "AVIONTIVE_API_BASE_URL"],
      tenantId,
    );

    if (settings.length > 0) {
      const apiKeySetting = settings.find((s) => s.key === "AVIONTIVE_API_KEY");
      const brandIdSetting = settings.find(
        (s) => s.key === "AVIONTIVE_BRAND_ID",
      );
      const baseUrlSetting = settings.find(
        (s) => s.key === "AVIONTIVE_API_BASE_URL",
      );

      apiKey = apiKeySetting?.value || apiKey;
      brandId = brandIdSetting?.value || brandId;
      baseUrl = baseUrlSetting?.value || baseUrl;
    }
  } catch (err) {
    console.error(
      "Failed to fetch settings from database, using env vars:",
      err,
    );
  }

  const resolvedConfig = {
    baseUrl: baseUrl || "",
    apiKey: apiKey || "",
    brandId: brandId || "",
  };
  cachedConfigByTenant.set(tenantId, resolvedConfig);
  cacheTimeByTenant.set(tenantId, now);
  return resolvedConfig;
}

async function validateConfig(tenantId: string) {
  const { baseUrl, apiKey, brandId } = await getAviontiveConfig(tenantId);
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
 * GET /api/leads/aviontive
 * Fetch leads from Aviontive API
 * This is a server-side route that handles communication with Aviontive
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const configError = await validateConfig(tenantId);
    if (configError) return configError;

    const { baseUrl, apiKey, brandId } = await getAviontiveConfig(tenantId);

    const url = new URL(`${baseUrl}/leads/leads`);
    // forward pagination params if provided, enforcing max pageSize
    const { parsePagination } = await import("@/lib/pagination");
    const { page, pageSize } = parsePagination(request.nextUrl.searchParams);
    // Append only if present or defaulted
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Brand-ID": brandId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Aviontive API Error:", response.status, errorData);
      return NextResponse.json(
        { error: `Aviontive API Error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    // If upstream returns full list and doesn't support pagination, slice here as a fallback
    if (Array.isArray(data) || Array.isArray(data?.data)) {
      const items = Array.isArray(data) ? data : data.data;
      const { parsePagination } = await import("@/lib/pagination");
      const {
        page: p,
        pageSize: ps,
        from,
        to,
      } = parsePagination(request.nextUrl.searchParams);
      const sliced = items.slice(from, to + 1);
      return NextResponse.json({
        data: sliced,
        total: items.length,
        page: p,
        pageSize: ps,
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error("Failed to fetch Aviontive leads:", errorMsg);

    // Return empty leads list with error info for graceful fallback
    return NextResponse.json(
      {
        data: [],
        total: 0,
        page: 1,
        pageSize: 50,
        error: "Aviontive API unavailable",
        details: errorMsg.includes("ENOTFOUND")
          ? "Cannot reach Aviontive server - check API configuration"
          : errorMsg,
      },
      { status: 503 },
    );
  }
}

/**
 * PATCH /api/leads/aviontive
 * Updates a lead's stage (move between pipeline stages).
 *
 * Request body:
 * {
 *   "lead_id": string,
 *   "stage_id": string
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const configError = await validateConfig(tenantId);
    if (configError) return configError;

    const { baseUrl, apiKey, brandId } = await getAviontiveConfig(tenantId);

    const body = await request.json();

    if (!body.lead_id || !body.stage_id) {
      return NextResponse.json(
        { error: "lead_id and stage_id are required" },
        { status: 400 },
      );
    }

    const url = `${baseUrl}/leads/leads`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Brand-ID": brandId,
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
    console.error("Failed to update Aviontive lead stage:", error);
    return NextResponse.json(
      { error: "Failed to update lead stage" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/leads/aviontive
 * Creates a new lead in Aviontive so it appears in the Aviontive leads list.
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const configError = await validateConfig(tenantId);
    if (configError) return configError;

    const { baseUrl, apiKey, brandId } = await getAviontiveConfig(tenantId);
    const body = await request.json();
    const requestId = `aviontive-create-${Date.now()}`;

    console.log(`[${requestId}] POST /api/leads/aviontive incoming`, {
      keys: Object.keys(body || {}),
    });

    const response = await fetch(`${baseUrl}/leads/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Brand-ID": brandId,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`[${requestId}] Aviontive create error`, {
        status: response.status,
        data,
      });
      return NextResponse.json(
        {
          error:
            (data as any)?.error || `Aviontive API Error: ${response.status}`,
        },
        { status: response.status },
      );
    }

    console.log(`[${requestId}] Aviontive create success`);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Failed to create Aviontive lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead in Aviontive" },
      { status: 500 },
    );
  }
}

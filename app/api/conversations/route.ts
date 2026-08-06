import { getSystemSettings } from "@/services/systemSettingsService";
import { NextRequest, NextResponse } from "next/server";

let cachedConfig: { baseUrl: string; apiKey: string; brandId: string } | null =
  null;
let cacheTime = 0;

function normalizeValue(value: string | undefined): string {
  return (value || "").trim();
}

function pickPreferred(
  primary: string | undefined,
  fallback: string | undefined,
): string {
  return normalizeValue(primary) || normalizeValue(fallback);
}

function getAuthorizationHeader(request: NextRequest): string | null {
  const incomingAuth = request.headers.get("authorization")?.trim();
  if (incomingAuth) return incomingAuth;

  const authCookie = request.cookies.get("auth-token")?.value;
  if (!authCookie) return null;

  try {
    const decoded = decodeURIComponent(authCookie).trim();
    if (!decoded) return null;
    return `Bearer ${decoded}`;
  } catch {
    const raw = authCookie.trim();
    return raw ? `Bearer ${raw}` : null;
  }
}

function buildUpstreamHeaders(
  apiKey: string,
  brandId: string,
  authorization?: string | null,
): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    "X-Brand-ID": brandId,
  };
}

async function getAviontiveConfig() {
  const now = Date.now();
  if (cachedConfig && now - cacheTime < 60000) {
    return cachedConfig;
  }

  let baseUrl = process.env.AVIONTIVE_API_BASE_URL;
  let apiKey = process.env.AVIONTIVE_API_KEY;
  let brandId = process.env.AVIONTIVE_BRAND_ID;

  try {
    const settings = await getSystemSettings([
      "AVIONTIVE_API_KEY",
      "AVIONTIVE_BRAND_ID",
      "AVIONTIVE_API_BASE_URL",
    ]);

    if (settings.length > 0) {
      const dbApiKey = settings.find(
        (setting) => setting.key === "AVIONTIVE_API_KEY",
      )?.value;
      const dbBrandId = settings.find(
        (setting) => setting.key === "AVIONTIVE_BRAND_ID",
      )?.value;
      const dbBaseUrl = settings.find(
        (setting) => setting.key === "AVIONTIVE_API_BASE_URL",
      )?.value;

      apiKey = pickPreferred(apiKey, dbApiKey);
      brandId = pickPreferred(brandId, dbBrandId);
      baseUrl = pickPreferred(baseUrl, dbBaseUrl);
    }
  } catch (error) {
    console.error(
      "Failed to fetch Aviontive settings from database, using env vars:",
      error,
    );
  }

  cachedConfig = {
    baseUrl: normalizeValue(baseUrl).replace(/\/$/, ""),
    apiKey: normalizeValue(apiKey),
    brandId: normalizeValue(brandId),
  };
  cacheTime = now;
  return cachedConfig;
}

async function validateConfig() {
  const { baseUrl, apiKey, brandId } = await getAviontiveConfig();
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
 * GET /api/conversations
 * List all conversations for the brand.
 *
 * Query params:
 *   brand_id (optional) - filter by brand; resolved from auth context if omitted.
 */
export async function GET(request: NextRequest) {
  try {
    const configError = await validateConfig();
    if (configError) return configError;

    const { baseUrl, apiKey, brandId } = await getAviontiveConfig();
    const authorization = getAuthorizationHeader(request);

    const conversationId = request.nextUrl.searchParams.get("id")?.trim();

    if (conversationId) {
      // Detail endpoint: GET /api/conversations?id=<conversation-id>
      const upstreamUrl = new URL(`${baseUrl}/conversations/${conversationId}`);
      request.nextUrl.searchParams.forEach((value, key) => {
        if (key !== "id") {
          upstreamUrl.searchParams.set(key, value);
        }
      });

      let response = await fetch(upstreamUrl.toString(), {
        method: "GET",
        headers: buildUpstreamHeaders(apiKey, brandId, authorization),
      });

      if (response.status === 401) {
        const retryUrl = new URL(upstreamUrl.toString());
        retryUrl.searchParams.set("api_key", apiKey);
        response = await fetch(retryUrl.toString(), {
          method: "GET",
          headers: buildUpstreamHeaders(apiKey, brandId),
        });
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("Aviontive conversation detail GET error:", {
          status: response.status,
          data,
        });

        return NextResponse.json(
          {
            error:
              (data as { error?: string }).error ||
              `Aviontive API Error: ${response.status}`,
          },
          { status: response.status },
        );
      }

      return NextResponse.json(data);
    }

    // List endpoint: GET /api/conversations?brand_id=<brand-id>
    const upstreamUrl = new URL(`${baseUrl}/conversations`);
    request.nextUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value);
    });

    if (!upstreamUrl.searchParams.has("brand_id")) {
      upstreamUrl.searchParams.set("brand_id", brandId);
    }

    console.log(
      "Fetching conversations from Aviontive API:",
      upstreamUrl.toString(),
    );

    console.log(
      "Using headers:",
      buildUpstreamHeaders(apiKey, brandId, authorization),
    );

    let response = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: buildUpstreamHeaders(apiKey, brandId, authorization),
    });

    if (response.status === 401) {
      const retryUrl = new URL(upstreamUrl.toString());
      retryUrl.searchParams.set("api_key", apiKey);
      response = await fetch(retryUrl.toString(), {
        method: "GET",
        headers: buildUpstreamHeaders(apiKey, brandId),
      });
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Aviontive conversations list GET error:", {
        status: response.status,
        data,
      });

      return NextResponse.json(
        {
          error:
            (data as { error?: string }).error ||
            `Aviontive API Error: ${response.status}`,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 },
    );
  }
}

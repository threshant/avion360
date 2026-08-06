import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemSettings } from "@/services/systemSettingsService";
import { NextRequest, NextResponse } from "next/server";

type AviontiveLead = {
  id: string;
  brand_id?: string;
  pipeline_id?: string;
  stage_id?: string;
  conversation_id?: string;
  contact_id?: string;
  title?: string;
  notes?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
  stage?: {
    id?: string;
    name?: string;
    color?: string;
    position?: number;
  };
  conversation?: {
    id?: string;
    last_message_at?: string;
    channel_account?: {
      channel?: {
        name?: string;
      };
    };
    external_user?: {
      display_name?: string;
      contact?: {
        full_name?: string;
        email?: string;
        phone?: string;
      };
    };
  };
  labels?: Array<{
    system_label?: {
      name?: string;
    };
  }>;
};

const cachedConfigByTenant = new Map<
  string,
  { baseUrl: string; apiKey: string; brandId: string }
>();
const cacheTimeByTenant = new Map<string, number>();

async function getAviontiveConfig(tenantId?: string | null) {
  const cacheKey = tenantId || "__default__";
  const now = Date.now();
  const cachedConfig = cachedConfigByTenant.get(cacheKey);
  const cacheTime = cacheTimeByTenant.get(cacheKey) || 0;
  if (cachedConfig && now - cacheTime < 60000) {
    return cachedConfig;
  }

  let baseUrl = process.env.AVIONTIVE_API_BASE_URL;
  let apiKey = process.env.AVIONTIVE_API_KEY;
  let brandId = process.env.AVIONTIVE_BRAND_ID;

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
    console.error("Failed to read Aviontive settings from database:", err);
  }

  const resolvedConfig = {
    baseUrl: baseUrl || "",
    apiKey: apiKey || "",
    brandId: brandId || "",
  };
  cachedConfigByTenant.set(cacheKey, resolvedConfig);
  cacheTimeByTenant.set(cacheKey, now);

  return resolvedConfig;
}

function toTemperature(labels: AviontiveLead["labels"]): string {
  const names = (labels || [])
    .map((label) => (label.system_label?.name || "").toLowerCase())
    .filter(Boolean);

  if (names.some((name) => name.includes("hot"))) return "HOT";
  if (names.some((name) => name.includes("cold"))) return "COLD";
  return "WARM";
}

export async function POST(_request: NextRequest) {
  try {
    const currentUserId = getUserIdFromRequest(_request);
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = getTenantIdFromRequest(_request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const { baseUrl, apiKey, brandId } = await getAviontiveConfig(tenantId);
    if (!baseUrl || !apiKey || !brandId) {
      return NextResponse.json(
        { error: "Missing Aviontive API configuration" },
        { status: 500 },
      );
    }

    const response = await fetch(`${baseUrl}/leads/leads`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Brand-ID": brandId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            errorData.error ||
            errorData.message ||
            `Aviontive API Error: ${response.status}`,
        },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const leads: AviontiveLead[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    if (leads.length === 0) {
      return NextResponse.json(
        { synced: 0, message: "No leads returned by Aviontive" },
        { status: 200 },
      );
    }

    const upsertRows = leads.map((lead) => ({
      aviontive_lead_id: lead.id,
      brand_id: lead.brand_id || null,
      pipeline_id: lead.pipeline_id || null,
      stage_id: lead.stage_id || lead.stage?.id || null,
      conversation_id: lead.conversation_id || lead.conversation?.id || null,
      contact_id: lead.contact_id || null,
      title: lead.title || null,
      notes: lead.notes || null,
      source:
        lead.source ||
        lead.conversation?.channel_account?.channel?.name ||
        null,
      temperature: toTemperature(lead.labels),
      stage_name: lead.stage?.name || null,
      stage_color: lead.stage?.color || null,
      stage_position: lead.stage?.position ?? null,
      contact_full_name:
        lead.conversation?.external_user?.contact?.full_name ||
        lead.conversation?.external_user?.display_name ||
        null,
      contact_email: lead.conversation?.external_user?.contact?.email || null,
      contact_phone: lead.conversation?.external_user?.contact?.phone || null,
      channel_name: lead.conversation?.channel_account?.channel?.name || null,
      external_display_name:
        lead.conversation?.external_user?.display_name || null,
      last_message_at: lead.conversation?.last_message_at || null,
      labels: (lead.labels || [])
        .map((label) => label.system_label?.name)
        .filter(Boolean),
      raw_payload: lead,
      created_at_aviontive: lead.created_at || null,
      updated_at_aviontive: lead.updated_at || null,
      last_synced_at: new Date().toISOString(),
      tenant_id: tenantId,
    }));

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("leads")
      .upsert(upsertRows, { onConflict: "aviontive_lead_id" });

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        synced: upsertRows.length,
        message: "Leads synced successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to sync leads:", error);
    return NextResponse.json(
      { error: "Failed to sync leads" },
      { status: 500 },
    );
  }
}

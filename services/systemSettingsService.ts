/**
 * System settings management service
 * Handles reading and updating system configuration like API keys, Brand IDs
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export type SystemSettings = {
  id?: string;
  key: string;
  value: string;
  type: "string" | "number" | "boolean";
  tenant_id?: string | null;
  description?: string;
  created_at?: string;
  updated_at?: string;
};

/**
 * Fetch a system setting by key
 */
export async function getSystemSetting(key: string, tenantId?: string | null) {
  let query = supabase.from("system_settings").select("*").eq("key", key);
  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query.single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data as SystemSettings | null;
}

/**
 * Fetch multiple system settings
 */
export async function getSystemSettings(
  keys: string[],
  tenantId?: string | null,
) {
  let query = supabase.from("system_settings").select("*").in("key", keys);
  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data as SystemSettings[];
}

/**
 * Update or create a system setting
 */
export async function updateSystemSetting(
  key: string,
  value: string,
  type: SystemSettings["type"] = "string",
  description?: string,
  tenantId?: string | null,
) {
  const existing = await getSystemSetting(key, tenantId);

  if (existing) {
    let query = supabase
      .from("system_settings")
      .update({
        value,
        type,
        description: description || existing.description,
        updated_at: new Date().toISOString(),
      })
      .eq("key", key);

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query.select().single();

    if (error) {
      throw error;
    }

    return data as SystemSettings;
  } else {
    const { data, error } = await supabase
      .from("system_settings")
      .insert([
        {
          key,
          value,
          type,
          tenant_id: tenantId ?? null,
          description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as SystemSettings;
  }
}

/**
 * Get Aviontive API configuration
 */
export async function getAviontiveConfig(tenantId?: string | null) {
  const settings = await getSystemSettings(
    ["AVIONTIVE_API_KEY", "AVIONTIVE_BRAND_ID", "AVIONTIVE_API_BASE_URL"],
    tenantId,
  );

  return {
    apiKey: settings.find((s) => s.key === "AVIONTIVE_API_KEY")?.value,
    brandId: settings.find((s) => s.key === "AVIONTIVE_BRAND_ID")?.value,
    baseUrl: settings.find((s) => s.key === "AVIONTIVE_API_BASE_URL")?.value,
  };
}

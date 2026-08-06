import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

type AvionboxWebhookPayload = {
  event_id?: string;
  event_type?: string;
  triggered_at?: string;
  source?: string;
  brand_id?: string;
  conversation_id?: string;
  is_new_conversation?: boolean;
  message?: string;
  user_name?: string;
  user_id?: string;
  message_time?: string;
  conversation?: {
    id?: string;
    channel_account_id?: string;
    channel_id?: number;
    channel_name?: string;
    created_at?: string;
    last_message_at?: string;
  };
  user?: {
    id?: string;
    external_user_id?: string;
    username?: string;
    display_name?: string;
    profile_picture_url?: string;
  };
  message_object?: {
    id?: number;
    sender_type?: string;
    content?: string;
    message_type?: string;
    image_url?: string | null;
    description?: string | null;
    external_message_id?: string;
    created_at?: string;
    metadata?: Record<string, unknown>;
  };
};

function verifyWebhookSecret(req: NextRequest): boolean {
  const secret = process.env.AVIONBOX_WEBHOOK_SECRET;
  if (!secret) return true;

  const headerSecret =
    req.headers.get("x-webhook-secret") ||
    req.headers.get("x-avionbox-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get("secret");

  return headerSecret === secret || querySecret === secret;
}

function toIso(value: string | undefined | null): string | null {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function buildLeadId(payload: AvionboxWebhookPayload): string | null {
  const conversationId = payload.conversation?.id || payload.conversation_id;
  if (conversationId) return `avionbox:${conversationId}`;

  const userId =
    payload.user?.id || payload.user?.external_user_id || payload.user_id;
  const messageId =
    payload.message_object?.external_message_id ||
    (payload.message_object?.id ? String(payload.message_object.id) : null);

  if (userId && messageId) return `avionbox:${userId}:${messageId}`;
  if (payload.event_id) return `avionbox:event:${payload.event_id}`;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyWebhookSecret(req)) {
      return NextResponse.json(
        { error: "Invalid webhook secret" },
        { status: 401 },
      );
    }

    const payload = (await req.json()) as AvionboxWebhookPayload;
    const leadId = buildLeadId(payload);

    if (!leadId) {
      return NextResponse.json(
        {
          error:
            "Unable to derive lead id. Provide conversation.id/conversation_id or user+message identifiers.",
        },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();
    const brandId = payload.brand_id || null;
    const { data: tenantSetting } = brandId
      ? await supabase
          .from("system_settings")
          .select("tenant_id")
          .eq("key", "AVIONTIVE_BRAND_ID")
          .eq("value", brandId)
          .limit(1)
          .maybeSingle()
      : { data: null };

    const tenantId = tenantSetting?.tenant_id ?? null;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Unable to resolve tenant for Avionbox webhook brand_id" },
        { status: 422 },
      );
    }

    const source = payload.source || payload.conversation?.channel_name || null;
    const messageText =
      payload.message_object?.content ||
      payload.message ||
      payload.message_object?.description ||
      null;

    const contactName =
      payload.user?.display_name ||
      payload.user_name ||
      payload.user?.username ||
      "Avionbox Lead";

    const messageType = payload.message_object?.message_type || null;
    const labels = [
      "avionbox",
      source || undefined,
      messageType || undefined,
      payload.is_new_conversation ? "new_conversation" : undefined,
    ].filter((item): item is string => Boolean(item));

    const nowIso = new Date().toISOString();
    const row = {
      aviontive_lead_id: leadId,
      brand_id: payload.brand_id || null,
      pipeline_id: null,
      stage_id: null,
      conversation_id:
        payload.conversation?.id || payload.conversation_id || null,
      contact_id:
        payload.user?.id ||
        payload.user?.external_user_id ||
        payload.user_id ||
        null,
      title: contactName,
      notes: messageText,
      source,
      temperature: "WARM",
      stage_name: payload.is_new_conversation ? "New" : null,
      stage_color: null,
      stage_position: null,
      contact_full_name: contactName,
      contact_email: null,
      contact_phone: null,
      channel_id: payload.conversation?.channel_id
        ? String(payload.conversation.channel_id)
        : null,
      channel_name: payload.conversation?.channel_name || null,
      external_display_name: payload.user?.username || null,
      last_message_at:
        toIso(payload.message_time) ||
        toIso(payload.message_object?.created_at) ||
        toIso(payload.conversation?.last_message_at),
      labels,
      raw_payload: payload,
      created_at_aviontive:
        toIso(payload.conversation?.created_at) ||
        toIso(payload.message_object?.created_at) ||
        toIso(payload.triggered_at),
      updated_at_aviontive:
        toIso(payload.triggered_at) ||
        toIso(payload.message_time) ||
        toIso(payload.conversation?.last_message_at) ||
        nowIso,
      last_synced_at: nowIso,
      avionbox_event_id: payload.event_id || null,
      avionbox_event_type: payload.event_type || null,
      avionbox_source: payload.source || null,
      avionbox_message_id:
        payload.message_object?.external_message_id ||
        (payload.message_object?.id ? String(payload.message_object.id) : null),
      is_new_conversation: Boolean(payload.is_new_conversation),
      tenant_id: tenantId,
    };

    const { error } = await supabase
      .from("leads")
      .upsert(row, { onConflict: "aviontive_lead_id" });

    if (error) throw error;

    return NextResponse.json(
      {
        ok: true,
        action: "lead_upserted",
        lead_id: leadId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[POST /api/webhooks/avionbox]", error);
    return NextResponse.json(
      { error: "Failed to process Avionbox webhook" },
      { status: 500 },
    );
  }
}

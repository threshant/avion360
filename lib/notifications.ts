type NotificationCategory = "task" | "lead" | "attendance" | "payroll";

type NotificationPayload = {
  userId: string;
  tenantId?: string | null;
  title: string;
  message: string;
  category: NotificationCategory;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type SupabaseLike = {
  from: (table: string) => {
    insert: (data: unknown) => any;
  };
};

export async function createNotification(
  supabase: SupabaseLike,
  payload: NotificationPayload,
): Promise<void> {
  if (!payload.userId) return;

  const { error } = await supabase.from("notifications").insert({
    user_id: payload.userId,
    tenant_id: payload.tenantId ?? null,
    title: payload.title,
    message: payload.message,
    category: payload.category,
    event_type: payload.eventType,
    entity_type: payload.entityType ?? null,
    entity_id: payload.entityId ?? null,
    actor_user_id: payload.actorUserId ?? null,
    metadata: payload.metadata ?? null,
  });

  if (error) {
    console.error("[notifications] Failed to create notification", {
      error: error.message,
      payload,
    });
  }
}

export async function createNotificationsBulk(
  supabase: SupabaseLike,
  payloads: NotificationPayload[],
): Promise<void> {
  const rows = payloads
    .filter((p) => Boolean(p.userId))
    .map((p) => ({
      user_id: p.userId,
      tenant_id: p.tenantId ?? null,
      title: p.title,
      message: p.message,
      category: p.category,
      event_type: p.eventType,
      entity_type: p.entityType ?? null,
      entity_id: p.entityId ?? null,
      actor_user_id: p.actorUserId ?? null,
      metadata: p.metadata ?? null,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase.from("notifications").insert(rows);

  if (error) {
    console.error("[notifications] Failed to create bulk notifications", {
      error: error.message,
      rowsCount: rows.length,
    });
  }
}

import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { InventoryItem, InventoryStatus } from "@/types/inventory";
import { NextRequest } from "next/server";

// ── helpers ──────────────────────────────────────────────────────────────────

function toItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    clientId: (row.client_id as string) ?? undefined,
    commodity: row.commodity as string,
    description: (row.description as string) ?? undefined,
    cbm: Number(row.cbm),
    quantity: Number(row.quantity),
    unit: (row.unit as string) ?? undefined,
    packing: row.packing as string,
    warehouseId: row.warehouse_id as string,
    warehouseLocation: (row.warehouse_location as string) ?? undefined,
    staffId: (row.staff_id as string) ?? undefined,
    status: row.status as InventoryStatus,
    receivedDate: (row.received_date as string) ?? undefined,
    expectedDelivery: (row.expected_delivery as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    createdAt: (row.created_at as string) ?? undefined,
    updatedAt: (row.updated_at as string) ?? undefined,
  };
}

async function nextInventoryId(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  tenantId: string,
) {
  const { count } = await supabase
    .from("inventory_items")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  const n = (count ?? 0) + 1;
  return `INV${String(n).padStart(3, "0")}`;
}

// ── GET /api/inventory ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { searchParams } = request.nextUrl;

  const status = searchParams.get("status");
  const warehouseId = searchParams.get("warehouseId");
  const clientId = searchParams.get("clientId");
  const search = searchParams.get("search");
  const { parsePagination } = await import("@/lib/pagination");
  const { page, pageSize, from, to } = parsePagination(searchParams);

  let query = supabase
    .from("inventory_items")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (status) query = query.eq("status", status);
  if (warehouseId) query = query.eq("warehouse_id", warehouseId);
  if (clientId) query = query.eq("client_id", clientId);
  if (search) {
    query = query.or(`commodity.ilike.%${search}%,id.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[inventory GET]", error);
    return Response.json(
      {
        error: "Unable to load inventory items. Please try again.",
        userFriendly: true,
      },
      { status: 500 },
    );
  }

  // Calculate actual max pages based on total count
  const totalCount = count ?? 0;
  const maxPages = Math.ceil(totalCount / pageSize) || 1;
  const actualPage = Math.max(1, Math.min(page, maxPages));

  return Response.json({
    data: (data ?? []).map(toItem),
    total: totalCount,
    page: actualPage,
    pageSize,
    maxPages,
  });
}

// ── POST /api/inventory ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  // Validate required fields
  const errors: string[] = [];

  if (!body.commodity || typeof body.commodity !== "string") {
    errors.push("Commodity is required");
  }

  if (!body.packing || typeof body.packing !== "string") {
    errors.push("Packing information is required");
  }

  if (!body.warehouseId) {
    errors.push("Please select a warehouse");
  }

  if (errors.length > 0) {
    return Response.json(
      {
        error: errors.join(". ") + ".",
        userFriendly: true,
      },
      { status: 400 },
    );
  }

  // Validate status if provided
  const validStatuses = [
    "In Stock",
    "Out for Delivery",
    "Processing",
    "Reserved",
    "Out of Stock",
  ];
  if (body.status && !validStatuses.includes(body.status)) {
    return Response.json(
      {
        error: "Invalid status selected. Please select a valid status.",
        userFriendly: true,
      },
      { status: 400 },
    );
  }

  const id = await nextInventoryId(supabase, tenantId);

  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      id,
      client_id: body.clientId ?? null,
      commodity: body.commodity,
      description: body.description ?? null,
      cbm: body.cbm ?? 0,
      quantity: body.quantity ?? 0,
      unit: body.unit ?? null,
      packing: body.packing,
      warehouse_id: body.warehouseId,
      warehouse_location: body.warehouseLocation ?? null,
      staff_id: body.staffId ?? null,
      status: body.status ?? "In Stock",
      received_date: body.receivedDate ?? null,
      expected_delivery: body.expectedDelivery ?? null,
      notes: body.notes ?? null,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    console.error("[inventory POST] Database Error:", {
      message: error.message,
      details: error.details || error.hint || "",
      code: (error as any).code,
      fullError: error,
    });

    // User-friendly error message mapping
    let userMessage = "Failed to save inventory item. Please try again.";

    if (error.message.includes("warehouse")) {
      userMessage =
        "The selected warehouse is invalid. Please select a valid warehouse.";
    } else if (error.message.includes("client")) {
      userMessage =
        "The selected client is invalid. Please select a valid client.";
    } else if (error.message.includes("staff")) {
      userMessage =
        "The selected staff member is invalid. Please select a valid staff member.";
    } else if (
      error.message.includes("duplicate") ||
      error.message.includes("unique")
    ) {
      userMessage =
        "An item with similar details already exists. Please check your entries.";
    } else if (
      error.message.includes("not found") ||
      error.message.includes("does not exist")
    ) {
      userMessage =
        "One of the selected items does not exist. Please refresh and try again.";
    }

    return Response.json(
      {
        error: userMessage,
        // Include technical details for debugging (frontend logs this)
        details: {
          message: error.message,
          code: (error as any).code,
          hint: error.hint || "Check server logs for more details",
        },
        userFriendly: true,
      },
      { status: 500 },
    );
  }

  return Response.json({ data: toItem(data) }, { status: 201 });
}

import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { mapDbRowToCallRecord } from "@/lib/calls";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

const TABLE_NAME = "calls";

export async function GET(req: NextRequest) {
  try {
    console.log("[GET /api/calls] Fetching call records from Supabase...");
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    let query = supabase
      .from(TABLE_NAME)
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId);

    if (type) query = query.eq("call_type", type);
    if (status) query = query.eq("status", status);
    if (assignedTo) query = query.ilike("assigned_to_name", `%${assignedTo}%`);
    if (dateFrom) query = query.gte("cdr_start", dateFrom);
    if (dateTo) query = query.lte("cdr_start", dateTo);
    if (search) {
      query = query.or(
        `caller_name.ilike.%${search}%,phone.ilike.%${search}%,company.ilike.%${search}%`,
      );
    }

    const offset = (page - 1) * pageSize;
    const { data, count, error } = await query
      .order("cdr_start", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error(
        "[GET /api/calls] Supabase query failed:",
        error.message,
        error,
      );
      throw error;
    }

    const rowCount = data?.length ?? 0;
    if (rowCount === 0) {
      console.warn(
        "[GET /api/calls] Supabase returned 0 rows — no calls in DB yet (check webhook + migration)",
      );
    } else {
      console.log("[GET /api/calls] Supabase data received:", {
        rows: rowCount,
        total: count ?? 0,
        page,
        pageSize,
      });
    }

    return NextResponse.json({
      data: (data || []).map((row) => mapDbRowToCallRecord(row)),
      total: count || 0,
      page,
      pageSize,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch calls";
    console.error("[GET /api/calls]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const requesterId = getUserIdFromRequest(req);
    if (!requesterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const {
      name,
      phone,
      notes,
      callType = "answered",
    } = body as {
      name?: string;
      phone?: string;
      notes?: string;
      callType?: string;
    };

    if (!name?.trim())
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!phone?.trim())
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    if (!notes?.trim())
      return NextResponse.json({ error: "notes is required" }, { status: 400 });

    const supabase = createServerSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        event: "MANUAL_CALL",
        caller_name: name.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        call_type: callType,
        status: "Completed",
        cdr_start: now,
        duration_seconds: 0,
        ivr_option: "Manual",
        assigned_to_user_id: requesterId,
        assigned_to_name: null,
        tenant_id: tenantId,
        raw_payload: { source: "manual", created_by: requesterId },
      })
      .select()
      .single();

    if (error) throw error;

    console.log("[POST /api/calls] Manual call created:", data.id);
    return NextResponse.json(mapDbRowToCallRecord(data), { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create call";
    console.error("[POST /api/calls]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

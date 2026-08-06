import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

// ── GET /api/reports/list ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return NextResponse.json(
      { error: "Tenant context required" },
      { status: 400 },
    );
  }
  const supabase = createServerSupabaseClient();
  const { searchParams } = request.nextUrl;

  const { parsePagination } = await import("@/lib/pagination");
  const { page, pageSize, from, to } = parsePagination(searchParams);

  const { data, error, count } = await supabase
    .from("reports")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate actual max pages based on total count
  const totalCount = count ?? 0;
  const maxPages = Math.ceil(totalCount / pageSize) || 1;
  const actualPage = Math.max(1, Math.min(page, maxPages));

  return NextResponse.json({
    data,
    total: totalCount,
    page: actualPage,
    pageSize,
    maxPages,
  });
}

// ── POST /api/reports/list ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return NextResponse.json(
      { error: "Tenant context required" },
      { status: 400 },
    );
  }
  const supabase = createServerSupabaseClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, category } = body as { title: string; category: string };

  if (!title || !category) {
    return NextResponse.json(
      { error: "title and category are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({ title, category, tenant_id: tenantId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

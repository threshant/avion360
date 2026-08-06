import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { User } from "@/types/auth";
import { NextRequest, NextResponse } from "next/server";

function toUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as any,
    phone: (row.phone as string) ?? undefined,
    designation: (row.designation as string) ?? undefined,
    department: (row.department as string) ?? undefined,
    avatarUrl: (row.avatar_url as string) ?? undefined,
    tenantId: (row.tenant_id as string) ?? null,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    lastLogin: (row.last_login as string) ?? new Date().toISOString(),
  };
}

// ── GET /api/auth/me ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = getTenantIdFromRequest(request);

    const supabase = createServerSupabaseClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("[DEBUG] Fetching user session:", {
      id: user.id,
      name: user.name,
      email: user.email,
    });

    return NextResponse.json({
      ...toUser(user),
      tenantId: tenantId ?? null,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── PATCH /api/auth/me ────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createServerSupabaseClient();

    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.designation !== undefined) patch.designation = body.designation;
    if (body.avatarUrl !== undefined) patch.avatar_url = body.avatarUrl;

    const { data: user, error } = await supabase
      .from("users")
      .update(patch)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(toUser(user));
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import {
  createErrorResponse,
  createUnauthenticatedResponse,
  getTenantIdFromRequest,
  verifySuperAdminAuth,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/users/all - Get all users without pagination
 * Protected: Super admin only
 */

export async function GET(request: NextRequest) {
  try {
    // Verify super admin
    const auth = await verifySuperAdminAuth(request);
    if (!auth.isValid) {
      return createUnauthenticatedResponse(auth.error || "Unauthorized");
    }
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

    // Fetch users with pagination
    const {
      data: users,
      error,
      count,
    } = await supabase
      .from("users")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Remove password hashes from response
    const safeUsers = (users || []).map((u: any) => ({
      ...u,
      password_hash: undefined,
    }));

    return NextResponse.json(
      { data: safeUsers, total: count ?? 0, page, pageSize },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching all users:", error);
    return createErrorResponse("Failed to fetch users");
  }
}

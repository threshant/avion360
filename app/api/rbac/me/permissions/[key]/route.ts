import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

/**
 * Extract userId from custom JWT token (handles both standard base64 and base64url)
 */
function extractUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf8"),
    );
    return payload.sub ? String(payload.sub) : null;
  } catch (err) {
    console.error("Failed to extract user ID from token:", err);
    return null;
  }
}

/**
 * Resolve the authenticated user ID from the request.
 * Checks (in order): auth-token cookie → Authorization header → user-id cookie.
 */
function getUserId(req: NextRequest): string | null {
  const cookieToken = req.cookies.get("auth-token")?.value;
  if (cookieToken) {
    const userId = extractUserIdFromToken(cookieToken);
    if (userId) return userId;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const headerToken = authHeader.slice(7).trim();
    if (headerToken) {
      const userId = extractUserIdFromToken(headerToken);
      if (userId) return userId;
    }
  }

  const userIdCookie = req.cookies.get("user-id")?.value;
  if (userIdCookie) return userIdCookie;

  return null;
}

/**
 * GET /api/rbac/me/permissions/[key] - Check if current user has a specific permission
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json({ data: { hasPermission: false } });
    }
    const { key } = await params;

    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ data: { hasPermission: false } });
    }

    const supabase = createServerSupabaseClient();
    const permissionKey = key;

    // Get user's role from database
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .eq("tenant_id", tenantId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ data: { hasPermission: false } });
    }

    // Get role's permissions
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", user.role)
      .eq("tenant_id", tenantId)
      .single();

    if (roleError || !role) {
      return NextResponse.json({ data: { hasPermission: false } });
    }

    const { data: permission, error: permError } = await supabase
      .from("role_permissions")
      .select("permissions!inner(key)")
      .eq("role_id", role.id)
      .eq("tenant_id", tenantId)
      .eq("permissions.key", permissionKey)
      .single();

    if (permError) {
      return NextResponse.json({ data: { hasPermission: false } });
    }

    return NextResponse.json({
      data: {
        hasPermission: !!permission,
      },
    });
  } catch (error) {
    console.error("Error checking permission:", error);
    return NextResponse.json({
      data: {
        hasPermission: false,
      },
    });
  }
}

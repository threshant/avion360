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

    // Node.js Buffer.from with "base64" handles both standard base64 and base64url
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
  // 1. auth-token cookie (set by login API, preferred)
  const cookieToken = req.cookies.get("auth-token")?.value;
  if (cookieToken) {
    const userId = extractUserIdFromToken(cookieToken);
    if (userId) return userId;
  }

  // 2. Authorization header (sent by apiClientWrapper)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const headerToken = authHeader.slice(7).trim();
    if (headerToken) {
      const userId = extractUserIdFromToken(headerToken);
      if (userId) return userId;
    }
  }

  // 3. user-id cookie fallback (plain, non-HttpOnly cookie set alongside auth-token)
  const userIdCookie = req.cookies.get("user-id")?.value;
  if (userIdCookie) return userIdCookie;

  return null;
}

/**
 * GET /api/rbac/me/permissions - Get all permissions for the current user's role
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const userId = getUserId(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Get user's role from database
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role, name, email")
      .eq("id", userId)
      .eq("tenant_id", tenantId)
      .single();

    if (userError || !user) {
      console.error("User error:", userError, "User data:", user);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("User found:", {
      userId,
      userRole: user.role,
      name: user.name,
      email: user.email,
    });

    // Get role's permissions
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", user.role)
      .eq("tenant_id", tenantId)
      .single();

    if (roleError || !role) {
      console.error("Role error:", roleError, "Role data:", role);
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    console.log("Role found:", { roleId: role.id, roleName: user.role });

    const { data: permissions, error: permError } = await supabase
      .from("role_permissions")
      .select("permissions(*)")
      .eq("role_id", role.id)
      .eq("tenant_id", tenantId);

    if (permError) {
      console.error("Permission error:", permError);
      return NextResponse.json({ error: permError.message }, { status: 500 });
    }

    console.log("Permissions fetched:", {
      count: permissions?.length,
      permissions,
    });

    // Get role permission IDs
    const rolePermissionIds = new Set<string>(
      (permissions || []).map((rp: any) => rp.permissions.id),
    );

    // Check for user-specific denials (revoked_user_permissions table)
    const { data: deniedPerms, error: deniedError } = await supabase
      .from("revoked_user_permissions")
      .select("permission_id")
      .eq("user_id", userId);

    const deniedPermissionIds = new Set<string>(
      (deniedPerms || []).map((dp: any) => dp.permission_id),
    );

    // Also check for user-specific grants/denials in new schema (grant_type column)
    const { data: userPerms, error: userPermsError } = await supabase
      .from("user_permissions")
      .select("permission_id, grant_type")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);

    let grantedPermIds = new Set<string>();
    let deniedViaGrantType = new Set<string>();

    if (!userPermsError) {
      (userPerms || []).forEach((p: any) => {
        if (p.grant_type === "grant") {
          grantedPermIds.add(p.permission_id);
        } else if (p.grant_type === "deny") {
          deniedViaGrantType.add(p.permission_id);
        }
      });
    }

    // Combine all denials
    const allDeniedPermIds = new Set<string>([
      ...deniedPermissionIds,
      ...deniedViaGrantType,
    ]);

    // Log denials for debugging
    if (allDeniedPermIds.size > 0) {
      console.log("User-specific denials found:", {
        userId,
        deniedCount: allDeniedPermIds.size,
      });
    }

    // Filter out denied permissions from role-based permissions
    const finalPermissionIds = new Set<string>();
    rolePermissionIds.forEach((permId) => {
      if (!allDeniedPermIds.has(permId)) {
        finalPermissionIds.add(permId);
      }
    });

    // Add any user-specific grants (that aren't already in role)
    grantedPermIds.forEach((permId) => {
      finalPermissionIds.add(permId);
    });

    // Filter permissions to only include those in finalPermissionIds
    const formattedPermissions =
      (permissions || [])
        .filter((rp: any) => finalPermissionIds.has(rp.permissions.id))
        .map((rp: any) => ({
          id: rp.permissions.id,
          key: rp.permissions.key,
          label: rp.permissions.label,
          description: rp.permissions.description,
          icon: rp.permissions.icon,
          path: rp.permissions.path,
          category: rp.permissions.category,
          orderNum: rp.permissions.order_num,
          isActive: rp.permissions.is_active,
          createdAt: rp.permissions.created_at,
          updatedAt: rp.permissions.updated_at,
        })) || [];

    // Log permission keys for verification
    console.log(`✓ ${user.role.toUpperCase()} ROLE PERMISSIONS:`, {
      total: formattedPermissions.length,
      permissionKeys: formattedPermissions.map((p: any) => p.key).sort(),
    });

    return NextResponse.json({
      data: {
        permissions: formattedPermissions,
      },
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch user permissions" },
      { status: 500 },
    );
  }
}

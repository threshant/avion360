import {
  createBadRequestResponse,
  createErrorResponse,
  createUnauthenticatedResponse,
  getTenantIdFromRequest,
  verifySuperAdminAuth,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/users/{id}/permissions - Get user's permissions
 * PUT /api/users/{id}/permissions - Update user's permissions
 * Protected: Super admin only
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Fetch all available permissions
    const { data: allPermissions, error: permError } = await supabase
      .from("permissions")
      .select("*")
      .eq("is_active", true)
      .eq("tenant_id", tenantId)
      .order("category", { ascending: true })
      .order("label", { ascending: true });

    if (permError) {
      console.error("Error fetching permissions from DB:", permError);
      throw new Error(`Failed to fetch permissions: ${permError.message}`);
    }

    // Fetch user's role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (userError || !user) {
      console.error("Error fetching user:", userError);
      throw new Error("User not found");
    }

    // Fetch user's assigned permissions (try with grant_type, fall back if column doesn't exist)
    let userPermissions: any[] = [];
    let hasGrantType = false;
    const grantedPermIds = new Set<string>();
    const deniedPermIds = new Set<string>();

    // Try to fetch with grant_type (new schema)
    let { data: permsWithType, error: permsWithTypeError } = await supabase
      .from("user_permissions")
      .select("permission_id, grant_type")
      .eq("user_id", id)
      .eq("tenant_id", tenantId);

    if (
      permsWithTypeError &&
      permsWithTypeError.message.includes("grant_type")
    ) {
      // Column doesn't exist, fall back to old schema
      const { data: permsOld, error: permsOldError } = await supabase
        .from("user_permissions")
        .select("permission_id")
        .eq("user_id", id)
        .eq("tenant_id", tenantId);

      if (permsOldError && permsOldError.code !== "PGRST116") {
        console.error(
          "Error fetching user permissions from DB:",
          permsOldError,
        );
        throw new Error(
          `Failed to fetch user permissions: ${permsOldError.message}`,
        );
      }

      userPermissions = permsOld || [];
      hasGrantType = false;
      // All permissions from old schema are grants
      userPermissions.forEach((p: any) => {
        grantedPermIds.add(p.permission_id);
      });

      // Fetch revoked permissions from fallback table for old schema
      const { data: revokedPerms, error: revokedError } = await supabase
        .from("revoked_user_permissions")
        .select("permission_id")
        .eq("user_id", id);

      if (
        revokedError &&
        !revokedError.message.includes("does not exist") &&
        revokedError.code !== "PGRST116"
      ) {
        console.warn("Revoked permissions table not found, denials won't work");
      } else {
        (revokedPerms || []).forEach((p: any) => {
          deniedPermIds.add(p.permission_id);
        });
      }
    } else if (permsWithTypeError && permsWithTypeError.code !== "PGRST116") {
      console.error(
        "Error fetching user permissions from DB:",
        permsWithTypeError,
      );
      throw new Error(
        `Failed to fetch user permissions: ${permsWithTypeError.message}`,
      );
    } else {
      // New schema with grant_type exists
      userPermissions = permsWithType || [];
      hasGrantType = true;
      // Separate grants and denials
      userPermissions.forEach((p: any) => {
        if (p.grant_type === "grant") {
          grantedPermIds.add(p.permission_id);
        } else if (p.grant_type === "deny") {
          deniedPermIds.add(p.permission_id);
        }
      });
    }

    // Fetch role's permissions (based on user's role)
    const { data: rolePermissions, error: rolePermError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", user.role)
      .eq("tenant_id", tenantId)
      .single();

    let rolePermissionIds = new Set<string>();
    if (rolePermissions) {
      const { data: rolePerms, error: rolePermsError } = await supabase
        .from("role_permissions")
        .select("permission_id")
        .eq("role_id", rolePermissions.id)
        .eq("tenant_id", tenantId);

      if (rolePermsError && rolePermsError.code !== "PGRST116") {
        console.error("Error fetching role permissions:", rolePermsError);
        throw new Error(
          `Failed to fetch role permissions: ${rolePermsError.message}`,
        );
      }

      rolePermissionIds = new Set(
        (rolePerms || []).map((p: any) => p.permission_id),
      );
    }

    // Combine: role permissions + direct grants, excluding denials
    const allAssignedPermIds = new Set<string>();

    // Always exclude denials (from either grant_type or revoked table)
    rolePermissionIds.forEach((permId) => {
      if (!deniedPermIds.has(permId)) {
        allAssignedPermIds.add(permId);
      }
    });

    // Add direct grants
    grantedPermIds.forEach((permId) => {
      allAssignedPermIds.add(permId);
    });

    // Mark permissions as assigned or not
    const permissions = (allPermissions || []).map((p: any) => ({
      ...p,
      hasAccess: allAssignedPermIds.has(p.id),
    }));

    return NextResponse.json({ data: { permissions } }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch permissions";
    return createErrorResponse(message);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = await request.json();

    if (!Array.isArray(body.permissionIds)) {
      return createBadRequestResponse("permissionIds must be an array");
    }

    const supabase = createServerSupabaseClient();

    // Get the user's role to fetch their role-based permissions
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (userError || !user) {
      throw new Error("User not found");
    }

    // Fetch role-based permissions
    let rolePermissionIds = new Set<string>();
    const { data: roleData } = await supabase
      .from("roles")
      .select("id")
      .eq("name", user.role)
      .eq("tenant_id", tenantId)
      .single();

    if (roleData) {
      const { data: rolePerms } = await supabase
        .from("role_permissions")
        .select("permission_id")
        .eq("role_id", roleData.id)
        .eq("tenant_id", tenantId);

      rolePermissionIds = new Set(
        (rolePerms || []).map((p: any) => p.permission_id),
      );
    }

    // Permissions to grant (from request)
    const permToGrant = new Set<string>(body.permissionIds as string[]);

    console.log("Permission update for user:", {
      userId: id,
      permissionCount: permToGrant.size,
      permissionIds: Array.from(permToGrant),
    });

    // Delete existing user permissions
    const { error: deleteError } = await supabase
      .from("user_permissions")
      .delete()
      .eq("user_id", id)
      .eq("tenant_id", tenantId);

    if (deleteError) {
      console.error("Error deleting permissions:", deleteError);
      throw new Error(`Failed to delete permissions: ${deleteError.message}`);
    }

    // Try to insert with new schema (with grant_type)
    let useGrantType = true;
    const recordsToInsert: any[] = [];

    // Prepare records with grant_type
    permToGrant.forEach((permId) => {
      recordsToInsert.push({
        user_id: id,
        permission_id: permId,
        grant_type: "grant",
        tenant_id: tenantId,
      });
    });

    // Add denials for role-based permissions being revoked
    rolePermissionIds.forEach((rolePermId) => {
      if (!permToGrant.has(rolePermId)) {
        recordsToInsert.push({
          user_id: id,
          permission_id: rolePermId,
          grant_type: "deny",
          tenant_id: tenantId,
        });
      }
    });

    console.log("Records to insert:", {
      total: recordsToInsert.length,
      grants: Array.from(permToGrant).length,
      denials: recordsToInsert.length - Array.from(permToGrant).length,
    });

    // Try new schema first
    if (recordsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("user_permissions")
        .insert(recordsToInsert);

      if (insertError && insertError.message.includes("grant_type")) {
        console.warn("grant_type column not found, falling back to old schema");
        // Column doesn't exist, fall back to old schema
        useGrantType = false;
        const oldRecords = Array.from(permToGrant).map((permId) => ({
          user_id: id,
          permission_id: permId,
          tenant_id: tenantId,
        }));

        const { error: oldInsertError } = await supabase
          .from("user_permissions")
          .insert(oldRecords);

        if (oldInsertError) {
          console.error(
            "Error inserting permissions (old schema):",
            oldInsertError,
          );
          throw new Error(
            `Failed to insert permissions: ${oldInsertError.message}`,
          );
        }

        console.log("Successfully inserted permissions (old schema):", {
          count: oldRecords.length,
        });

        // For old schema, also record denials in the revoked_user_permissions table
        const revokedRecords: any[] = [];
        rolePermissionIds.forEach((rolePermId) => {
          if (!permToGrant.has(rolePermId)) {
            revokedRecords.push({
              user_id: id,
              permission_id: rolePermId,
            });
          }
        });

        if (revokedRecords.length > 0) {
          // First delete existing revocations
          await supabase
            .from("revoked_user_permissions")
            .delete()
            .eq("user_id", id);

          // Then insert new revocations
          const { error: revokedInsertError } = await supabase
            .from("revoked_user_permissions")
            .insert(revokedRecords);

          if (revokedInsertError) {
            console.error(
              "Error saving revocations to revoked_user_permissions:",
              {
                message: revokedInsertError.message,
                code: revokedInsertError.code,
                details: revokedInsertError.details,
                hint: revokedInsertError.hint,
              },
            );
            // Don't throw, just warn - table might not exist yet but will be created by migration
          } else {
            console.log("Successfully saved revocations:", {
              count: revokedRecords.length,
            });
          }
        } else {
          // Clear revocations if user has all permissions back
          await supabase
            .from("revoked_user_permissions")
            .delete()
            .eq("user_id", id);
        }
      } else if (insertError) {
        console.error("Error inserting permissions (new schema):", insertError);
        throw new Error(`Failed to insert permissions: ${insertError.message}`);
      } else {
        console.log("Successfully inserted permissions (new schema):", {
          count: recordsToInsert.length,
        });
      }
    }

    // Fetch updated permissions to return
    const { data: allPermissions, error: fetchError } = await supabase
      .from("permissions")
      .select("*")
      .eq("is_active", true)
      .eq("tenant_id", tenantId)
      .order("category", { ascending: true })
      .order("label", { ascending: true });

    if (fetchError) {
      console.error("Error fetching updated permissions:", fetchError);
      throw new Error(
        `Failed to fetch updated permissions: ${fetchError.message}`,
      );
    }

    // Recalculate permissions the same way as GET endpoint
    let newRolePermIds = rolePermissionIds;
    let newDeniedPermIds = new Set<string>();
    let newGrantedPermIds = new Set<string>();

    if (useGrantType) {
      // New schema: re-fetch what we just saved to get accurate denials
      const { data: newSavedPerms } = await supabase
        .from("user_permissions")
        .select("permission_id, grant_type")
        .eq("user_id", id)
        .eq("tenant_id", tenantId);

      (newSavedPerms || []).forEach((p: any) => {
        if (p.grant_type === "grant") {
          newGrantedPermIds.add(p.permission_id);
        } else if (p.grant_type === "deny") {
          newDeniedPermIds.add(p.permission_id);
        }
      });
    } else {
      // Old schema: direct grants
      newGrantedPermIds = new Set(permToGrant);

      // Also fetch revoked permissions for old schema
      const { data: revokedPerms, error: revokedError } = await supabase
        .from("revoked_user_permissions")
        .select("permission_id")
        .eq("user_id", id);

      if (
        revokedError &&
        !revokedError.message.includes("does not exist") &&
        revokedError.code !== "PGRST116"
      ) {
        console.warn("Could not fetch revoked permissions for display");
      } else {
        (revokedPerms || []).forEach((p: any) => {
          newDeniedPermIds.add(p.permission_id);
        });
      }
    }

    // Calculate final permissions: role perms that aren't denied + direct grants
    const finalPermIds = new Set<string>();

    // Add role permissions that aren't denied
    newRolePermIds.forEach((permId) => {
      if (!newDeniedPermIds.has(permId)) {
        finalPermIds.add(permId);
      }
    });

    // Add direct grants
    newGrantedPermIds.forEach((permId) => {
      finalPermIds.add(permId);
    });

    const permissions = (allPermissions || []).map((p: any) => ({
      ...p,
      hasAccess: finalPermIds.has(p.id),
    }));

    // Log what permissions are available after update
    const grantedPerms = Array.from(finalPermIds);
    const grantedPermDetails = (permissions || [])
      .filter((p: any) => grantedPerms.includes(p.id))
      .map((p: any) => p.key);

    console.log("Final permissions after update:", {
      userId: id,
      totalAvailable: permissions.length,
      totalGranted: grantedPerms.length,
      grantedKeys: grantedPermDetails,
    });

    return NextResponse.json(
      {
        data: {
          permissions,
          message: "Permissions updated successfully",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating user permissions:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update permissions";
    return createErrorResponse(message);
  }
}

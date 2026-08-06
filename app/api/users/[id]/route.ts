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
 * GET /api/users/{id} - Get single user
 * PUT /api/users/{id} - Update user
 * DELETE /api/users/{id} - Delete user
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
      return createBadRequestResponse("Tenant context required");
    }

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Fetch user
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !user) {
      return createBadRequestResponse("User not found");
    }

    // Fetch user permissions
    const { data: userPerms } = await supabase
      .from("user_permissions")
      .select("permission_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", id);

    const safeUser = {
      ...user,
      password_hash: undefined,
      permissions: userPerms,
    };
    return NextResponse.json({ data: safeUser }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user:", error);
    return createErrorResponse("Failed to fetch user");
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
      return createBadRequestResponse("Tenant context required");
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = createServerSupabaseClient();

    // Build update payload (only allow specific fields)
    const updateData: Record<string, unknown> = {};
    const assignableFields = [
      "name",
      "email",
      "phone",
      "designation",
      "department",
      "role",
      "is_active",
      "employee_code",
      "date_of_birth",
      "joining_date",
      "address",
      "city",
      "state",
      "country",
      "postal_code",
      "emergency_contact_name",
      "emergency_contact_phone",
      "salary_amount",
      "salary_currency",
      "salary_type",
      "payment_frequency",
      "payment_method",
      "bank_account_name",
      "bank_account_number",
      "bank_name",
      "bank_ifsc",
      "upi_id",
      "tax_id",
      "notes",
    ];

    assignableFields.forEach((field) => {
      if (body[field] !== undefined) {
        if (typeof body[field] === "string") {
          const trimmed = body[field].trim();
          updateData[field] = trimmed.length > 0 ? trimmed : null;
          return;
        }

        updateData[field] = body[field];
      }
    });

    if (body.salary_amount !== undefined && body.salary_amount !== null) {
      const numericSalary = Number(body.salary_amount);
      if (Number.isNaN(numericSalary)) {
        return createBadRequestResponse("salary_amount must be a valid number");
      }
      updateData.salary_amount = numericSalary;
    }

    // Update user
    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw error;

    const safeUser = { ...updatedUser, password_hash: undefined };
    return NextResponse.json({ data: safeUser }, { status: 200 });
  } catch (error) {
    console.error("Error updating user:", error);
    return createErrorResponse("Failed to update user");
  }
}

export async function DELETE(
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
      return createBadRequestResponse("Tenant context required");
    }

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Prevent deleting super_admin users
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (user?.role === "super_admin") {
      return createBadRequestResponse("Cannot delete super_admin users");
    }

    // Delete user (cascade will handle permissions)
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) throw error;

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    return createErrorResponse("Failed to delete user");
  }
}

import {
  createBadRequestResponse,
  createErrorResponse,
  createUnauthenticatedResponse,
  getTenantIdFromRequest,
  verifySuperAdminAuth,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/users - Get paginated list of users
 * POST /api/users - Create new user
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
      return createBadRequestResponse("Tenant context required");
    }

    const supabase = createServerSupabaseClient();

    // Get pagination params
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Fetch users
    const {
      data: users,
      error: usersError,
      count,
    } = await supabase
      .from("users")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (usersError) throw usersError;

    // Remove password hashes from response
    const safeUsers =
      users?.map((u: Record<string, unknown>) => ({
        ...u,
        password_hash: undefined,
      })) || [];

    return NextResponse.json(
      {
        data: {
          users: safeUsers,
          pagination: {
            page,
            limit,
            total: count || 0,
            pages: Math.ceil((count || 0) / limit),
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return createErrorResponse("Failed to fetch users");
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.password || !body.role) {
      return createBadRequestResponse(
        "Missing required fields: name, email, password, role",
      );
    }

    const supabase = createServerSupabaseClient();

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", body.email)
      .eq("tenant_id", tenantId)
      .single();

    if (existingUser) {
      return createBadRequestResponse("Email already in use");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 10);

    // Auto-generate employee_code if not supplied (DB trigger also handles this, but belt+suspenders)
    let employeeCode = body.employee_code || null;
    if (!employeeCode) {
      const { count } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      employeeCode = "EMP" + String((count || 0) + 1).padStart(3, "0");
    }

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        name: body.name,
        email: body.email,
        password_hash: passwordHash,
        role: body.role || "employee",
        phone: body.phone,
        telecmi_user_id: body.telecmi_user_id,
        designation: body.designation,
        department: body.department,
        employee_code: employeeCode,
        joining_date: body.joining_date,
        salary_amount: body.salary_amount,
        salary_currency: body.salary_currency,
        salary_type: body.salary_type,
        payment_frequency: body.payment_frequency,
        payment_method: body.payment_method,
        tenant_id: tenantId,
        is_active: true,
      })
      .select()
      .single();

    if (createError) throw createError;

    // Remove password hash from response
    const safeUser = { ...newUser, password_hash: undefined };

    return NextResponse.json({ data: safeUser }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return createErrorResponse("Failed to create user");
  }
}

import {
  buildLoginResponse,
  createLoginNextResponse,
} from "@/lib/auth-session";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { resolveActiveTenantForUser } from "@/lib/tenant-auth";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

// Helper: Compare bcrypt hash with plain password
async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}

// ── POST /api/auth/login ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, tenantId: preferredTenantId } = body;
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();

    if (!normalizedEmail || !password) {
      return Response.json(
        { error: "Email and password required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Fetch user from database
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("is_active", true)
      .single();

    if (error || !user) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Development: Allow demo accounts to bypass bcrypt verification
    const isDemoAccount = [
      "super.admin@crm.demo",
      "admin@crm.demo",
      "employee@crm.demo",
    ].includes(normalizedEmail);

    const demoPasswords: Record<string, string> = {
      "super.admin@crm.demo": "Super@123",
      "admin@crm.demo": "Admin@123",
      "employee@crm.demo": "Employee@123",
    };

    let passwordMatch = false;

    if (isDemoAccount && process.env.NODE_ENV !== "production") {
      // Dev/Test: Use hardcoded demo password
      passwordMatch = demoPasswords[normalizedEmail] === password;
    } else {
      if (!user.password_hash) {
        return Response.json(
          { error: "Password login is not available for this account" },
          { status: 401 },
        );
      }

      // Production or non-demo: Use bcrypt verification
      passwordMatch = await verifyPassword(password, user.password_hash);
    }

    if (!passwordMatch) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Update last_login
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    const tenantId = await resolveActiveTenantForUser(
      supabase,
      { id: user.id as string, name: user.name as string },
      typeof preferredTenantId === "string" ? preferredTenantId : null,
    );

    const response = buildLoginResponse(user, tenantId);
    return createLoginNextResponse(response);
  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

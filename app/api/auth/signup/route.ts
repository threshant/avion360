import {
  buildLoginResponse,
  createLoginNextResponse,
} from "@/lib/auth-session";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

const ALLOWED_ROLES = ["super_admin", "admin", "employee"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      role,
      masterPin,
      organizationName,
      planTier,
    } = body ?? {};

    if (!name || !email || !password || !role || !masterPin) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const MASTER_PIN = process.env.MASTER_SIGNUP_PIN || "123456";
    if (masterPin !== MASTER_PIN) {
      return Response.json({ error: "Invalid master pin" }, { status: 401 });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Ensure user does not already exist
    const { data: existing, error: fetchErr } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    if (existing) {
      return Response.json({ error: "User already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const { data: inserted, error: insertErr } = await supabase
      .from("users")
      .insert([
        {
          name,
          email,
          role,
          password_hash: passwordHash,
          is_active: true,
          created_at: now,
          last_login: now,
        },
      ])
      .select("*")
      .single();

    if (insertErr) {
      console.error("Signup insert error:", insertErr);
      return Response.json({ error: "Failed to create user" }, { status: 500 });
    }

    const orgName =
      typeof organizationName === "string" && organizationName.trim()
        ? organizationName.trim()
        : `${String(name).trim()} Organization`;

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        plan_tier:
          typeof planTier === "string" && planTier.trim()
            ? planTier.trim()
            : "starter",
      })
      .select("id")
      .single();

    if (organizationError || !organization) {
      console.error("Signup organization error:", organizationError);
      return Response.json(
        { error: "Failed to create organization" },
        { status: 500 },
      );
    }

    const { error: membershipError } = await supabase
      .from("memberships")
      .insert({
        user_id: inserted.id,
        tenant_id: organization.id,
        role: "owner",
      });

    if (membershipError) {
      console.error("Signup membership error:", membershipError);
      return Response.json(
        { error: "Failed to create organization membership" },
        { status: 500 },
      );
    }

    const response = buildLoginResponse(inserted, organization.id);
    return createLoginNextResponse(response);
  } catch (error) {
    console.error("Signup error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

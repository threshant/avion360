import {
  buildLoginResponse,
  createLoginNextResponse,
} from "@/lib/auth-session";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { SignupPayload } from "@/types/auth";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<SignupPayload>;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");
    const organizationName = String(body.organizationName ?? "").trim();
    const industry = String(body.industry ?? "").trim();
    const teamSizeRaw = Number(body.teamSize);
    const planTier =
      typeof body.planTier === "string" && body.planTier.trim()
        ? body.planTier.trim()
        : "starter";
    const companyWebsite =
      typeof body.companyWebsite === "string" && body.companyWebsite.trim()
        ? body.companyWebsite.trim()
        : null;

    if (!name || !email || !password || !organizationName || !industry) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(teamSizeRaw) || teamSizeRaw < 1) {
      return Response.json(
        { error: "Team size must be a positive number" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Ensure user does not already exist
    const { data: existing, error: fetchErr } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    if (fetchErr && fetchErr.code !== "PGRST116") {
      console.error("Signup fetch user error:", fetchErr);
      return Response.json(
        { error: "Failed to check existing user" },
        { status: 500 },
      );
    }
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
          role: "super_admin",
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

    const orgName = organizationName || `${name} Organization`;

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        plan_tier: planTier,
        industry,
        team_size: teamSizeRaw,
        company_website: companyWebsite,
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

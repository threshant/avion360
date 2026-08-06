import { createServerSupabaseClient } from "@/lib/supabaseClient";

export type MembershipRole = "owner" | "admin" | "staff";

type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

type MembershipRow = {
  tenant_id: string;
  role: MembershipRole;
};

export async function ensureUserHasTenant(
  supabase: SupabaseClient,
  user: { id: string; name?: string | null },
): Promise<string> {
  const { data: existingMemberships, error: membershipError } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1);

  if (membershipError) {
    throw membershipError;
  }

  if (existingMemberships && existingMemberships.length > 0) {
    return existingMemberships[0].tenant_id;
  }

  const orgName =
    user.name && user.name.trim()
      ? `${user.name.trim()} Organization`
      : "Default Organization";

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: orgName,
      plan_tier: "starter",
    })
    .select("id")
    .single();

  if (orgError || !org) {
    throw orgError ?? new Error("Unable to create organization");
  }

  const { error: addMembershipError } = await supabase
    .from("memberships")
    .insert({
      user_id: user.id,
      tenant_id: org.id,
      role: "owner",
    });

  if (addMembershipError) {
    throw addMembershipError;
  }

  return org.id;
}

export async function resolveActiveTenantForUser(
  supabase: SupabaseClient,
  user: { id: string; name?: string | null },
  preferredTenantId?: string | null,
): Promise<string> {
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  if (!memberships || memberships.length === 0) {
    return ensureUserHasTenant(supabase, user);
  }

  const typedMemberships = memberships as MembershipRow[];
  if (preferredTenantId) {
    const matched = typedMemberships.find(
      (membership) => membership.tenant_id === preferredTenantId,
    );
    if (matched) {
      return matched.tenant_id;
    }
  }

  return typedMemberships[0].tenant_id;
}

export async function hasTenantRole(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  allowedRoles: MembershipRole[],
): Promise<boolean> {
  const { data, error } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) {
    return false;
  }

  return allowedRoles.includes(data.role as MembershipRole);
}

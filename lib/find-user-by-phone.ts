import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { normalizePhoneE164 } from "@/lib/phone";

export async function findActiveUserByPhone(phone: string) {
  const normalized = normalizePhoneE164(phone);
  if (!normalized) return null;

  const supabase = createServerSupabaseClient();
  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .eq("is_active", true)
    .not("phone", "is", null);

  if (error || !users?.length) {
    return null;
  }

  return (
    users.find((row) => {
      const rowPhone = row.phone as string | null;
      if (!rowPhone) return false;
      return normalizePhoneE164(rowPhone) === normalized;
    }) ?? null
  );
}

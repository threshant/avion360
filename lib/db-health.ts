import { createServerSupabaseClient } from "./supabaseClient";

let connectionChecked = false;

/**
 * Test database connection and log status to server console.
 * Runs once per server startup.
 */
export async function checkDatabaseConnection() {
  // Only check once per process
  if (connectionChecked) {
    return;
  }

  connectionChecked = true;

  try {
    const supabase = createServerSupabaseClient();

    // Simple query to test connection
    const { data, error } = await supabase
      .from("clients")
      .select("count", { count: "exact", head: true });

    if (error) {
      console.error(
        "❌ Database Connection Failed:",
        error.message || "Unknown error",
      );
      console.error(
        "   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local",
      );
      return false;
    }

    console.log(
      "✅ Database Connection Successful - Supabase connected and schema ready",
    );
    return true;
  } catch (error) {
    console.error(
      "❌ Database Connection Error:",
      error instanceof Error ? error.message : String(error),
    );
    console.error(
      "   Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
    return false;
  }
}

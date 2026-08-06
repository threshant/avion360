import { createServerSupabaseClient } from "./supabaseClient";

// Detects whether a column exists on a table, caching the result per process.
// Needed because some deployments run behind the repo's schema migrations
// (e.g. `quotation_items.product`, `proforma_invoices.due_date`) while the
// live database predates them. PostgREST rejects queries against unknown
// columns, so we only reference these columns when they actually exist.

const cache = new Map<string, boolean>();
const inflight = new Map<string, Promise<boolean>>();

export async function hasColumn(
  table: string,
  column: string,
): Promise<boolean> {
  const key = `${table}.${column}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const probe = (async () => {
    try {
      const supabase = createServerSupabaseClient();
      const { error } = await supabase.from(table).select(column).limit(1);
      return !error;
    } catch {
      return false;
    }
  })();

  inflight.set(key, probe);
  try {
    const result = await probe;
    cache.set(key, result);
    return result;
  } finally {
    inflight.delete(key);
  }
}

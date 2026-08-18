import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Server-side Supabase-klient med service role key. Får aldrig importeras i klientkod. */
export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY måste vara satta i miljön."
      );
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

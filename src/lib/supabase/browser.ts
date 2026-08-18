import { createBrowserClient } from "@supabase/ssr";

/** Klient för webbläsaren. Använder den publika nyckeln – den är gjord för att
 *  ligga öppet i klientkod och kommer inte åt något utan giltig session. */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

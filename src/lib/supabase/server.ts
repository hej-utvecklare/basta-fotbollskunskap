import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Serverklient som läser och skriver sessionscookies. En per request –
 *  den måste se just den requestens cookies. */
export function createServerSupabase() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components får inte sätta cookies – middleware sköter
            // förnyelsen av tokens, så det här är ofarligt att svälja.
          }
        },
      },
    }
  );
}

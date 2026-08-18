"use client";

import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function SignOut() {
  return (
    <button
      type="button"
      onClick={async () => {
        await createBrowserSupabase().auth.signOut();
        window.location.href = "/";
      }}
      className="text-sm text-slate-500 underline hover:text-slate-700"
    >
      Logga ut
    </button>
  );
}

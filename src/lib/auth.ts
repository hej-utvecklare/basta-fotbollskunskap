// Identiteten kommer från Google via Supabase Auth. Deltagarraden i `users`
// skapas första gången någon loggar in och har samma id som auth-användaren.
//
// Admin är en separat sak: ett lösenord i miljön och en signerad cookie.
// Det har inget med Google att göra och används bara av dig som arrangör.

import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { createServerSupabase } from "./supabase/server";
import { supabaseAdmin } from "./supabase";

const ADMIN_COOKIE = "bfk_admin";
const IMPERSONATE_COOKIE = "bfk_as";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function secret(): string {
  return process.env.SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "bfk-dev-secret";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex").slice(0, 24);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string | null;
  fpl_entry_id: number | null;
};

/** Id:t för den deltagare sidan ska visas som. Normalt den inloggade
 *  Google-användaren, men admin kan tillfälligt agera som någon annan. */
export async function currentUserId(): Promise<string | null> {
  if (isAdmin()) {
    const as = cookies().get(IMPERSONATE_COOKIE)?.value;
    if (as) {
      const dot = as.lastIndexOf(".");
      const id = as.slice(0, dot);
      if (dot > 0 && as.slice(dot + 1) === sign(id)) return id;
    }
  }
  const supabase = createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Hämtar deltagarraden och skapar den vid första inloggningen. */
export async function currentUser(): Promise<SessionUser | null> {
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const id = await currentUserId();
  if (!id) return null;

  const db = supabaseAdmin();
  const { data: row } = await db
    .from("users").select("id, name, email, fpl_entry_id").eq("id", id).maybeSingle();
  if (row) return row as SessionUser;

  // Bara den egna inloggningen får skapa en rad – aldrig impersonering.
  if (!auth.user || auth.user.id !== id) return null;

  const meta = auth.user.user_metadata ?? {};
  const name =
    (meta.full_name as string) || (meta.name as string) ||
    auth.user.email?.split("@")[0] || "Deltagare";

  const { data: created } = await db
    .from("users")
    .insert({ id: auth.user.id, name, email: auth.user.email ?? null })
    .select("id, name, email, fpl_entry_id")
    .single();
  return (created as SessionUser) ?? null;
}

export function setAdminCookie() {
  cookies().set(ADMIN_COOKIE, sign("admin"), {
    httpOnly: true, sameSite: "lax", maxAge: COOKIE_MAX_AGE, path: "/",
  });
}

export function isAdmin(): boolean {
  return cookies().get(ADMIN_COOKIE)?.value === sign("admin");
}

/** Admin fyller i åt någon som missat deadline. Kräver admin-cookien för
 *  att ha någon effekt – se currentUserId. */
export function setImpersonateCookie(userId: string) {
  cookies().set(IMPERSONATE_COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true, sameSite: "lax", maxAge: 60 * 60, path: "/",
  });
}

export function clearImpersonateCookie() {
  cookies().delete(IMPERSONATE_COOKIE);
}

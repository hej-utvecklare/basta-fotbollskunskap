// Enkel cookie-"auth": namnet är identiteten, valfritt PIN skyddar mot
// att kompisar redigerar varandras gissningar. Cookien signeras med HMAC
// så att den inte går att förfalska genom att bara skriva in ett annat id.

import { createHmac, createHash } from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";

const USER_COOKIE = "bfk_user";
const ADMIN_COOKIE = "bfk_admin";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function secret(): string {
  return process.env.SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "bfk-dev-secret";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex").slice(0, 24);
}

export function hashPin(pin: string, userId: string): string {
  return createHash("sha256").update(`${userId}:${pin}`).digest("hex");
}

export function setUserCookie(userId: string) {
  cookies().set(USER_COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true, sameSite: "lax", maxAge: COOKIE_MAX_AGE, path: "/",
  });
}

export function clearUserCookie() {
  cookies().delete(USER_COOKIE);
}

export function currentUserId(): string | null {
  const raw = cookies().get(USER_COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const id = raw.slice(0, dot);
  return raw.slice(dot + 1) === sign(id) ? id : null;
}

export type SessionUser = {
  id: string;
  name: string;
  fpl_entry_id: number | null;
  has_pin: boolean;
};

export async function currentUser(): Promise<SessionUser | null> {
  const id = currentUserId();
  if (!id) return null;
  const { data } = await supabaseAdmin()
    .from("users").select("id, name, fpl_entry_id, pin_hash").eq("id", id).maybeSingle();
  if (!data) return null;
  return { id: data.id, name: data.name, fpl_entry_id: data.fpl_entry_id, has_pin: !!data.pin_hash };
}

export function setAdminCookie() {
  cookies().set(ADMIN_COOKIE, sign("admin"), {
    httpOnly: true, sameSite: "lax", maxAge: COOKIE_MAX_AGE, path: "/",
  });
}

export function isAdmin(): boolean {
  return cookies().get(ADMIN_COOKIE)?.value === sign("admin");
}

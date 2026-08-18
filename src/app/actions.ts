"use server";

import { revalidatePath } from "next/cache";
import {
  clearUserCookie, currentUser, currentUserId, hashPin, isAdmin,
  setAdminCookie, setUserCookie,
} from "@/lib/auth";
import { deadlinePassed, getPrediction, getSettings, getSnapshot, updateSettings } from "@/lib/data";
import { predictionProgress } from "@/lib/progress";
import { refreshAll, recomputeScores } from "@/lib/refresh";
import { supabaseAdmin } from "@/lib/supabase";

export type ActionResult = { ok: boolean; message?: string };

// ---------- Inloggning ----------

export async function login(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  if (!name) return { ok: false, message: "Skriv ditt namn." };
  if (pin && !/^\d{4}$/.test(pin)) return { ok: false, message: "PIN måste vara exakt fyra siffror." };

  const db = supabaseAdmin();
  // Escapa ilike-wildcards så "Kalle%" inte matchar andra namn
  const { data: existing } = await db
    .from("users").select("id, pin_hash")
    .ilike("name", name.replace(/[%_]/g, "\\$&")).maybeSingle();

  if (existing) {
    if (existing.pin_hash && existing.pin_hash !== hashPin(pin, existing.id)) {
      return { ok: false, message: "Fel PIN. Den här användaren har ett PIN – ange det för att logga in." };
    }
    setUserCookie(existing.id);
  } else {
    const { data: created, error } = await db
      .from("users").insert({ name }).select("id").single();
    if (error || !created) return { ok: false, message: "Kunde inte skapa användaren. Försök igen." };
    if (pin) {
      await db.from("users").update({ pin_hash: hashPin(pin, created.id) }).eq("id", created.id);
    }
    setUserCookie(created.id);
  }
  revalidatePath("/");
  return { ok: true };
}

export async function logout(): Promise<void> {
  clearUserCookie();
  revalidatePath("/");
}

export async function linkFplTeam(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const userId = currentUserId();
  if (!userId) return { ok: false, message: "Du är inte inloggad." };
  const entry = Number(formData.get("entry"));
  if (!entry) return { ok: false, message: "Välj ett lag i listan." };
  const { error } = await supabaseAdmin()
    .from("users").update({ fpl_entry_id: entry }).eq("id", userId);
  if (error) return { ok: false, message: "Kunde inte spara kopplingen." };
  revalidatePath("/");
  return { ok: true, message: "Ditt FPL-lag är kopplat!" };
}

// ---------- Gissningen ----------

type PredictionPayload = {
  tableOrder: number[];
  firstSacked: string;
  topScorers: number[];
  topAssists: number[];
};

/** Gissningen går att ändra ända fram till deadline, även efter inskickning.
 *  Det är bara deadline som låser – inte att man tryckt "skicka in". */
async function canEdit(): Promise<{ ok: boolean; message?: string }> {
  const settings = await getSettings();
  if (deadlinePassed(settings) && !isAdmin()) {
    return { ok: false, message: "Deadline har passerat – gissningen är låst." };
  }
  return { ok: true };
}

export async function saveDraft(payload: Partial<PredictionPayload>): Promise<ActionResult> {
  const userId = currentUserId();
  if (!userId) return { ok: false, message: "Du är inte inloggad." };
  const allowed = await canEdit();
  if (!allowed.ok) return allowed;

  // Bara de delar som steget faktiskt äger skrivs, så att ett halvfyllt
  // steg inte nollar det man redan sparat i ett annat.
  const patch: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (payload.tableOrder !== undefined) patch.table_order = payload.tableOrder;
  if (payload.firstSacked !== undefined) patch.first_sacked = payload.firstSacked;
  if (payload.topScorers !== undefined) patch.top_scorers = payload.topScorers;
  if (payload.topAssists !== undefined) patch.top_assists = payload.topAssists;

  const { error } = await supabaseAdmin().from("predictions").upsert(patch);
  if (error) return { ok: false, message: "Kunde inte spara utkastet." };

  // En ifylld gissning ska räknas även om deltagaren aldrig trycker "Skicka in" –
  // annars ger ett komplett utkast noll poäng utan att någon märker det.
  // Fram till deadline går den fortfarande att ändra.
  try {
    const saved = await getPrediction(userId);
    if (saved && !saved.submitted_at) {
      const snap = await getSnapshot();
      const teamCount = snap?.snapshot.teams.length ?? 20;
      if (predictionProgress(saved, teamCount).complete) {
        await supabaseAdmin().from("predictions")
          .update({ submitted_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
    }
  } catch {}

  return { ok: true };
}

export async function submitPrediction(payload: PredictionPayload): Promise<ActionResult> {
  const userId = currentUserId();
  if (!userId) return { ok: false, message: "Du är inte inloggad." };
  const allowed = await canEdit();
  if (!allowed.ok) return allowed;

  const snap = await getSnapshot();
  const teamCount = snap?.snapshot.teams.length ?? 20;
  if (payload.tableOrder.length !== teamCount || new Set(payload.tableOrder).size !== teamCount) {
    return { ok: false, message: "Tabellen måste innehålla alla lag exakt en gång." };
  }
  if (!payload.firstSacked.trim()) {
    return { ok: false, message: "Fyll i första sparkade tränaren." };
  }
  if (payload.topScorers.length !== 3 || new Set(payload.topScorers).size !== 3) {
    return { ok: false, message: "Välj tre olika spelare i skytteligan." };
  }
  if (payload.topAssists.length !== 3 || new Set(payload.topAssists).size !== 3) {
    return { ok: false, message: "Välj tre olika spelare i assistligan." };
  }

  const { error } = await supabaseAdmin().from("predictions").upsert({
    user_id: userId,
    table_order: payload.tableOrder,
    first_sacked: payload.firstSacked.trim(),
    top_scorers: payload.topScorers,
    top_assists: payload.topAssists,
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: "Kunde inte skicka in gissningen." };

  // Räkna in den nya gissningen direkt om det finns en snapshot
  try {
    if (snap) await recomputeScores(snap.snapshot);
  } catch {}
  revalidatePath("/");
  revalidatePath("/gissning");
  revalidatePath("/tabell");
  return { ok: true, message: "Gissningen är inskickad! Du kan ändra den fram till deadline." };
}

// ---------- Admin ----------

export async function adminLogin(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return { ok: false, message: "Fel lösenord." };
  }
  setAdminCookie();
  revalidatePath("/admin");
  return { ok: true };
}

function requireAdmin(): ActionResult | null {
  return isAdmin() ? null : { ok: false, message: "Inte inloggad som admin." };
}

/** "YYYY-MM-DDTHH:mm" från datetime-local tolkas som svensk tid → ISO (UTC). */
function stockholmToIso(local: string): string {
  const utcGuess = new Date(`${local}:00Z`);
  const inTz = new Date(utcGuess.toLocaleString("en-US", { timeZone: "Europe/Stockholm" }));
  const inUtc = new Date(utcGuess.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMs = inTz.getTime() - inUtc.getTime();
  return new Date(utcGuess.getTime() - offsetMs).toISOString();
}

export async function adminSaveSettings(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = requireAdmin();
  if (denied) return denied;
  const deadlineRaw = String(formData.get("deadline") ?? "").trim();
  const leagueCode = String(formData.get("league_code") ?? "").trim();
  const leagueIdRaw = String(formData.get("league_id") ?? "").trim();
  await updateSettings({
    deadline: deadlineRaw ? stockholmToIso(deadlineRaw) : null,
    league_code: leagueCode || "vyery9",
    league_id: leagueIdRaw ? Number(leagueIdRaw) : null,
  });
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "Inställningarna sparade." };
}

export async function adminSaveSacked(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = requireAdmin();
  if (denied) return denied;
  await updateSettings({
    sacked_manager: String(formData.get("sacked_manager") ?? "").trim() || null,
    sacked_decided: formData.get("sacked_decided") === "on",
  });
  const snap = await getSnapshot();
  try {
    if (snap) await recomputeScores(snap.snapshot);
  } catch {}
  revalidatePath("/admin");
  revalidatePath("/tabell");
  return { ok: true, message: "Tränarfacit sparat och poängen omräknade." };
}

export async function adminSetUserTeam(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = requireAdmin();
  if (denied) return denied;
  const userId = String(formData.get("user_id") ?? "");
  const entryRaw = String(formData.get("entry") ?? "").trim();
  const { error } = await supabaseAdmin()
    .from("users")
    .update({ fpl_entry_id: entryRaw ? Number(entryRaw) : null })
    .eq("id", userId);
  if (error) return { ok: false, message: "Kunde inte uppdatera kopplingen." };
  const snap = await getSnapshot();
  try {
    if (snap) await recomputeScores(snap.snapshot);
  } catch {}
  revalidatePath("/admin");
  return { ok: true, message: "Kopplingen uppdaterad." };
}

export async function adminDeleteUser(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = requireAdmin();
  if (denied) return denied;
  const userId = String(formData.get("user_id") ?? "");
  const { error } = await supabaseAdmin().from("users").delete().eq("id", userId);
  if (error) return { ok: false, message: "Kunde inte radera användaren." };
  revalidatePath("/admin");
  revalidatePath("/tabell");
  return { ok: true, message: "Användaren raderad." };
}

export async function adminUnlockPrediction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = requireAdmin();
  if (denied) return denied;
  const userId = String(formData.get("user_id") ?? "");
  const { error } = await supabaseAdmin()
    .from("predictions").update({ submitted_at: null }).eq("user_id", userId);
  if (error) return { ok: false, message: "Kunde inte låsa upp gissningen." };
  revalidatePath("/admin");
  return { ok: true, message: "Gissningen upplåst – användaren kan redigera igen fram till deadline." };
}

export async function adminImpersonate(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = requireAdmin();
  if (denied) return denied;
  const userId = String(formData.get("user_id") ?? "");
  setUserCookie(userId);
  revalidatePath("/");
  return { ok: true, message: "Du är nu inloggad som användaren. Gå till Gissningen för att fylla i åt hen." };
}

export async function adminRefresh(): Promise<ActionResult> {
  const denied = requireAdmin();
  if (denied) return denied;
  const result = await refreshAll();
  revalidatePath("/");
  revalidatePath("/tabell");
  revalidatePath("/pl");
  revalidatePath("/admin");
  return { ok: result.ok, message: result.message };
}

export async function getSessionUser() {
  return currentUser();
}

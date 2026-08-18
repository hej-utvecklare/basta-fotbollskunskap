import { isAdmin } from "@/lib/auth";
import { getSettings, getSnapshot, listUsers } from "@/lib/data";
import { sackedMatches } from "@/lib/scoring";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminLoginForm, AdminPanel } from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

/** ISO-tid → värde för <input type="datetime-local"> i svensk tid. */
function toLocalInput(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
  // sv-SE ger "2026-08-15 18:00"
  return parts.replace(" ", "T");
}

export default async function AdminPage() {
  if (!isAdmin()) return <AdminLoginForm />;

  const [settings, snap, users] = await Promise.all([
    getSettings(), getSnapshot(), listUsers(),
  ]);
  const { data: predictions } = await supabaseAdmin()
    .from("predictions")
    .select("user_id, first_sacked, submitted_at");
  const predByUser = new Map((predictions ?? []).map((p) => [p.user_id, p]));

  return (
    <AdminPanel
      deadline={toLocalInput(settings.deadline)}
      leagueCode={settings.league_code}
      leagueId={settings.league_id}
      sackedManager={settings.sacked_manager}
      sackedDecided={settings.sacked_decided}
      fplEntries={snap?.snapshot.fplStandings ?? []}
      users={users.map((u) => {
        const p = predByUser.get(u.id);
        return {
          id: u.id,
          name: u.name,
          fplEntryId: u.fpl_entry_id,
          hasPin: !!u.pin_hash,
          submitted: !!p?.submitted_at,
          hasDraft: !!p && !p.submitted_at,
          sackedGuess: p?.first_sacked ?? null,
          sackedMatch: sackedMatches(p?.first_sacked ?? null, settings.sacked_manager),
        };
      })}
    />
  );
}

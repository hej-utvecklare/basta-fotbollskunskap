import { deadlinePassed, getSettings, getSnapshot, listUsers } from "@/lib/data";
import { supabaseAdmin } from "@/lib/supabase";
import PlTable from "@/components/PlTable";

export const dynamic = "force-dynamic";

export default async function PlPage() {
  let snap = null, settings = null;
  let overlays: { userId: string; name: string; order: number[] }[] = [];

  try {
    [snap, settings] = await Promise.all([getSnapshot(), getSettings()]);

    // Gissningar visas i overlayen först efter deadline – annars kan man tjuvkika
    if (settings && deadlinePassed(settings)) {
      const [users, { data: predictions }] = await Promise.all([
        listUsers(),
        supabaseAdmin()
          .from("predictions")
          .select("user_id, table_order")
          .not("submitted_at", "is", null),
      ]);
      const nameById = new Map(users.map((u) => [u.id, u.name]));
      overlays = (predictions ?? [])
        .filter((p) => Array.isArray(p.table_order) && nameById.has(p.user_id))
        .map((p) => ({
          userId: p.user_id,
          name: nameById.get(p.user_id)!,
          order: p.table_order as number[],
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "sv"));
    }
  } catch {}

  const teams = snap?.snapshot.teams ?? [];
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const rows = (snap?.snapshot.table ?? []).map((r) => ({
    pos: r.pos,
    teamId: r.teamId,
    name: teamById.get(r.teamId)?.name ?? String(r.teamId),
    short: teamById.get(r.teamId)?.short_name ?? "?",
    played: r.played, won: r.won, drawn: r.drawn, lost: r.lost,
    gd: r.gd, points: r.points,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Premier League-tabellen</h1>
        <p className="text-sm text-slate-600">
          Framräknad från alla färdigspelade matcher.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          Inga matcher är färdigspelade än – tabellen dyker upp efter första omgången.
        </p>
      ) : (
        <PlTable rows={rows} overlays={overlays} />
      )}
    </div>
  );
}

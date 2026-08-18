import Link from "next/link";
import { currentUser, isAdmin } from "@/lib/auth";
import { deadlinePassed, getPrediction, getSettings, getSnapshot } from "@/lib/data";
import { computeScore } from "@/lib/scoring";
import { defaultTableOrder } from "@/lib/defaultOrder";
import PredictionForm from "@/components/PredictionForm";
import { PickerPlayer } from "@/components/PlayerPicker";

export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return n.toLocaleString("sv-SE", { maximumFractionDigits: 2 });
}

export default async function GissningPage() {
  const user = await currentUser();
  if (!user) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        Du måste <Link href="/" className="font-medium text-emerald-700 underline">logga in med ditt namn</Link>{" "}
        för att lämna en gissning.
      </p>
    );
  }

  const [snap, settings, prediction] = await Promise.all([
    getSnapshot(), getSettings(), getPrediction(user.id),
  ]);

  if (!snap) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
        Ingen FPL-data har hämtats än. Be admin köra en uppdatering först.
      </p>
    );
  }

  const { teams, players } = snap.snapshot;
  const admin = isAdmin();
  const locked = (deadlinePassed(settings) || !!prediction?.submitted_at) && !admin;

  // Läsvy efter deadline / inskickning: visa gissningen med poäng per lag
  if (locked) {
    if (!prediction?.submitted_at && deadlinePassed(settings)) {
      return (
        <p className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
          Deadline har passerat och du hann inte skicka in någon gissning. Hör av dig till
          admin om du vill lämna en i efterhand.
        </p>
      );
    }
    if (!deadlinePassed(settings)) {
      return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="font-semibold text-emerald-800">✓ Din gissning är inskickad och låst.</p>
          <p className="mt-1 text-sm text-emerald-700">
            När deadline passerat visas den här, med poäng per lag under säsongen.
          </p>
        </div>
      );
    }

    const fplPoints =
      snap.snapshot.fplStandings.find((e) => e.entry === user.fpl_entry_id)?.total ?? 0;
    const score = computeScore(prediction!, snap.snapshot, settings, fplPoints);
    const teamById = new Map(teams.map((t) => [t.id, t]));
    const playerById = new Map(players.map((p) => [p.id, p]));
    const hasTable = snap.snapshot.table.length > 0;

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Din gissning</h1>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Ligatabellen</h2>
          {!hasTable && (
            <p className="mb-2 text-sm text-slate-500">
              Inga matcher spelade än – poängen visas när tabellen finns.
            </p>
          )}
          <ol className="space-y-1">
            {(prediction!.table_order ?? []).map((teamId, idx) => {
              const t = teamById.get(teamId);
              const row = score.perTeam.find((r) => r.teamId === teamId);
              const pts = hasTable && row ? row.points : null;
              return (
                <li
                  key={teamId}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                    pts == null ? "border-slate-200 bg-white"
                    : pts >= 9 ? "border-emerald-200 bg-emerald-50"
                    : pts >= 6 ? "border-lime-200 bg-lime-50"
                    : pts > 0 ? "border-amber-200 bg-amber-50"
                    : "border-red-200 bg-red-50"
                  }`}
                >
                  <span className="w-6 text-right font-mono text-slate-500">{idx + 1}.</span>
                  <span className="flex-1 font-medium">{t?.name ?? teamId}</span>
                  {hasTable && row ? (
                    <>
                      <span className="text-xs text-slate-500">nu {row.actualPos}:a</span>
                      <span className="w-12 text-right font-semibold">{fmt(row.points)}p</span>
                    </>
                  ) : (
                    <span className="w-12 text-right text-slate-400">–</span>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-right font-semibold">
            Baspoäng: {score.basePoints == null ? "–" : fmt(score.basePoints)} / 200
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="mb-2 text-base font-semibold">Bonusar</h2>
          <ul className="space-y-1">
            <li>{score.bonusWinner ? "✅" : "❌"} Ligavinnare (25 p)</li>
            <li>{score.bonusTop5 ? "✅" : "❌"} Topp 5 (25 p)</li>
            <li>{score.bonusBottom3 ? "✅" : "❌"} Botten 3 (25 p)</li>
            <li>
              {score.bonusSacked ? "✅" : "❌"} Första sparkade tränaren (25 p) – du gissade{" "}
              <span className="font-medium">”{prediction!.first_sacked}”</span>
              {!settings.sacked_decided && (
                <span className="text-slate-500"> (inte avgjord än)</span>
              )}
            </li>
            <li>
              Skyttar:{" "}
              {(prediction!.top_scorers ?? []).map((id) => (
                <span key={id} className="mr-2">
                  {score.scorerHits.includes(id) ? "✅" : "❌"} {playerById.get(id)?.web_name ?? id}
                </span>
              ))}
              ({score.scorerHits.length * 10} p)
            </li>
            <li>
              Assist:{" "}
              {(prediction!.top_assists ?? []).map((id) => (
                <span key={id} className="mr-2">
                  {score.assistHits.includes(id) ? "✅" : "❌"} {playerById.get(id)?.web_name ?? id}
                </span>
              ))}
              ({score.assistHits.length * 10} p)
            </li>
          </ul>
          <p className="mt-3 border-t border-slate-100 pt-2 font-semibold">
            Tabellpoäng: {score.tablePoints == null ? "–" : fmt(score.tablePoints)}
            {" · "}FPL: {score.fplPoints}
            {" · "}Total: {fmt(score.total)}
          </p>
        </section>
      </div>
    );
  }

  // Redigeringsläge
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));
  const pickerPlayers: PickerPlayer[] = players.map((p) => ({
    id: p.id, web_name: p.web_name, first_name: p.first_name,
    second_name: p.second_name, teamName: teamNameById.get(p.team) ?? "",
  }));

  const validSavedOrder =
    prediction?.table_order?.length === teams.length &&
    prediction.table_order.every((id) => teamNameById.has(id));

  const pad3 = (arr: number[] | null | undefined): (number | null)[] => {
    const a: (number | null)[] = [...(arr ?? [])];
    while (a.length < 3) a.push(null);
    return a.slice(0, 3);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Din gissning</h1>
      {settings.deadline && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          Deadline:{" "}
          {new Date(settings.deadline).toLocaleString("sv-SE", {
            dateStyle: "full", timeStyle: "short", timeZone: "Europe/Stockholm",
          })}
        </p>
      )}
      <PredictionForm
        teams={teams}
        players={pickerPlayers}
        initialOrder={validSavedOrder ? prediction!.table_order! : defaultTableOrder(teams)}
        initialSacked={prediction?.first_sacked ?? ""}
        initialScorers={pad3(prediction?.top_scorers)}
        initialAssists={pad3(prediction?.top_assists)}
        adminMode={admin && (deadlinePassed(settings) || !!prediction?.submitted_at)}
      />
    </div>
  );
}

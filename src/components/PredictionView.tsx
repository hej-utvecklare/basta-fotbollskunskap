// Skrivskyddad vy av en gissning. Används både för den egna gissningen efter
// deadline och för att titta på andras.

import { computeScore } from "@/lib/scoring";
import { Prediction, Settings, Snapshot } from "@/lib/types";

function fmt(n: number): string {
  return n.toLocaleString("sv-SE", { maximumFractionDigits: 2 });
}

export default function PredictionView({
  prediction, snapshot, settings, fplPoints, self,
}: {
  prediction: Prediction;
  snapshot: Snapshot;
  settings: Pick<Settings, "sacked_manager" | "sacked_decided">;
  fplPoints: number;
  /** Egen gissning ger "du gissade", annars neutralt "gissade". */
  self: boolean;
}) {
  const score = computeScore(prediction, snapshot, settings, fplPoints);
  const teamById = new Map(snapshot.teams.map((t) => [t.id, t]));
  const playerById = new Map(snapshot.players.map((p) => [p.id, p]));
  const hasTable = snapshot.table.length > 0;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-lg font-semibold">Ligatabellen</h2>
        {!hasTable && (
          <p className="mb-2 text-sm text-slate-500">
            Inga matcher spelade än – poängen visas när tabellen finns.
          </p>
        )}
        <ol className="space-y-1">
          {(prediction.table_order ?? []).map((teamId, idx) => {
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
                <span className="flex-1 truncate font-medium">{t?.name ?? teamId}</span>
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
            {score.bonusSacked ? "✅" : "❌"} Första sparkade tränaren (25 p) –{" "}
            {self ? "du gissade" : "gissade"}{" "}
            <span className="font-medium">”{prediction.first_sacked}”</span>
            {!settings.sacked_decided && (
              <span className="text-slate-500"> (inte avgjord än)</span>
            )}
          </li>
          <li>
            Skyttar:{" "}
            {(prediction.top_scorers ?? []).map((id) => (
              <span key={id} className="mr-2">
                {score.scorerHits.includes(id) ? "✅" : "❌"} {playerById.get(id)?.web_name ?? id}
              </span>
            ))}
            ({score.scorerHits.length * 10} p)
          </li>
          <li>
            Assist:{" "}
            {(prediction.top_assists ?? []).map((id) => (
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

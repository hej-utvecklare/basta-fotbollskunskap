import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { deadlinePassed, getPrediction, getSettings, getSnapshot } from "@/lib/data";
import { STEPS, predictionProgress } from "@/lib/progress";

/** Syns på alla sidor så länge deltagaren har något ofärdigt kvar och
 *  deadline inte passerat. Försvinner av sig själv när allt är ifyllt. */
export default async function ProgressBanner() {
  let user = null, prediction = null, settings = null, snap = null;
  try {
    user = await currentUser();
    if (!user) return null;
    [prediction, settings, snap] = await Promise.all([
      getPrediction(user.id), getSettings(), getSnapshot(),
    ]);
  } catch {
    return null;
  }

  if (!settings || deadlinePassed(settings)) return null;

  const teamCount = snap?.snapshot.teams.length ?? 20;
  const progress = predictionProgress(prediction, teamCount);
  if (progress.complete) return null;

  const missing = STEPS.filter((s, i) =>
    ![progress.table, progress.sacked, progress.scorers, progress.assists][i]
  );

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto max-w-3xl px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              Din gissning är inte klar – {progress.doneCount} av {progress.total} steg ifyllda
            </p>
            <p className="truncate text-xs text-amber-800">
              Kvar: {missing.map((s) => s.label).join(", ")}
            </p>
          </div>
          <Link
            href={`/gissning?steg=${STEPS[progress.nextStep - 1].slug}`}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Fortsätt
          </Link>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-200">
          <div
            className="h-full rounded-full bg-amber-600 transition-all"
            style={{ width: `${(progress.doneCount / progress.total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

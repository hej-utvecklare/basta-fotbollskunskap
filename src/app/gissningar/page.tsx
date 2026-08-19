import Link from "next/link";
import { currentUser, isAdmin } from "@/lib/auth";
import { deadlinePassed, getSettings, getSnapshot, listPredictions, listUsers } from "@/lib/data";
import { canViewPrediction, predictionProgress } from "@/lib/progress";

export const dynamic = "force-dynamic";

export default async function GissningarPage() {
  const user = await currentUser();
  if (!user) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        Du måste{" "}
        <Link href="/" className="font-medium text-emerald-700 underline">logga in</Link>{" "}
        för att se gissningarna.
      </p>
    );
  }

  const [settings, snap, users, predictions] = await Promise.all([
    getSettings(), getSnapshot(), listUsers(), listPredictions(),
  ]);

  const admin = isAdmin();
  const passed = deadlinePassed(settings);
  const teamCount = snap?.snapshot.teams.length ?? 20;
  const predByUser = new Map(predictions.map((p) => [p.user_id, p]));

  const deadlineLabel = settings.deadline
    ? new Date(settings.deadline).toLocaleString("sv-SE", {
        weekday: "long", day: "numeric", month: "long", hour: "2-digit",
        minute: "2-digit", timeZone: "Europe/Stockholm",
      })
    : null;

  const rows = users.map((u) => {
    const pred = predByUser.get(u.id) ?? null;
    return { user: u, pred, progress: predictionProgress(pred, teamCount) };
  }).sort((a, z) => a.user.name.localeCompare(z.user.name, "sv"));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Gissningarna</h1>
        <p className="text-sm text-slate-600">
          {passed || admin
            ? "Allas gissningar, med poäng per lag."
            : `Andras gissningar öppnas när deadline passerat${deadlineLabel ? ` – ${deadlineLabel}` : ""}. Fram till dess ser du bara din egen.`}
        </p>
      </div>

      {admin && !passed && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Adminläge: du ser allas gissningar redan före deadline. Deltagarna gör det inte.
        </p>
      )}

      <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows.map(({ user: u, progress }) => {
          const self = u.id === user.id;
          const visible = canViewPrediction({ deadlinePassed: passed, isAdmin: admin, isSelf: self });
          const inner = (
            <>
              <span className="min-w-0 flex-1 truncate font-medium">
                {u.name}
                {self && <span className="ml-2 text-xs text-slate-500">(du)</span>}
              </span>
              <span className="shrink-0 text-sm text-slate-500">
                {progress.complete
                  ? "Klar"
                  : `${progress.doneCount} av ${progress.total}`}
              </span>
              {visible && progress.complete && (
                <span className="shrink-0 text-slate-400">›</span>
              )}
            </>
          );
          return (
            <li key={u.id} className="border-b border-slate-100 last:border-b-0">
              {visible && progress.complete ? (
                <Link
                  href={`/gissningar/${u.id}`}
                  className="flex items-center gap-2 px-3 py-3 hover:bg-slate-50"
                >
                  {inner}
                </Link>
              ) : (
                <div className="flex items-center gap-2 px-3 py-3 text-slate-500">{inner}</div>
              )}
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="px-3 py-6 text-center text-slate-500">Inga deltagare än.</li>
        )}
      </ul>
    </div>
  );
}

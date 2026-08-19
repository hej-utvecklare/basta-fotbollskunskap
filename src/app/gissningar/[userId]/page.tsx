import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser, isAdmin } from "@/lib/auth";
import { deadlinePassed, getPrediction, getSettings, getSnapshot, listUsers } from "@/lib/data";
import { canViewPrediction, predictionProgress } from "@/lib/progress";
import PredictionView from "@/components/PredictionView";

export const dynamic = "force-dynamic";

export default async function EnGissningPage({
  params,
}: {
  params: { userId: string };
}) {
  const viewer = await currentUser();
  if (!viewer) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        Du måste{" "}
        <Link href="/" className="font-medium text-emerald-700 underline">logga in</Link>{" "}
        för att se gissningarna.
      </p>
    );
  }

  const [settings, snap, users] = await Promise.all([
    getSettings(), getSnapshot(), listUsers(),
  ]);
  const owner = users.find((u) => u.id === params.userId);
  if (!owner) notFound();

  const self = owner.id === viewer.id;
  const open = canViewPrediction({
    deadlinePassed: deadlinePassed(settings), isAdmin: isAdmin(), isSelf: self,
  });

  if (!open) {
    return (
      <div className="space-y-4">
        <Link href="/gissningar" className="text-sm text-emerald-700 underline">
          ← Alla gissningar
        </Link>
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
          {owner.name}s gissning visas först när deadline passerat.
        </p>
      </div>
    );
  }

  if (!snap) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
        Ingen FPL-data har hämtats än.
      </p>
    );
  }

  const prediction = await getPrediction(owner.id);
  const progress = predictionProgress(prediction, snap.snapshot.teams.length);

  if (!prediction || !progress.complete) {
    return (
      <div className="space-y-4">
        <Link href="/gissningar" className="text-sm text-emerald-700 underline">
          ← Alla gissningar
        </Link>
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">
          {self ? "Du har" : `${owner.name} har`} inte fyllt i hela gissningen –{" "}
          {progress.doneCount} av {progress.total} steg klara.
        </p>
      </div>
    );
  }

  const fplPoints =
    snap.snapshot.fplStandings.find((e) => e.entry === owner.fpl_entry_id)?.total ?? 0;

  return (
    <div className="space-y-4">
      <Link href="/gissningar" className="text-sm text-emerald-700 underline">
        ← Alla gissningar
      </Link>
      <h1 className="text-2xl font-bold">
        {self ? "Din gissning" : `${owner.name}s gissning`}
      </h1>
      <PredictionView
        prediction={prediction}
        snapshot={snap.snapshot}
        settings={settings}
        fplPoints={fplPoints}
        self={self}
      />
    </div>
  );
}

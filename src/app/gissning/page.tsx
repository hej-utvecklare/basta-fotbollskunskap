import Link from "next/link";
import { currentUser, isAdmin } from "@/lib/auth";
import { deadlinePassed, getPrediction, getSettings, getSnapshot } from "@/lib/data";
import { defaultTableOrder } from "@/lib/defaultOrder";
import { managerOptions } from "@/lib/managers";
import { STEPS } from "@/lib/progress";
import PredictionForm from "@/components/PredictionForm";
import PredictionView from "@/components/PredictionView";
import { PickerPlayer } from "@/components/PlayerPicker";

export const dynamic = "force-dynamic";

export default async function GissningPage({
  searchParams,
}: {
  searchParams: { steg?: string };
}) {
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
  const locked = deadlinePassed(settings) && !admin;

  // Läsvy efter deadline: visa gissningen med poäng per lag
  if (locked) {
    if (!prediction?.submitted_at) {
      return (
        <p className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
          Deadline har passerat och du hann inte skicka in någon gissning. Hör av dig till
          admin om du vill lämna en i efterhand.
        </p>
      );
    }
    const fplPoints =
      snap.snapshot.fplStandings.find((e) => e.entry === user.fpl_entry_id)?.total ?? 0;

    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Din gissning</h1>
        <p className="text-sm">
          <Link href="/gissningar" className="font-medium text-emerald-700 underline">
            Se allas gissningar
          </Link>
        </p>
        <PredictionView
          prediction={prediction!}
          snapshot={snap.snapshot}
          settings={settings}
          fplPoints={fplPoints}
          self
        />
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

  const deadlineLabel = settings.deadline
    ? new Date(settings.deadline).toLocaleString("sv-SE", {
        weekday: "long", day: "numeric", month: "long", hour: "2-digit",
        minute: "2-digit", timeZone: "Europe/Stockholm",
      })
    : null;

  const stepFromUrl = STEPS.find((s) => s.slug === searchParams.steg)?.n ?? 1;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Din gissning</h1>
      {deadlineLabel && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          Deadline: <span className="font-semibold">{deadlineLabel}</span> – fram till dess
          kan du ändra fritt.
        </p>
      )}
      <PredictionForm
        teams={teams}
        players={pickerPlayers}
        managers={managerOptions(teams)}
        initialOrder={validSavedOrder ? prediction!.table_order! : defaultTableOrder(teams)}
        initialSacked={prediction?.first_sacked ?? ""}
        initialScorers={pad3(prediction?.top_scorers)}
        initialAssists={pad3(prediction?.top_assists)}
        initialStep={stepFromUrl}
        deadlineLabel={deadlineLabel}
        alreadySubmitted={!!prediction?.submitted_at}
        adminMode={admin && deadlinePassed(settings)}
      />
    </div>
  );
}

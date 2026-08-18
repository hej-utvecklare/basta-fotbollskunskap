import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { deadlinePassed, getPrediction, getSettings, getSnapshot } from "@/lib/data";
import { STEPS, predictionProgress } from "@/lib/progress";
import LoginForm from "@/components/LoginForm";
import CopyCode from "@/components/CopyCode";
import LinkTeam from "@/components/LinkTeam";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let user = null, settings = null, snap = null, prediction = null;
  try {
    [user, settings, snap] = await Promise.all([currentUser(), getSettings(), getSnapshot()]);
    if (user) prediction = await getPrediction(user.id);
  } catch {}

  const leagueCode = settings?.league_code ?? "vyery9";
  const entries = snap?.snapshot.fplStandings ?? [];
  const teamCount = snap?.snapshot.teams.length ?? 20;
  const progress = predictionProgress(prediction, teamCount);
  const locked = settings ? deadlinePassed(settings) : false;
  const inLeague = !!user?.fpl_entry_id;

  const deadlineLabel = settings?.deadline
    ? new Date(settings.deadline).toLocaleString("sv-SE", {
        weekday: "long", day: "numeric", month: "long", hour: "2-digit",
        minute: "2-digit", timeZone: "Europe/Stockholm",
      })
    : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Bäst Fotbollskunskap 2026/27</h1>
        <p className="text-slate-600">
          Vem i gänget kan mest om Premier League? Gissa sluttabellen, skyttekungarna och
          första sparkade tränaren – och kör FPL vid sidan av. Allt räknas ihop till en total.
        </p>
        <p className="text-sm">
          <Link href="/regler" className="font-medium text-emerald-700 underline">Läs reglerna här</Link>
        </p>
      </header>

      {!user ? (
        <>
          <section className="rounded-xl border-2 border-emerald-500 bg-white p-5">
            <h2 className="text-lg font-semibold">Kom igång</h2>
            <p className="mt-1 text-sm text-slate-600">
              Skriv ditt namn så guidar vi dig genom de fyra stegen. Du kan spara och
              komma tillbaka när du vill.
            </p>
            <div className="mt-4">
              <LoginForm />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Så funkar det</h2>
            <ol className="space-y-2">
              <li><span className="font-semibold text-slate-900">1.</span> Gå med i FPL-ligan med koden <span className="font-mono font-semibold">{leagueCode}</span>.</li>
              <li><span className="font-semibold text-slate-900">2.</span> Rangordna alla 20 lagen.</li>
              <li><span className="font-semibold text-slate-900">3.</span> Gissa första sparkade tränaren.</li>
              <li><span className="font-semibold text-slate-900">4.</span> Välj topp 3 i skytteligan.</li>
              <li><span className="font-semibold text-slate-900">5.</span> Välj topp 3 i assistligan.</li>
            </ol>
            {deadlineLabel && (
              <p className="mt-3 border-t border-slate-100 pt-3">
                Deadline: <span className="font-semibold text-slate-900">{deadlineLabel}</span>.
                Fram till dess kan du ändra hur mycket du vill.
              </p>
            )}
          </section>
        </>
      ) : (
        <>
          {/* Steg 1: FPL-ligan */}
          <section className={`rounded-xl border p-5 ${inLeague ? "border-slate-200 bg-white" : "border-2 border-emerald-500 bg-emerald-50"}`}>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {inLeague ? "✓ " : "1. "}Gå med i FPL-ligan
              </h2>
              {inLeague && <span className="text-sm text-emerald-700">Klart</span>}
            </div>

            {!inLeague && (
              <>
                <p className="my-3 text-center font-mono text-4xl font-bold tracking-widest text-emerald-900">
                  {leagueCode}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <CopyCode code={leagueCode} />
                  <a
                    href={`https://fantasy.premierleague.com/leagues/auto-join/${leagueCode}`}
                    target="_blank" rel="noopener noreferrer"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Gå med i FPL-ligan direkt
                  </a>
                </div>
              </>
            )}

            <div className="mt-4">
              {entries.length > 0 ? (
                <LinkTeam entries={entries} current={user.fpl_entry_id} />
              ) : (
                <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-medium">Inga lag hittades i FPL-ligan än.</p>
                  <p className="mt-1">
                    Gå med i ligan med koden ovan och kom tillbaka efter nästa uppdatering
                    för att koppla ditt lag.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Steg 2–5: gissningen */}
          {locked ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold">Gissningen är låst</h2>
              <p className="mt-1 text-sm text-slate-600">
                Deadline har passerat.{" "}
                <Link href="/gissning" className="font-medium text-emerald-700 underline">
                  Se din gissning och dina poäng
                </Link>.
              </p>
            </section>
          ) : progress.complete ? (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="text-lg font-semibold text-emerald-900">✓ Din gissning är klar</h2>
              <p className="mt-1 text-sm text-emerald-800">
                {deadlineLabel
                  ? `Du kan ändra den fram till ${deadlineLabel}.`
                  : "Du kan ändra den fram till deadline."}
              </p>
              <Link
                href="/gissning"
                className="mt-3 inline-block rounded-lg border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Ändra gissningen
              </Link>
            </section>
          ) : (
            <section className="rounded-xl border-2 border-emerald-500 bg-white p-5">
              <h2 className="text-lg font-semibold">
                {progress.doneCount === 0 ? "2. Gör din gissning" : "Fortsätt din gissning"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Fyra steg: tabellen, tränaren, skyttarna och assistmakarna. Allt sparas
                automatiskt – du kan avbryta och komma tillbaka.
              </p>

              <ol className="my-4 space-y-1.5">
                {STEPS.map((s, i) => {
                  const done = [progress.table, progress.sacked, progress.scorers, progress.assists][i];
                  return (
                    <li key={s.slug} className="flex items-center gap-2 text-sm">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                      }`}>
                        {done ? "✓" : s.n}
                      </span>
                      <span className={done ? "text-slate-500 line-through" : "font-medium"}>
                        {s.label}
                      </span>
                    </li>
                  );
                })}
              </ol>

              <Link
                href={`/gissning?steg=${STEPS[progress.nextStep - 1].slug}`}
                className="inline-block rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                {progress.doneCount === 0 ? "Starta gissningen" : "Fortsätt där du var"}
              </Link>

              {deadlineLabel && (
                <p className="mt-3 text-sm text-slate-600">
                  Deadline: <span className="font-semibold">{deadlineLabel}</span>
                </p>
              )}
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm">
                Inloggad som <span className="font-semibold">{user.name}</span>
              </p>
              <form action={logout}>
                <button className="text-sm text-slate-500 underline hover:text-slate-700">
                  Logga ut
                </button>
              </form>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

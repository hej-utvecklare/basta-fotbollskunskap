import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { getSettings, getSnapshot } from "@/lib/data";
import LoginForm from "@/components/LoginForm";
import CopyCode from "@/components/CopyCode";
import LinkTeam from "@/components/LinkTeam";
import { logout } from "./actions";

export default async function HomePage() {
  let user = null, settings = null, snap = null;
  try {
    [user, settings, snap] = await Promise.all([currentUser(), getSettings(), getSnapshot()]);
  } catch {}

  const leagueCode = settings?.league_code ?? "vyery9";
  const entries = snap?.snapshot.fplStandings ?? [];

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

      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
          FPL-ligans kod
        </h2>
        <p className="my-2 font-mono text-4xl font-bold tracking-widest text-emerald-900">
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
      </section>

      {!user ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold">Gå med i tävlingen</h2>
          <LoginForm />
        </section>
      ) : (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p>
              Inloggad som <span className="font-semibold">{user.name}</span>
            </p>
            <form action={logout}>
              <button className="text-sm text-slate-500 underline hover:text-slate-700">
                Logga ut
              </button>
            </form>
          </div>

          {entries.length > 0 ? (
            <LinkTeam entries={entries} current={user.fpl_entry_id} />
          ) : (
            <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Inga lag hittades i FPL-ligan än.</p>
              <p className="mt-1">
                Gå med i ligan med koden ovan (eller auto-join-länken) och kom tillbaka hit
                efter nästa uppdatering för att koppla ditt lag.
              </p>
            </div>
          )}

          {user.fpl_entry_id && (
            <p className="text-sm text-emerald-700">
              ✓ Ditt FPL-lag är kopplat. Nästa steg:{" "}
              <Link href="/gissning" className="font-medium underline">lämna din gissning</Link>.
            </p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Så funkar det</h2>
        <ol className="list-inside list-decimal space-y-1">
          <li>Gå med i FPL-ligan med koden ovan.</li>
          <li>Skriv ditt namn här och koppla ditt FPL-lag.</li>
          <li>Fyll i din gissning innan deadline – tabell, tränare, skyttar och assist.</li>
          <li>Följ ställningen på <Link href="/tabell" className="text-emerald-700 underline">Ligatabellen</Link> under hela säsongen.</li>
        </ol>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  ActionResult, adminDeleteUser, adminImpersonate, adminLogin, adminRefresh,
  adminSaveSacked, adminSaveSettings, adminSetUserTeam, adminUnlockPrediction,
} from "@/app/actions";

function Btn({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit" disabled={pending}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
        danger ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
      }`}
    >
      {pending ? "…" : children}
    </button>
  );
}

function Msg({ state }: { state: ActionResult | null }) {
  if (!state?.message) return null;
  return (
    <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>
  );
}

export function AdminLoginForm() {
  const [state, action] = useFormState<ActionResult | null, FormData>(adminLogin, null);
  return (
    <form action={action} className="mx-auto max-w-sm space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <h1 className="text-lg font-semibold">Admin</h1>
      <input
        type="password" name="password" placeholder="Adminlösenord" required
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
      />
      <Msg state={state} />
      <Btn>Logga in</Btn>
    </form>
  );
}

type FplEntry = { entry: number; entry_name: string; player_name: string };

function UserCard({ user: u, fplEntries }: { user: AdminUser; fplEntries: FplEntry[] }) {
  const [teamState, teamAction] = useFormState<ActionResult | null, FormData>(adminSetUserTeam, null);
  const [unlockState, unlockAction] = useFormState<ActionResult | null, FormData>(adminUnlockPrediction, null);
  const [impState, impAction] = useFormState<ActionResult | null, FormData>(adminImpersonate, null);
  const [delState, delAction] = useFormState<ActionResult | null, FormData>(adminDeleteUser, null);
  const msg = [teamState, unlockState, impState, delState].find((s) => s?.message) ?? null;

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="font-medium">
        {u.name}{" "}
        <span className="text-xs font-normal text-slate-500">
          {u.email ? `· ${u.email}` : "· ingen e-post"}
          {u.submitted ? " · gissning inskickad" : u.hasDraft ? " · utkast" : " · ingen gissning"}
        </span>
      </p>
      <form action={teamAction} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="user_id" value={u.id} />
        <select
          name="entry" defaultValue={u.fplEntryId ?? ""}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">Inget FPL-lag kopplat</option>
          {fplEntries.map((e) => (
            <option key={e.entry} value={e.entry}>
              {e.entry_name} ({e.player_name})
            </option>
          ))}
        </select>
        <Btn>Spara koppling</Btn>
      </form>
      <div className="mt-2 flex flex-wrap gap-2">
        {u.submitted && (
          <form action={unlockAction}>
            <input type="hidden" name="user_id" value={u.id} />
            <Btn>Lås upp gissning</Btn>
          </form>
        )}
        <form action={impAction}>
          <input type="hidden" name="user_id" value={u.id} />
          <Btn>Logga in som</Btn>
        </form>
        <form
          action={delAction}
          onSubmit={(e) => {
            if (!confirm(`Radera ${u.name} och all hens data?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="user_id" value={u.id} />
          <Btn danger>Radera</Btn>
        </form>
      </div>
      <Msg state={msg} />
    </div>
  );
}

type AdminUser = {
  id: string;
  name: string;
  fplEntryId: number | null;
  email: string | null;
  submitted: boolean;
  hasDraft: boolean;
  sackedGuess: string | null;
  sackedMatch: boolean;
};

type Props = {
  deadline: string | null; // som datetime-local-sträng (Europe/Stockholm)
  leagueCode: string;
  leagueId: number | null;
  sackedManager: string | null;
  sackedDecided: boolean;
  users: AdminUser[];
  fplEntries: FplEntry[];
};

export function AdminPanel({
  deadline, leagueCode, leagueId, sackedManager, sackedDecided, users, fplEntries,
}: Props) {
  const [settingsState, settingsAction] = useFormState<ActionResult | null, FormData>(adminSaveSettings, null);
  const [sackedState, sackedAction] = useFormState<ActionResult | null, FormData>(adminSaveSacked, null);
  const [refreshState, setRefreshState] = useState<ActionResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Uppdatera data</h2>
        <button
          type="button" disabled={refreshing}
          onClick={async () => {
            setRefreshing(true);
            setRefreshState(await adminRefresh());
            setRefreshing(false);
          }}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {refreshing ? "Hämtar från FPL…" : "Uppdatera nu"}
        </button>
        <Msg state={refreshState} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Inställningar</h2>
        <form action={settingsAction} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Deadline för gissningen</label>
            <input
              type="datetime-local" name="deadline" defaultValue={deadline ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-slate-500">
              Lämna tomt för ingen deadline. En passerad deadline låser formuläret för alla utom admin.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">FPL-ligakod</label>
              <input
                name="league_code" defaultValue={leagueCode}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">FPL-liga-ID</label>
              <input
                name="league_id" inputMode="numeric" defaultValue={leagueId ?? ""}
                placeholder="från env om tomt"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
          <Msg state={settingsState} />
          <Btn>Spara inställningar</Btn>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Första sparkade tränaren</h2>
        <form action={sackedAction} className="space-y-3">
          <input
            name="sacked_manager" defaultValue={sackedManager ?? ""}
            placeholder="Tränarens namn (facit)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="sacked_decided" defaultChecked={sackedDecided} />
            Avgjord – dela ut bonusen
          </label>
          <Msg state={sackedState} />
          <Btn>Spara tränarfacit</Btn>
        </form>
        <div className="mt-4 border-t border-slate-100 pt-3">
          <h3 className="mb-1 text-sm font-medium text-slate-700">Deltagarnas svar</h3>
          <ul className="space-y-0.5 text-sm">
            {users.filter((u) => u.sackedGuess).map((u) => (
              <li key={u.id}>
                {u.sackedMatch ? "✅" : "❌"} <span className="font-medium">{u.name}:</span>{" "}
                ”{u.sackedGuess}”
              </li>
            ))}
            {users.every((u) => !u.sackedGuess) && (
              <li className="text-slate-500">Inga svar än.</li>
            )}
          </ul>
          <p className="mt-1 text-xs text-slate-500">
            Matchning är case-insensitiv med trimmad whitespace. Rätta felstavningar genom att
            ändra facit ovan så det matchar, eller be användaren höra av sig.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Deltagare</h2>
        <div className="space-y-4">
          {users.map((u) => (
            <UserCard key={u.id} user={u} fplEntries={fplEntries} />
          ))}
          {users.length === 0 && <p className="text-sm text-slate-500">Inga deltagare än.</p>}
        </div>
      </section>
    </div>
  );
}

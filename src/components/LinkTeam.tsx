"use client";

import { useFormState, useFormStatus } from "react-dom";
import { linkFplTeam, ActionResult } from "@/app/actions";

type Entry = { entry: number; entry_name: string; player_name: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit" disabled={pending}
      className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
    >
      {pending ? "Sparar…" : "Koppla laget"}
    </button>
  );
}

export default function LinkTeam({ entries, current }: { entries: Entry[]; current: number | null }) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(linkFplTeam, null);
  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="entry" className="block text-sm font-medium">Välj ditt FPL-lag i ligan</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          id="entry" name="entry" defaultValue={current ?? ""}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
        >
          <option value="" disabled>Välj lag…</option>
          {entries.map((e) => (
            <option key={e.entry} value={e.entry}>
              {e.entry_name} ({e.player_name})
            </option>
          ))}
        </select>
        <SubmitButton />
      </div>
      {state?.message && (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>
      )}
    </form>
  );
}

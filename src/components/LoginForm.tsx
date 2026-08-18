"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login, ActionResult } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
    >
      {pending ? "Loggar in…" : "Gå med / logga in"}
    </button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(login, null);
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">Ditt namn</label>
        <input
          id="name" name="name" required autoComplete="name"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          placeholder="T.ex. Kalle"
        />
      </div>
      <div>
        <label htmlFor="pin" className="mb-1 block text-sm font-medium">
          PIN <span className="font-normal text-slate-500">(valfritt, fyra siffror)</span>
        </label>
        <input
          id="pin" name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          placeholder="1234"
        />
        <p className="mt-1 text-xs text-slate-500">
          Sätter du ett PIN vid registrering krävs det vid inloggning från en ny enhet.
        </p>
      </div>
      {state && !state.ok && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}
      <SubmitButton />
    </form>
  );
}

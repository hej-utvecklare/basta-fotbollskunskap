"use client";

import { useState } from "react";
import { ManagerOption } from "@/lib/managers";

const OTHER = "__annan__";

/** Dropdown över ligans tränare. "Annan" finns kvar som utväg om listan
 *  hunnit bli inaktuell innan deadline. */
export default function ManagerPicker({
  options, value, onChange,
}: {
  options: ManagerOption[];
  value: string;
  onChange: (name: string) => void;
}) {
  const known = options.some((o) => o.manager === value);
  const [custom, setCustom] = useState(!known && value.trim().length > 0);

  return (
    <div className="space-y-2">
      <select
        value={custom ? OTHER : known ? value : ""}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
      >
        <option value="">Välj tränare…</option>
        {options.map((o) => (
          <option key={o.manager} value={o.manager}>
            {o.manager} – {o.teamName}
          </option>
        ))}
        <option value={OTHER}>Annan (skriv själv)…</option>
      </select>

      {custom && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tränarens namn"
          autoFocus
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
      )}

      {value.trim() && (
        <p className="text-sm text-emerald-700">
          Vald: <span className="font-medium">{value}</span>
        </p>
      )}
    </div>
  );
}

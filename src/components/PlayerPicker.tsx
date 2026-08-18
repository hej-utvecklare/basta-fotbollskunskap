"use client";

import { useMemo, useRef, useState } from "react";

export type PickerPlayer = {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  teamName: string;
};

/** Sökbar dropdown för att välja en spelare ur elements[]. */
export default function PlayerPicker({
  players, value, onChange, placeholder,
}: {
  players: PickerPlayer[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();

  const selected = players.find((p) => p.id === value) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return players
      .filter((p) =>
        `${p.first_name} ${p.second_name} ${p.web_name}`.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [players, query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5">
        <span>
          <span className="font-medium">{selected.web_name}</span>{" "}
          <span className="text-sm text-slate-500">({selected.teamName})</span>
        </span>
        <button
          type="button"
          onClick={() => { onChange(null); setQuery(""); }}
          className="text-sm text-slate-500 underline hover:text-red-600"
        >
          Ändra
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={() => { clearTimeout(blurTimer.current); onChange(p.id); setQuery(""); setOpen(false); }}
                className="flex w-full items-baseline justify-between px-3 py-2 text-left hover:bg-emerald-50"
              >
                <span>{p.first_name} {p.second_name}</span>
                <span className="text-xs text-slate-500">{p.teamName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim().length >= 2 && matches.length === 0 && (
        <p className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">
          Ingen spelare matchar sökningen.
        </p>
      )}
    </div>
  );
}

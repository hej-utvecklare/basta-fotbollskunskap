"use client";

import { useMemo, useState } from "react";

export type PickerPlayer = {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  teamName: string;
};

/** Väljare för en spelare. Går att använda på två sätt: välj lag i dropdownen
 *  och bläddra bland lagets spelare, eller sök på namn över hela ligan.
 *  Sökrutan ensam räckte inte – man måste kunna stava rätt för att hitta någon. */
export default function PlayerPicker({
  players, value, onChange, label,
}: {
  players: PickerPlayer[];
  value: number | null;
  onChange: (id: number | null) => void;
  label: string;
}) {
  const [team, setTeam] = useState("");
  const [query, setQuery] = useState("");

  const selected = players.find((p) => p.id === value) ?? null;

  const teams = useMemo(
    () => [...new Set(players.map((p) => p.teamName))].sort((a, b) => a.localeCompare(b, "sv")),
    [players]
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = players;
    if (team) list = list.filter((p) => p.teamName === team);
    if (q) {
      list = list.filter((p) =>
        `${p.first_name} ${p.second_name} ${p.web_name}`.toLowerCase().includes(q)
      );
    }
    // Utan både lag och sökning blir listan 590 spelare lång – visa inget då.
    if (!team && !q) return [];
    return [...list]
      .sort((a, b) => a.second_name.localeCompare(b.second_name, "sv"))
      .slice(0, 60);
  }, [players, team, query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5">
        <span className="min-w-0 truncate">
          <span className="font-medium">{selected.first_name} {selected.second_name}</span>{" "}
          <span className="text-sm text-slate-500">({selected.teamName})</span>
        </span>
        <button
          type="button"
          onClick={() => { onChange(null); setQuery(""); }}
          className="shrink-0 text-sm text-slate-500 underline hover:text-red-600"
        >
          Byt
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 sm:w-1/2"
        >
          <option value="">Välj lag…</option>
          {teams.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="…eller sök på namn"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 sm:w-1/2"
        />
      </div>

      {matches.length > 0 && (
        <ul className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => { onChange(p.id); setQuery(""); setTeam(""); }}
                className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left hover:bg-emerald-50"
              >
                <span className="min-w-0 truncate">{p.first_name} {p.second_name}</span>
                <span className="shrink-0 text-xs text-slate-500">{p.teamName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {(team || query.trim()) && matches.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
          Ingen spelare matchar.
        </p>
      )}

      {!team && !query.trim() && (
        <p className="text-xs text-slate-500">
          Välj ett lag för att bläddra bland spelarna, eller börja skriva ett namn.
        </p>
      )}
    </div>
  );
}

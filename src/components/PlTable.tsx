"use client";

import { useState } from "react";

type Row = {
  pos: number; name: string; short: string;
  played: number; won: number; drawn: number; lost: number;
  gd: number; points: number; teamId: number;
};

type Overlay = { userId: string; name: string; order: number[] };

export default function PlTable({ rows, overlays }: { rows: Row[]; overlays: Overlay[] }) {
  const [selected, setSelected] = useState<string>("");
  const overlay = overlays.find((o) => o.userId === selected) ?? null;
  const guessedPos = overlay
    ? new Map(overlay.order.map((teamId, i) => [teamId, i + 1]))
    : null;

  return (
    <div className="space-y-3">
      {overlays.length > 0 && (
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Jämför med en deltagares gissning…</option>
          {overlays.map((o) => (
            <option key={o.userId} value={o.userId}>{o.name}</option>
          ))}
        </select>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2 text-right">#</th>
              <th className="px-2 py-2">Lag</th>
              <th className="px-2 py-2 text-right">S</th>
              <th className="px-2 py-2 text-right">V</th>
              <th className="px-2 py-2 text-right">O</th>
              <th className="px-2 py-2 text-right">F</th>
              <th className="px-2 py-2 text-right">MS</th>
              <th className="px-2 py-2 text-right">P</th>
              {overlay && <th className="px-2 py-2 text-right">Gissning</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const g = guessedPos?.get(r.teamId);
              const diff = g == null ? null : Math.abs(g - r.pos);
              return (
                <tr
                  key={r.teamId}
                  className={`border-b border-slate-100 last:border-b-0 ${
                    diff == null ? ""
                    : diff === 0 ? "bg-emerald-50"
                    : diff <= 2 ? "bg-lime-50"
                    : diff <= 6 ? "bg-amber-50"
                    : "bg-red-50"
                  }`}
                >
                  <td className="px-2 py-1.5 text-right font-mono text-slate-500">{r.pos}</td>
                  <td className="px-2 py-1.5 font-medium">
                    <span className="sm:hidden">{r.short}</span>
                    <span className="hidden sm:inline">{r.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right">{r.played}</td>
                  <td className="px-2 py-1.5 text-right">{r.won}</td>
                  <td className="px-2 py-1.5 text-right">{r.drawn}</td>
                  <td className="px-2 py-1.5 text-right">{r.lost}</td>
                  <td className="px-2 py-1.5 text-right">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                  <td className="px-2 py-1.5 text-right font-bold">{r.points}</td>
                  {overlay && (
                    <td className="px-2 py-1.5 text-right">
                      {g == null ? "–" : (
                        <>
                          {g}:a{" "}
                          <span className="text-xs text-slate-500">
                            ({diff === 0 ? "rätt!" : `${g! > r.pos ? "+" : "−"}${diff}`})
                          </span>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {overlay && (
        <p className="text-xs text-slate-500">
          Färgkod: grönt = rätt plats, ljusgrönt = 1–2 fel, gult = 3–6 fel, rött = 7+ fel.
        </p>
      )}
    </div>
  );
}

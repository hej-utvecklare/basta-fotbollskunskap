"use client";

import Link from "next/link";
import { useState } from "react";

export type LeaderboardRow = {
  userId: string;
  name: string;
  basePoints: number | null;
  bonusPoints: number;
  tablePoints: number | null;
  fplPoints: number;
  total: number;
  delta: number | null; // förändring i total sedan förra gameweeken
  bonuses: { label: string; hit: boolean }[];
  worstGuesses: { team: string; guessed: number; actual: number; points: number }[];
  scorerHits: string[];
  assistHits: string[];
};

function fmt(n: number | null): string {
  if (n == null) return "–";
  return n.toLocaleString("sv-SE", { maximumFractionDigits: 2 });
}

export default function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-[2rem_1fr_4rem_4rem_4.5rem] gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>#</span><span>Namn</span>
        <span className="text-right">Tabell</span>
        <span className="text-right">FPL</span>
        <span className="text-right">Total</span>
      </div>
      {rows.map((row, i) => {
        const open = openId === row.userId;
        return (
          <div key={row.userId} className="border-b border-slate-100 last:border-b-0">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : row.userId)}
              className="grid w-full grid-cols-[2rem_1fr_4rem_4rem_4.5rem] items-center gap-1 px-3 py-2.5 text-left text-sm hover:bg-slate-50"
            >
              <span className="font-mono text-slate-500">{i + 1}</span>
              <span className="truncate font-medium">
                {row.name}
                {row.delta != null && row.delta !== 0 && (
                  <span className={`ml-2 text-xs ${row.delta > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {row.delta > 0 ? "▲" : "▼"} {fmt(Math.abs(row.delta))}
                  </span>
                )}
              </span>
              <span className="text-right">{fmt(row.tablePoints)}</span>
              <span className="text-right">{row.fplPoints}</span>
              <span className="text-right font-bold">{fmt(row.total)}</span>
            </button>
            {open && (
              <div className="space-y-3 bg-slate-50 px-4 py-3 text-sm">
                <p>
                  Baspoäng: <span className="font-semibold">{fmt(row.basePoints)}</span> / 200
                  {" · "}Bonus: <span className="font-semibold">{fmt(row.bonusPoints)}</span> / 160
                </p>
                <div>
                  <p className="mb-1 font-medium text-slate-700">Bonusar</p>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-4">
                    {row.bonuses.map((b) => (
                      <li key={b.label}>{b.hit ? "✅" : "❌"} {b.label}</li>
                    ))}
                  </ul>
                  {(row.scorerHits.length > 0 || row.assistHits.length > 0) && (
                    <p className="mt-1 text-xs text-slate-600">
                      {row.scorerHits.length > 0 && <>Skyttar rätt: {row.scorerHits.join(", ")}. </>}
                      {row.assistHits.length > 0 && <>Assist rätt: {row.assistHits.join(", ")}.</>}
                    </p>
                  )}
                </div>
                {row.worstGuesses.length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-slate-700">Sämsta gissningarna</p>
                    <ul className="space-y-0.5 text-xs text-slate-600">
                      {row.worstGuesses.map((w) => (
                        <li key={w.team}>
                          {w.team}: gissade {w.guessed}:a, ligger {w.actual}:a ({fmt(w.points)} p)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Link
                  href={`/gissningar/${row.userId}`}
                  className="inline-block font-medium text-emerald-700 underline"
                >
                  Se hela gissningen
                </Link>
              </div>
            )}
          </div>
        );
      })}
      {rows.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          Inga inskickade gissningar än.
        </p>
      )}
    </div>
  );
}

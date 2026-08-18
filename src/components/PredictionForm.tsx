"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext, DragEndEvent, PointerSensor, TouchSensor, closestCenter,
  useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveDraft, submitPrediction } from "@/app/actions";
import PlayerPicker, { PickerPlayer } from "./PlayerPicker";

type Team = { id: number; name: string; short_name: string };

type Props = {
  teams: Team[];
  players: PickerPlayer[];
  initialOrder: number[];
  initialSacked: string;
  initialScorers: (number | null)[];
  initialAssists: (number | null)[];
  adminMode: boolean;
};

function SortableRow({
  team, pos, teamCount, onMove,
}: {
  team: Team; pos: number; teamCount: number; onMove: (from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: team.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5 ${
        isDragging ? "z-10 border-emerald-400 shadow-lg" : "border-slate-200"
      }`}
    >
      <input
        type="number" min={1} max={teamCount} value={pos}
        aria-label={`Placering för ${team.name}`}
        onChange={(e) => {
          const target = Number(e.target.value);
          if (target >= 1 && target <= teamCount) onMove(pos - 1, target - 1);
        }}
        className="w-12 rounded-md border border-slate-300 px-1 py-1 text-center text-sm"
      />
      <span className="flex-1 truncate font-medium">{team.name}</span>
      <button
        type="button"
        {...attributes} {...listeners}
        className="cursor-grab touch-none rounded-md px-2 py-1 text-slate-400 active:cursor-grabbing"
        aria-label={`Dra för att flytta ${team.name}`}
      >
        ⠿
      </button>
    </li>
  );
}

export default function PredictionForm({
  teams, players, initialOrder, initialSacked, initialScorers, initialAssists, adminMode,
}: Props) {
  const [order, setOrder] = useState<number[]>(initialOrder);
  const [sacked, setSacked] = useState(initialSacked);
  const [scorers, setScorers] = useState<(number | null)[]>(initialScorers);
  const [assists, setAssists] = useState<(number | null)[]>(initialAssists);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  );

  // Autospara utkast med debounce så inget tappas vid omladdning
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (done) return;
    setSaveState("saving");
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const res = await saveDraft({
        tableOrder: order,
        firstSacked: sacked,
        topScorers: scorers.filter((x): x is number => x != null),
        topAssists: assists.filter((x): x is number => x != null),
      });
      setSaveState(res.ok ? "saved" : "error");
    }, 800);
    return () => clearTimeout(debounce.current);
  }, [order, sacked, scorers, assists, done]);

  const move = useCallback((from: number, to: number) => {
    setOrder((o) => arrayMove(o, from, to));
  }, []);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((o) => arrayMove(o, o.indexOf(Number(active.id)), o.indexOf(Number(over.id))));
    }
  };

  const complete =
    order.length === teams.length &&
    sacked.trim().length > 0 &&
    scorers.every((x) => x != null) && new Set(scorers).size === 3 &&
    assists.every((x) => x != null) && new Set(assists).size === 3;

  const onSubmit = async () => {
    if (!complete || submitting) return;
    if (!confirm("Skicka in slutgiltigt? Gissningen låses och kan inte ändras.")) return;
    setSubmitting(true);
    const res = await submitPrediction({
      tableOrder: order,
      firstSacked: sacked,
      topScorers: scorers as number[],
      topAssists: assists as number[],
    });
    setSubmitMsg({ ok: res.ok, text: res.message ?? (res.ok ? "Inskickad!" : "Något gick fel.") });
    if (res.ok) setDone(true);
    setSubmitting(false);
  };

  const pickerSection = (
    label: string, values: (number | null)[],
    setValues: (v: (number | null)[]) => void
  ) => (
    <div className="space-y-2">
      {values.map((v, i) => (
        <PlayerPicker
          key={i}
          players={players.filter((p) => p.id === v || !values.includes(p.id))}
          value={v}
          onChange={(id) => {
            const next = [...values];
            next[i] = id;
            setValues(next);
          }}
          placeholder={`${label} ${i + 1} – sök spelare…`}
        />
      ))}
    </div>
  );

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-lg font-semibold text-emerald-800">✓ {submitMsg?.text}</p>
        <p className="mt-2 text-sm text-emerald-700">
          Du kan se din gissning här när deadline passerat.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {adminMode && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Adminläge: du redigerar trots deadline/lås.
        </p>
      )}

      <section>
        <h2 className="mb-1 text-lg font-semibold">1. Ligatabellen</h2>
        <p className="mb-3 text-sm text-slate-600">
          Rangordna alla {teams.length} lagen. Dra i handtaget eller skriv en placering i rutan.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ol className="space-y-1.5">
              {order.map((teamId, idx) => {
                const team = teamById.get(teamId);
                if (!team) return null;
                return (
                  <SortableRow
                    key={teamId} team={team} pos={idx + 1}
                    teamCount={teams.length} onMove={move}
                  />
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">2. Första sparkade tränaren</h2>
        <p className="mb-3 text-sm text-slate-600">
          Vilken PL-tränare får sparken först? Skriv namnet.
        </p>
        <input
          value={sacked}
          onChange={(e) => setSacked(e.target.value)}
          placeholder="T.ex. Ruben Amorim"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">3. Topp 3 i skytteligan</h2>
        <p className="mb-3 text-sm text-slate-600">Ordningen spelar ingen roll.</p>
        {pickerSection("Skytt", scorers, setScorers)}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">4. Topp 3 i assistligan</h2>
        <p className="mb-3 text-sm text-slate-600">Ordningen spelar ingen roll.</p>
        {pickerSection("Assistmakare", assists, setAssists)}
      </section>

      <div className="sticky bottom-0 -mx-3 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {saveState === "saving" && "Sparar utkast…"}
            {saveState === "saved" && "✓ Utkast sparat"}
            {saveState === "error" && "⚠ Utkastet kunde inte sparas"}
          </span>
          <button
            type="button" onClick={onSubmit} disabled={!complete || submitting}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Skickar…" : "Skicka in slutgiltigt"}
          </button>
        </div>
        {!complete && (
          <p className="mt-1 text-right text-xs text-slate-500">
            Fyll i alla fält för att kunna skicka in.
          </p>
        )}
        {submitMsg && !submitMsg.ok && (
          <p className="mt-1 text-right text-sm text-red-700">{submitMsg.text}</p>
        )}
      </div>
    </div>
  );
}

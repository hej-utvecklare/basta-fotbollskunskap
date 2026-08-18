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
import { STEPS } from "@/lib/progress";
import { ManagerOption } from "@/lib/managers";
import PlayerPicker, { PickerPlayer } from "./PlayerPicker";
import ManagerPicker from "./ManagerPicker";

type Team = { id: number; name: string; short_name: string };

type Props = {
  teams: Team[];
  players: PickerPlayer[];
  managers: ManagerOption[];
  initialOrder: number[];
  initialSacked: string;
  initialScorers: (number | null)[];
  initialAssists: (number | null)[];
  initialStep: number;
  deadlineLabel: string | null;
  alreadySubmitted: boolean;
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
  teams, players, managers, initialOrder, initialSacked, initialScorers,
  initialAssists, initialStep, deadlineLabel, alreadySubmitted, adminMode,
}: Props) {
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), STEPS.length));
  const [order, setOrder] = useState<number[]>(initialOrder);
  const [sacked, setSacked] = useState(initialSacked);
  const [scorers, setScorers] = useState<(number | null)[]>(initialScorers);
  const [assists, setAssists] = useState<(number | null)[]>(initialAssists);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(alreadySubmitted);

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  );

  const stepDone = [
    order.length === teams.length && new Set(order).size === teams.length,
    sacked.trim().length > 0,
    scorers.every((x) => x != null) && new Set(scorers).size === 3,
    assists.every((x) => x != null) && new Set(assists).size === 3,
  ];
  const complete = stepDone.every(Boolean);

  // Håll adressfältet i takt med steget så att en omladdning landar rätt.
  useEffect(() => {
    const slug = STEPS[step - 1].slug;
    window.history.replaceState(null, "", `?steg=${slug}`);
  }, [step]);

  // Autospara – bara det aktuella stegets data, så ett halvfyllt steg
  // aldrig skriver över något man redan sparat.
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
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
  }, [order, sacked, scorers, assists]);

  const move = useCallback((from: number, to: number) => {
    setOrder((o) => arrayMove(o, from, to));
  }, []);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((o) => arrayMove(o, o.indexOf(Number(active.id)), o.indexOf(Number(over.id))));
    }
  };

  const onSubmit = async () => {
    if (!complete || submitting) return;
    setSubmitting(true);
    const res = await submitPrediction({
      tableOrder: order,
      firstSacked: sacked,
      topScorers: scorers as number[],
      topAssists: assists as number[],
    });
    setSubmitMsg({ ok: res.ok, text: res.message ?? (res.ok ? "Inskickad!" : "Något gick fel.") });
    if (res.ok) setSubmitted(true);
    setSubmitting(false);
  };

  const pickerSection = (
    label: string, values: (number | null)[],
    setValues: (v: (number | null)[]) => void
  ) => (
    <div className="space-y-3">
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
          label={`${label} ${i + 1}`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {adminMode && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Adminläge: du redigerar trots att deadline passerat.
        </p>
      )}

      {submitted && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          ✓ Din gissning är inskickad.{" "}
          {deadlineLabel
            ? `Du kan ändra den fram till ${deadlineLabel}.`
            : "Du kan ändra den fram till deadline."}
        </p>
      )}

      {/* Stegindikator */}
      <ol className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <li key={s.slug} className="flex-1">
            <button
              type="button"
              onClick={() => setStep(s.n)}
              className={`w-full rounded-lg border px-1 py-2 text-center text-xs font-medium transition ${
                step === s.n
                  ? "border-emerald-500 bg-emerald-600 text-white"
                  : stepDone[i]
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <span className="block text-base leading-none">
                {stepDone[i] ? "✓" : s.n}
              </span>
              <span className="mt-1 block truncate">{s.short}</span>
            </button>
          </li>
        ))}
      </ol>

      <section>
        <h2 className="mb-1 text-lg font-semibold">
          {step}. {STEPS[step - 1].label}
        </h2>

        {step === 1 && (
          <>
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
          </>
        )}

        {step === 2 && (
          <>
            <p className="mb-3 text-sm text-slate-600">
              Vilken tränare får sparken först? Välj i listan.
            </p>
            <ManagerPicker options={managers} value={sacked} onChange={setSacked} />
          </>
        )}

        {step === 3 && (
          <>
            <p className="mb-3 text-sm text-slate-600">
              Tre spelare du tror gör flest mål. Ordningen spelar ingen roll – varje rätt
              namn ger 10 poäng.
            </p>
            {pickerSection("Skytt", scorers, setScorers)}
          </>
        )}

        {step === 4 && (
          <>
            <p className="mb-3 text-sm text-slate-600">
              Tre spelare du tror gör flest assist. Ordningen spelar ingen roll.
            </p>
            {pickerSection("Assistmakare", assists, setAssists)}
          </>
        )}
      </section>

      <div className="sticky bottom-0 -mx-3 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-30"
          >
            Tillbaka
          </button>

          <span className="flex-1 text-center text-xs text-slate-500">
            {saveState === "saving" && "Sparar…"}
            {saveState === "saved" && "✓ Utkast sparat"}
            {saveState === "error" && "⚠ Kunde inte spara"}
            {saveState === "idle" && `Steg ${step} av ${STEPS.length}`}
          </span>

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {stepDone[step - 1] ? "Fortsätt" : "Fortsätt ändå"}
            </button>
          ) : (
            <button
              type="button" onClick={onSubmit} disabled={!complete || submitting}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Skickar…" : submitted ? "Spara ändringar" : "Skicka in"}
            </button>
          )}
        </div>

        {step === STEPS.length && !complete && (
          <p className="mt-1 text-right text-xs text-slate-500">
            Klart i {stepDone.filter(Boolean).length} av {STEPS.length} steg – fyll i resten
            för att kunna skicka in.
          </p>
        )}
        {submitMsg && (
          <p className={`mt-1 text-right text-sm ${submitMsg.ok ? "text-emerald-700" : "text-red-700"}`}>
            {submitMsg.text}
          </p>
        )}
      </div>
    </div>
  );
}

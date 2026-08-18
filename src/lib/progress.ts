// Hur långt en deltagare kommit i det guidade flödet. Används både av
// widgeten i layouten och av landningssidans CTA, så logiken bor på ett ställe.

import { Prediction } from "./types";

export const STEPS = [
  { n: 1, slug: "tabell", label: "Ligatabellen", short: "Tabell" },
  { n: 2, slug: "tranare", label: "Första sparkade tränaren", short: "Tränare" },
  { n: 3, slug: "skyttar", label: "Topp 3 i skytteligan", short: "Skyttar" },
  { n: 4, slug: "assist", label: "Topp 3 i assistligan", short: "Assist" },
] as const;

export type StepSlug = (typeof STEPS)[number]["slug"];

export type Progress = {
  table: boolean;
  sacked: boolean;
  scorers: boolean;
  assists: boolean;
  doneCount: number;
  total: number;
  complete: boolean;
  /** Första steget som inte är klart, eller sista steget om allt är klart. */
  nextStep: number;
};

export function predictionProgress(
  prediction: Prediction | null,
  teamCount: number
): Progress {
  const order = prediction?.table_order ?? [];
  const table = teamCount > 0 && order.length === teamCount && new Set(order).size === teamCount;
  const sacked = !!prediction?.first_sacked?.trim();
  const scorers = (prediction?.top_scorers ?? []).length === 3 &&
    new Set(prediction!.top_scorers!).size === 3;
  const assists = (prediction?.top_assists ?? []).length === 3 &&
    new Set(prediction!.top_assists!).size === 3;

  const flags = [table, sacked, scorers, assists];
  const doneCount = flags.filter(Boolean).length;
  const firstMissing = flags.findIndex((f) => !f);

  return {
    table, sacked, scorers, assists,
    doneCount,
    total: flags.length,
    complete: doneCount === flags.length,
    nextStep: firstMissing === -1 ? flags.length : firstMissing + 1,
  };
}

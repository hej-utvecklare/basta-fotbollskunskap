// Poängmotorn. Rena funktioner utan I/O så att allt går att enhetstesta.

import { Player, Prediction, ScoreBreakdown, Settings, Snapshot, TeamScore } from "./types";

/** Tabellpoäng för ett lag: max(0, 10 - fel²/4).
 *  Trappa: 10 / 9,75 / 9 / 7,75 / 6 / 3,75 / 1 / 0 (från 7 fel). */
export function teamPoints(guessedPos: number, actualPos: number): number {
  const err = Math.abs(guessedPos - actualPos);
  return Math.max(0, 10 - (err * err) / 4);
}

/** Topp N med generös hantering av delad placering: alla spelare som har
 *  minst lika många som spelaren på plats N räknas in. Spelare med 0 räknas
 *  aldrig (annars vore "topp 3" hela ligan innan säsongen börjat). */
export function topNWithTies(
  players: { id: number; stat: number }[],
  n: number
): Set<number> {
  const sorted = [...players].filter((p) => p.stat > 0).sort((a, b) => b.stat - a.stat);
  if (sorted.length === 0) return new Set();
  const threshold = sorted[Math.min(n, sorted.length) - 1].stat;
  return new Set(sorted.filter((p) => p.stat >= threshold).map((p) => p.id));
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Case-insensitiv matchning med trimmad whitespace för tränar-bonusen. */
export function sackedMatches(guess: string | null, answer: string | null): boolean {
  if (!guess || !answer) return false;
  return normalizeName(guess) === normalizeName(answer);
}

export function computePerTeam(
  tableOrder: number[],
  actualPositions: Map<number, number>
): TeamScore[] {
  return tableOrder.map((teamId, idx) => {
    const guessedPos = idx + 1;
    const actualPos = actualPositions.get(teamId);
    if (actualPos == null) {
      return { teamId, guessedPos, actualPos: -1, error: -1, points: 0 };
    }
    const error = Math.abs(guessedPos - actualPos);
    return { teamId, guessedPos, actualPos, error, points: teamPoints(guessedPos, actualPos) };
  });
}

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

/** Hela poängberäkningen för en användare mot aktuell snapshot. */
export function computeScore(
  prediction: Prediction,
  snapshot: Pick<Snapshot, "table" | "players">,
  settings: Pick<Settings, "sacked_manager" | "sacked_decided">,
  fplPoints: number
): ScoreBreakdown {
  const hasTable = snapshot.table.length > 0;
  const tableOrder = prediction.table_order ?? [];

  let perTeam: TeamScore[] = [];
  let basePoints: number | null = null;
  let bonusWinner = false;
  let bonusTop5 = false;
  let bonusBottom3 = false;

  if (hasTable && tableOrder.length > 0) {
    const actualPositions = new Map(snapshot.table.map((r) => [r.teamId, r.pos]));
    perTeam = computePerTeam(tableOrder, actualPositions);
    basePoints = perTeam.reduce((sum, t) => sum + t.points, 0);

    const actualOrder = [...snapshot.table].sort((a, b) => a.pos - b.pos).map((r) => r.teamId);
    bonusWinner = tableOrder[0] === actualOrder[0];
    bonusTop5 = sameSet(tableOrder.slice(0, 5), actualOrder.slice(0, 5));
    bonusBottom3 = sameSet(tableOrder.slice(17, 20), actualOrder.slice(17, 20));
  }

  const bonusSacked =
    settings.sacked_decided &&
    sackedMatches(prediction.first_sacked, settings.sacked_manager);

  // Innan första matchen är spelad kan FPL:s spelardata fortfarande innehålla
  // förra säsongens mål/assist – räkna inga skyttepoäng förrän tabellen finns.
  const topScorers = !hasTable ? new Set<number>() : topNWithTies(
    snapshot.players.map((p: Player) => ({ id: p.id, stat: p.goals_scored })), 3
  );
  const topAssisters = !hasTable ? new Set<number>() : topNWithTies(
    snapshot.players.map((p: Player) => ({ id: p.id, stat: p.assists })), 3
  );
  const scorerHits = (prediction.top_scorers ?? []).filter((id) => topScorers.has(id));
  const assistHits = (prediction.top_assists ?? []).filter((id) => topAssisters.has(id));

  const bonusPoints =
    (bonusWinner ? 25 : 0) +
    (bonusTop5 ? 25 : 0) +
    (bonusBottom3 ? 25 : 0) +
    (bonusSacked ? 25 : 0) +
    scorerHits.length * 10 +
    assistHits.length * 10;

  const tablePoints = basePoints == null ? null : (basePoints + bonusPoints) * 3;
  // Innan tabellen finns räknas ändå bonuspoängen (skyttar/tränare kan slå in).
  const effectiveTable = tablePoints ?? bonusPoints * 3;
  const total = effectiveTable + fplPoints;

  return {
    perTeam, basePoints, bonusWinner, bonusTop5, bonusBottom3, bonusSacked,
    scorerHits, assistHits, bonusPoints, tablePoints, fplPoints, total,
  };
}

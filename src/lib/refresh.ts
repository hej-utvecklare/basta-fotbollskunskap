// Hämtar färsk FPL-data, sparar snapshot och räknar om alla deltagares poäng
// i samma svep så att tabellen alltid är internt konsistent.

import { fetchSnapshot } from "./fpl";
import { computeScore } from "./scoring";
import { supabaseAdmin } from "./supabase";
import { effectiveLeagueId, getSettings, saveSnapshot } from "./data";
import { Prediction, Snapshot } from "./types";

export async function refreshAll(): Promise<{ ok: boolean; message: string }> {
  const settings = await getSettings();

  let snapshot: Snapshot;
  try {
    snapshot = await fetchSnapshot(effectiveLeagueId(settings));
  } catch (err) {
    // FPL är ofta nere runt gameweek-övergångar – behåll förra snapshoten.
    return { ok: false, message: `FPL gick inte att nå, behåller förra snapshoten. (${err instanceof Error ? err.message : err})` };
  }

  await saveSnapshot(snapshot);
  await recomputeScores(snapshot);
  return { ok: true, message: "Snapshot och poäng uppdaterade." };
}

/** Räknar om och sparar poäng för alla användare mot given snapshot. */
export async function recomputeScores(snapshot: Snapshot): Promise<void> {
  const db = supabaseAdmin();
  const settings = await getSettings();
  const gameweek = snapshot.currentEvent ?? 0;

  const { data: users } = await db.from("users").select("id, fpl_entry_id");
  const { data: predictions } = await db
    .from("predictions")
    .select("user_id, table_order, first_sacked, top_scorers, top_assists, submitted_at")
    .not("submitted_at", "is", null);

  const predByUser = new Map((predictions ?? []).map((p) => [p.user_id, p as Prediction & { user_id: string }]));
  const fplByEntry = new Map(snapshot.fplStandings.map((e) => [e.entry, e.total]));

  const rows = (users ?? []).flatMap((u) => {
    const pred = predByUser.get(u.id);
    if (!pred) return [];
    const fplPoints = (u.fpl_entry_id && fplByEntry.get(u.fpl_entry_id)) || 0;
    const score = computeScore(pred, snapshot, settings, fplPoints);
    return [{
      user_id: u.id,
      gameweek,
      base_points: score.basePoints,
      bonus_points: score.bonusPoints,
      table_points: score.tablePoints,
      fpl_points: score.fplPoints,
      total: score.total,
      breakdown: {
        perTeam: score.perTeam,
        bonusWinner: score.bonusWinner,
        bonusTop5: score.bonusTop5,
        bonusBottom3: score.bonusBottom3,
        bonusSacked: score.bonusSacked,
        scorerHits: score.scorerHits,
        assistHits: score.assistHits,
      },
      updated_at: new Date().toISOString(),
    }];
  });

  if (rows.length > 0) {
    const { error } = await db.from("scores").upsert(rows);
    if (error) throw new Error(error.message);
  }
}

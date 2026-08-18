// Läs/skriv mot Supabase. Sajten läser alltid från den sparade snapshoten,
// aldrig direkt från FPL vid sidladdning.

import { supabaseAdmin } from "./supabase";
import { Prediction, Settings, Snapshot } from "./types";

export async function getSnapshot(): Promise<{ snapshot: Snapshot; updatedAt: string } | null> {
  const { data } = await supabaseAdmin()
    .from("snapshots").select("data, updated_at").eq("id", 1).maybeSingle();
  if (!data) return null;
  return { snapshot: data.data as Snapshot, updatedAt: data.updated_at };
}

export async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("snapshots")
    .upsert({ id: 1, data: snapshot, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

const DEFAULT_SETTINGS: Settings = {
  deadline: null, sacked_manager: null, sacked_decided: false,
  league_code: "vyery9", league_id: null,
};

export async function getSettings(): Promise<Settings> {
  const { data } = await supabaseAdmin().from("settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    deadline: data.deadline,
    sacked_manager: data.sacked_manager,
    sacked_decided: data.sacked_decided,
    league_code: data.league_code ?? "vyery9",
    league_id: data.league_id,
  };
}

export function effectiveLeagueId(settings: Settings): number {
  return settings.league_id ?? Number(process.env.FPL_LEAGUE_ID ?? 886942);
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("settings")
    .upsert({ id: 1, ...patch, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export function deadlinePassed(settings: Settings): boolean {
  return !!settings.deadline && new Date(settings.deadline).getTime() <= Date.now();
}

export type DbUser = {
  id: string;
  name: string;
  email: string | null;
  fpl_entry_id: number | null;
};

export async function listUsers(): Promise<DbUser[]> {
  const { data } = await supabaseAdmin()
    .from("users").select("id, name, email, fpl_entry_id").order("name");
  return data ?? [];
}

export async function getPrediction(userId: string): Promise<Prediction | null> {
  const { data } = await supabaseAdmin()
    .from("predictions")
    .select("table_order, first_sacked, top_scorers, top_assists, submitted_at")
    .eq("user_id", userId).maybeSingle();
  return (data as Prediction | null) ?? null;
}

export type ScoreRow = {
  user_id: string;
  gameweek: number;
  base_points: number | null;
  bonus_points: number;
  table_points: number | null;
  fpl_points: number;
  total: number;
  breakdown: unknown;
};

export async function getScores(gameweek: number): Promise<ScoreRow[]> {
  const { data } = await supabaseAdmin().from("scores").select("*").eq("gameweek", gameweek);
  return (data as ScoreRow[]) ?? [];
}

export async function getLatestScoredGameweeks(): Promise<number[]> {
  const { data } = await supabaseAdmin()
    .from("scores").select("gameweek").order("gameweek", { ascending: false });
  return [...new Set((data ?? []).map((r) => r.gameweek))];
}

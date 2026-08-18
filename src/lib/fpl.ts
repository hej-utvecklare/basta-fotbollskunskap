// All hämtning från FPL:s publika API. Körs enbart server-side –
// FPL sätter inga CORS-headers så anrop från browsern fungerar inte.

import { Player, Snapshot, TableRow, Team, FplEntry } from "./types";

const BASE = "https://fantasy.premierleague.com/api";

async function fplFetch(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: { "User-Agent": "basta-fotbollskunskap/1.0" },
  });
  if (!res.ok) throw new Error(`FPL svarade ${res.status} för ${path}`);
  return res.json();
}

type RawFixture = {
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  finished: boolean;
};

/** Räknar fram ligatabellen från färdigspelade fixtures.
 *  Sortering: poäng, målskillnad, gjorda mål, lagnamn i bokstavsordning. */
export function computeTable(teams: Team[], fixtures: RawFixture[]): TableRow[] {
  const rows = new Map<number, TableRow>();
  for (const t of teams) {
    rows.set(t.id, {
      teamId: t.id, pos: 0, played: 0, won: 0, drawn: 0, lost: 0,
      gf: 0, ga: 0, gd: 0, points: 0,
    });
  }
  let anyPlayed = false;
  for (const f of fixtures) {
    if (!f.finished || f.team_h_score == null || f.team_a_score == null) continue;
    const home = rows.get(f.team_h);
    const away = rows.get(f.team_a);
    if (!home || !away) continue;
    anyPlayed = true;
    home.played++; away.played++;
    home.gf += f.team_h_score; home.ga += f.team_a_score;
    away.gf += f.team_a_score; away.ga += f.team_h_score;
    if (f.team_h_score > f.team_a_score) { home.won++; away.lost++; home.points += 3; }
    else if (f.team_h_score < f.team_a_score) { away.won++; home.lost++; away.points += 3; }
    else { home.drawn++; away.drawn++; home.points += 1; away.points += 1; }
  }
  if (!anyPlayed) return []; // ingen tabell innan första matchen

  const nameOf = new Map(teams.map((t) => [t.id, t.name]));
  const sorted = [...rows.values()].map((r) => ({ ...r, gd: r.gf - r.ga }));
  sorted.sort((a, b) =>
    b.points - a.points ||
    (b.gf - b.ga) - (a.gf - a.ga) ||
    b.gf - a.gf ||
    (nameOf.get(a.teamId) ?? "").localeCompare(nameOf.get(b.teamId) ?? "", "en")
  );
  sorted.forEach((r, i) => { r.pos = i + 1; });
  return sorted;
}

/** Hämtar alla tre endpoints och bygger en komplett snapshot. */
export async function fetchSnapshot(leagueId: number): Promise<Snapshot> {
  const bootstrap = (await fplFetch("/bootstrap-static/")) as {
    teams: Team[];
    elements: Player[];
    events: { id: number; is_current: boolean; finished: boolean }[];
  };
  const fixtures = (await fplFetch("/fixtures/")) as RawFixture[];

  let fplStandings: FplEntry[] = [];
  try {
    const league = (await fplFetch(`/leagues-classic/${leagueId}/standings/`)) as {
      standings: { results: FplEntry[] };
    };
    fplStandings = (league.standings?.results ?? []).map((r) => ({
      entry: r.entry, entry_name: r.entry_name, player_name: r.player_name,
      total: r.total, rank: r.rank,
    }));
  } catch {
    // Ligan kan sakna data innan säsongen startat – snapshoten är ändå användbar.
  }

  const teams: Team[] = bootstrap.teams.map((t) => ({
    id: t.id, name: t.name, short_name: t.short_name, strength: t.strength,
  }));

  const current = bootstrap.events.find((e) => e.is_current);
  const lastFinished = [...bootstrap.events].reverse().find((e) => e.finished);
  const currentEvent = current?.id ?? lastFinished?.id ?? null;

  return {
    fetchedAt: new Date().toISOString(),
    currentEvent,
    teams,
    table: computeTable(teams, fixtures),
    players: bootstrap.elements.map((p) => ({
      id: p.id, web_name: p.web_name, first_name: p.first_name,
      second_name: p.second_name, team: p.team,
      goals_scored: p.goals_scored, assists: p.assists,
    })),
    fplStandings,
  };
}

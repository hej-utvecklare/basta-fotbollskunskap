// Seed-script: lägger in fyra påhittade deltagare med gissningar så att
// poängmotorn går att testa utan riktiga användare.
//
//   npm run seed
//
// Hämtar färsk FPL-data om det går, annars byggs en syntetisk snapshot
// (påhittade lag, spelare och resultat) så det funkar helt offline.

import { readFileSync } from "fs";
import path from "path";

// Ladda .env.local manuellt så scriptet funkar utan dotenv
try {
  const env = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  console.error("Hittade ingen .env.local – ser till att miljövariablerna redan är satta.");
}

import { fetchSnapshot } from "../src/lib/fpl";
import { recomputeScores } from "../src/lib/refresh";
import { saveSnapshot } from "../src/lib/data";
import { supabaseAdmin } from "../src/lib/supabase";
import { Snapshot } from "../src/lib/types";

function syntheticSnapshot(): Snapshot {
  const names = [
    "Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton", "Burnley",
    "Chelsea", "Crystal Palace", "Everton", "Fulham", "Leeds", "Liverpool",
    "Man City", "Man Utd", "Newcastle", "Nott'm Forest", "Spurs", "Sunderland",
    "West Ham", "Wolves",
  ];
  const teams = names.map((name, i) => ({
    id: i + 1, name, short_name: name.slice(0, 3).toUpperCase(), strength: 3,
  }));
  // Enkel fejktabell: lag-id i omvänd bokstavsordning, 10 matcher spelade
  const table = [...teams].reverse().map((t, i) => ({
    teamId: t.id, pos: i + 1, played: 10, won: 10 - i > 0 ? Math.max(0, 8 - i) : 0,
    drawn: 2, lost: Math.min(10, i), gf: 20 - i, ga: 5 + i, gd: 15 - 2 * i,
    points: Math.max(2, 26 - 2 * i),
  }));
  const players = Array.from({ length: 60 }, (_, i) => ({
    id: 1000 + i,
    web_name: `Spelare${i + 1}`,
    first_name: "Test",
    second_name: `Spelare${i + 1}`,
    team: (i % 20) + 1,
    goals_scored: Math.max(0, 15 - i),
    assists: Math.max(0, 12 - ((i + 7) % 60)),
  }));
  return {
    fetchedAt: new Date().toISOString(),
    currentEvent: 10,
    teams,
    table,
    players,
    fplStandings: [
      { entry: 11111, entry_name: "Fejk FC", player_name: "Anna Test", total: 620, rank: 1 },
      { entry: 22222, entry_name: "Testarna", player_name: "Björn Test", total: 590, rank: 2 },
      { entry: 33333, entry_name: "Bänkvärmarna", player_name: "Cilla Test", total: 555, rank: 3 },
      { entry: 44444, entry_name: "Krysset", player_name: "David Test", total: 540, rank: 4 },
    ],
  };
}

function shuffledOrder(base: number[], swaps: number, seed: number): number[] {
  const arr = [...base];
  let s = seed;
  for (let i = 0; i < swaps; i++) {
    s = (s * 9301 + 49297) % 233280;
    const a = s % arr.length;
    s = (s * 9301 + 49297) % 233280;
    const b = s % arr.length;
    [arr[a], arr[b]] = [arr[b], arr[a]];
  }
  return arr;
}

async function main() {
  let snapshot: Snapshot;
  try {
    snapshot = await fetchSnapshot(Number(process.env.FPL_LEAGUE_ID ?? 886942));
    console.log("Hämtade färsk FPL-data.");
  } catch {
    snapshot = syntheticSnapshot();
    console.log("FPL gick inte att nå – använder syntetisk testdata.");
  }
  // Utan FPL-standings (t.ex. före säsongsstart) fejkas de så kopplingen går att testa
  if (snapshot.fplStandings.length === 0) {
    snapshot.fplStandings = syntheticSnapshot().fplStandings;
    console.log("Ligan saknar deltagare – lade in fejkade FPL-lag.");
  }
  await saveSnapshot(snapshot);

  const db = supabaseAdmin();
  const actualOrder =
    snapshot.table.length > 0
      ? [...snapshot.table].sort((a, b) => a.pos - b.pos).map((r) => r.teamId)
      : snapshot.teams.map((t) => t.id);
  const byGoals = [...snapshot.players].sort((a, b) => b.goals_scored - a.goals_scored);
  const byAssists = [...snapshot.players].sort((a, b) => b.assists - a.assists);
  const pick = (arr: typeof byGoals, idxs: number[]) => idxs.map((i) => arr[i].id);

  const seedUsers = [
    {
      name: "Seed-Anna", entry: snapshot.fplStandings[0]?.entry ?? null,
      order: [...actualOrder], sacked: "Ruben Amorim",
      scorers: pick(byGoals, [0, 1, 2]), assists: pick(byAssists, [0, 1, 2]),
    },
    {
      name: "Seed-Björn", entry: snapshot.fplStandings[1]?.entry ?? null,
      order: shuffledOrder(actualOrder, 4, 7), sacked: "Ange Postecoglou",
      scorers: pick(byGoals, [0, 3, 5]), assists: pick(byAssists, [1, 4, 6]),
    },
    {
      name: "Seed-Cilla", entry: snapshot.fplStandings[2]?.entry ?? null,
      order: shuffledOrder(actualOrder, 10, 13), sacked: "ruben amorim  ",
      scorers: pick(byGoals, [2, 8, 12]), assists: pick(byAssists, [0, 9, 14]),
    },
    {
      name: "Seed-David", entry: snapshot.fplStandings[3]?.entry ?? null,
      order: [...actualOrder].reverse(), sacked: "Pep Guardiola",
      scorers: pick(byGoals, [20, 25, 30]), assists: pick(byAssists, [20, 25, 30]),
    },
  ];

  for (const u of seedUsers) {
    const { data: user, error } = await db
      .from("users")
      .upsert({ name: u.name, fpl_entry_id: u.entry }, { onConflict: "name" })
      .select("id")
      .single();
    if (error || !user) throw new Error(`Kunde inte skapa ${u.name}: ${error?.message}`);
    const { error: pErr } = await db.from("predictions").upsert({
      user_id: user.id,
      table_order: u.order,
      first_sacked: u.sacked,
      top_scorers: u.scorers,
      top_assists: u.assists,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (pErr) throw new Error(`Kunde inte spara gissning för ${u.name}: ${pErr.message}`);
    console.log(`✓ ${u.name}`);
  }

  await recomputeScores(snapshot);
  console.log("Poängen omräknade. Öppna /tabell för att se resultatet.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

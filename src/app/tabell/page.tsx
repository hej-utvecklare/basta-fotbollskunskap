import { getLatestScoredGameweeks, getScores, getSnapshot, listUsers } from "@/lib/data";
import { ScoreBreakdown } from "@/lib/types";
import Leaderboard, { LeaderboardRow } from "@/components/Leaderboard";

export const dynamic = "force-dynamic";

type StoredBreakdown = Pick<
  ScoreBreakdown,
  "perTeam" | "bonusWinner" | "bonusTop5" | "bonusBottom3" | "bonusSacked" | "scorerHits" | "assistHits"
>;

export default async function TabellPage() {
  let rows: LeaderboardRow[] = [];
  let gameweek: number | null = null;

  try {
    const [users, snap, gameweeks] = await Promise.all([
      listUsers(), getSnapshot(), getLatestScoredGameweeks(),
    ]);
    gameweek = gameweeks[0] ?? null;

    if (gameweek != null && snap) {
      const [scores, prevScores] = await Promise.all([
        getScores(gameweek),
        gameweeks[1] != null ? getScores(gameweeks[1]) : Promise.resolve([]),
      ]);
      const prevByUser = new Map(prevScores.map((s) => [s.user_id, s.total]));
      const teamName = new Map(snap.snapshot.teams.map((t) => [t.id, t.name]));
      const playerName = new Map(snap.snapshot.players.map((p) => [p.id, p.web_name]));
      const userById = new Map(users.map((u) => [u.id, u]));

      rows = scores
        .filter((s) => userById.has(s.user_id))
        .map((s) => {
          const b = (s.breakdown ?? {}) as Partial<StoredBreakdown>;
          const worst = [...(b.perTeam ?? [])]
            .filter((t) => t.actualPos > 0)
            .sort((a, z) => a.points - z.points || z.error - a.error)
            .slice(0, 3)
            .map((t) => ({
              team: teamName.get(t.teamId) ?? String(t.teamId),
              guessed: t.guessedPos, actual: t.actualPos, points: t.points,
            }));
          const prev = prevByUser.get(s.user_id);
          return {
            userId: s.user_id,
            name: userById.get(s.user_id)!.name,
            basePoints: s.base_points,
            bonusPoints: s.bonus_points,
            tablePoints: s.table_points,
            fplPoints: s.fpl_points,
            total: s.total,
            delta: prev == null ? null : s.total - prev,
            bonuses: [
              { label: "Ligavinnare", hit: !!b.bonusWinner },
              { label: "Topp 5", hit: !!b.bonusTop5 },
              { label: "Botten 3", hit: !!b.bonusBottom3 },
              { label: "Sparkad tränare", hit: !!b.bonusSacked },
            ],
            worstGuesses: worst,
            scorerHits: (b.scorerHits ?? []).map((id) => playerName.get(id) ?? String(id)),
            assistHits: (b.assistHits ?? []).map((id) => playerName.get(id) ?? String(id)),
          };
        })
        .sort((a, z) => z.total - a.total || z.fplPoints - a.fplPoints || a.name.localeCompare(z.name, "sv"));
    }
  } catch {}

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Ligatabellen</h1>
        <p className="text-sm text-slate-600">
          Tabellpoäng + FPL-poäng = total. Klicka på en rad för hela uppdelningen.
          {gameweek != null && gameweek > 0 && ` Gameweek ${gameweek}.`}
        </p>
      </div>
      <Leaderboard rows={rows} />
      <p className="text-xs text-slate-500">
        Vid lika total vinner högst FPL-poäng. Förändringen (▲/▼) gäller sedan förra gameweeken.
      </p>
    </div>
  );
}

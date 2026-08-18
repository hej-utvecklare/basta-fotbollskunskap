// Delade typer för snapshot-datan och poängberäkningen

export type Team = {
  id: number;
  name: string;
  short_name: string;
  strength: number;
};

export type Player = {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number; // lag-id
  goals_scored: number;
  assists: number;
};

export type TableRow = {
  teamId: number;
  pos: number; // 1-baserad placering
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

export type FplEntry = {
  entry: number;
  entry_name: string;
  player_name: string;
  total: number;
  rank: number;
};

export type Snapshot = {
  fetchedAt: string;
  currentEvent: number | null; // aktuell gameweek (is_current), annars senaste avslutade
  teams: Team[];
  table: TableRow[]; // tom innan första matchen är färdigspelad
  players: Player[]; // alla elements, minimala fält
  fplStandings: FplEntry[];
};

export type Prediction = {
  table_order: number[] | null; // 20 lag-id, index 0 = plats 1
  first_sacked: string | null;
  top_scorers: number[] | null;
  top_assists: number[] | null;
  submitted_at: string | null;
};

export type Settings = {
  deadline: string | null;
  sacked_manager: string | null;
  sacked_decided: boolean;
  league_code: string;
  league_id: number | null;
};

export type TeamScore = {
  teamId: number;
  guessedPos: number;
  actualPos: number;
  error: number;
  points: number;
};

export type ScoreBreakdown = {
  perTeam: TeamScore[]; // tom om ingen tabell finns än
  basePoints: number | null; // null = ingen tabell än, visas som "–"
  bonusWinner: boolean;
  bonusTop5: boolean;
  bonusBottom3: boolean;
  bonusSacked: boolean;
  scorerHits: number[]; // element-id som träffade topp 3
  assistHits: number[];
  bonusPoints: number;
  tablePoints: number | null; // (bas + bonus) * 3
  fplPoints: number;
  total: number;
};

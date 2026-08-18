import { Team } from "./types";

// Förvald ordning i gissningsformuläret: förra säsongens (2025/26) sluttabell.
// OBS: Justera gärna listan när sluttabellen är känd – lag som inte hittas här
// sorteras efter FPL:s styrkevärde och hamnar efter de listade lagen.
// Laglistan i sig hämtas alltid från FPL – detta styr bara startordningen.
const LAST_SEASON_ORDER: string[] = [
  "Arsenal",
  "Liverpool",
  "Man City",
  "Chelsea",
  "Aston Villa",
  "Newcastle",
  "Man Utd",
  "Spurs",
  "Brighton",
  "Nott'm Forest",
  "Bournemouth",
  "Crystal Palace",
  "Brentford",
  "Fulham",
  "Everton",
  "Leeds",
  "Sunderland",
  "Coventry City",
  "Hull City",
  "Ipswich Town",
];

/** Sorterar FPL:s lag i förra säsongens ordning som startläge för formuläret. */
export function defaultTableOrder(teams: Team[]): number[] {
  const indexOf = new Map(LAST_SEASON_ORDER.map((name, i) => [name.toLowerCase(), i]));
  return [...teams]
    .sort((a, b) => {
      const ai = indexOf.get(a.name.toLowerCase()) ?? 100 - a.strength;
      const bi = indexOf.get(b.name.toLowerCase()) ?? 100 - b.strength;
      return ai - bi || a.name.localeCompare(b.name, "en");
    })
    .map((t) => t.id);
}

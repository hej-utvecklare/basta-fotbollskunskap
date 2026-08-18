// Tränarlista för 2026/27. FPL:s API innehåller inga tränare (bara målvakter,
// backar, mittfältare och anfallare), så den här listan måste underhållas för
// hand. Nycklarna är FPL:s lagnamn exakt som de står i bootstrap-static.
//
// Byts en tränare ut under säsongen spelar det ingen roll för gissningen –
// den låses vid deadline. Listan behöver bara stämma fram till dess.

export const MANAGERS_2026_27: Record<string, string> = {
  "Arsenal": "Mikel Arteta",
  "Aston Villa": "Unai Emery",
  "Bournemouth": "Marco Rose",
  "Brentford": "Keith Andrews",
  "Brighton": "Fabian Hürzeler",
  "Chelsea": "Xabi Alonso",
  "Coventry City": "Frank Lampard",
  "Crystal Palace": "Pierre Sage",
  "Everton": "David Moyes",
  "Fulham": "Álvaro Arbeloa",
  "Hull City": "Sergej Jakirović",
  "Ipswich Town": "Gary O'Neil",
  "Leeds": "Daniel Farke",
  "Liverpool": "Andoni Iraola",
  "Man City": "Enzo Maresca",
  "Man Utd": "Michael Carrick",
  "Newcastle": "Matthias Jaissle",
  "Nott'm Forest": "Oliver Glasner",
  "Spurs": "Roberto De Zerbi",
  "Sunderland": "Régis Le Bris",
};

export type ManagerOption = { manager: string; teamName: string };

/** Tränare för lagen i snapshoten, sorterade på lagnamn. Lag som saknas i
 *  listan hoppas över så att en ändrad laguppsättning inte kraschar sidan. */
export function managerOptions(teams: { name: string }[]): ManagerOption[] {
  return teams
    .map((t) => ({ teamName: t.name, manager: MANAGERS_2026_27[t.name] }))
    .filter((o): o is ManagerOption => !!o.manager)
    .sort((a, b) => a.teamName.localeCompare(b.teamName, "sv"));
}

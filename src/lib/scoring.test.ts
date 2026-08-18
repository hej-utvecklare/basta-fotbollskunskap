import { describe, expect, it } from "vitest";
import { computeScore, sackedMatches, teamPoints, topNWithTies } from "./scoring";
import { computeTable } from "./fpl";
import { Prediction, Snapshot, TableRow } from "./types";

describe("teamPoints – trappan", () => {
  it("ger exakt 10 / 9,75 / 9 / 7,75 / 6 / 3,75 / 1 / 0", () => {
    const expected = [10, 9.75, 9, 7.75, 6, 3.75, 1, 0];
    expected.forEach((points, error) => {
      expect(teamPoints(5, 5 + error)).toBe(points);
      expect(teamPoints(5 + error, 5)).toBe(points); // symmetriskt
    });
  });

  it("ger 0 för alla fel över 7", () => {
    for (let err = 7; err <= 19; err++) {
      expect(teamPoints(1, 1 + err)).toBe(0);
    }
  });
});

describe("topNWithTies", () => {
  const p = (id: number, stat: number) => ({ id, stat });

  it("tar topp 3 utan delningar", () => {
    const top = topNWithTies([p(1, 20), p(2, 15), p(3, 12), p(4, 10)], 3);
    expect([...top].sort()).toEqual([1, 2, 3]);
  });

  it("räknar alla vid delad placering – fem spelare på samma målantal", () => {
    const top = topNWithTies(
      [p(1, 20), p(2, 10), p(3, 10), p(4, 10), p(5, 10), p(6, 10), p(7, 3)], 3
    );
    expect(top.size).toBe(6); // 1:an plus alla fem på 10 mål
    expect(top.has(7)).toBe(false);
  });

  it("räknar inte spelare med 0 – tom lista innan säsongen", () => {
    expect(topNWithTies([p(1, 0), p(2, 0)], 3).size).toBe(0);
    const top = topNWithTies([p(1, 2), p(2, 0), p(3, 0)], 3);
    expect([...top]).toEqual([1]);
  });
});

describe("sackedMatches", () => {
  it("matchar case-insensitivt med trimmad whitespace", () => {
    expect(sackedMatches("  erik ten hag ", "Erik ten Hag")).toBe(true);
    expect(sackedMatches("Erik  ten  Hag", "erik ten hag")).toBe(true);
    expect(sackedMatches("Ange Postecoglou", "Erik ten Hag")).toBe(false);
    expect(sackedMatches(null, "Erik ten Hag")).toBe(false);
    expect(sackedMatches("Erik ten Hag", null)).toBe(false);
  });
});

describe("computeTable", () => {
  const teams = [
    { id: 1, name: "Arsenal", short_name: "ARS", strength: 5 },
    { id: 2, name: "Brentford", short_name: "BRE", strength: 3 },
    { id: 3, name: "Chelsea", short_name: "CHE", strength: 4 },
  ];

  it("delar ut 3-1-0 och sorterar på poäng, målskillnad, gjorda mål, namn", () => {
    const table = computeTable(teams, [
      { event: 1, team_h: 1, team_a: 2, team_h_score: 2, team_a_score: 0, finished: true },
      { event: 1, team_h: 3, team_a: 2, team_h_score: 2, team_a_score: 0, finished: true },
      { event: 2, team_h: 1, team_a: 3, team_h_score: 1, team_a_score: 1, finished: true },
    ]);
    // Arsenal och Chelsea båda 4p, +2 i målskillnad, 3 gjorda mål → bokstavsordning
    expect(table.map((r) => r.teamId)).toEqual([1, 3, 2]);
    expect(table[0].points).toBe(4);
    expect(table[2].points).toBe(0);
  });

  it("ignorerar ofärdiga matcher och ger tom tabell utan spelade matcher", () => {
    expect(
      computeTable(teams, [
        { event: 1, team_h: 1, team_a: 2, team_h_score: null, team_a_score: null, finished: false },
      ])
    ).toEqual([]);
  });
});

describe("computeScore", () => {
  const teamIds = Array.from({ length: 20 }, (_, i) => i + 1);
  const perfectTable: TableRow[] = teamIds.map((id, i) => ({
    teamId: id, pos: i + 1, played: 1, won: 1, drawn: 0, lost: 0,
    gf: 1, ga: 0, gd: 1, points: 3,
  }));
  const snapshot: Pick<Snapshot, "table" | "players"> = {
    table: perfectTable,
    players: [
      { id: 101, web_name: "Haaland", first_name: "", second_name: "", team: 1, goals_scored: 20, assists: 2 },
      { id: 102, web_name: "Salah", first_name: "", second_name: "", team: 2, goals_scored: 15, assists: 10 },
      { id: 103, web_name: "Isak", first_name: "", second_name: "", team: 3, goals_scored: 12, assists: 1 },
      { id: 104, web_name: "Palmer", first_name: "", second_name: "", team: 4, goals_scored: 5, assists: 9 },
      { id: 105, web_name: "Saka", first_name: "", second_name: "", team: 1, goals_scored: 4, assists: 8 },
    ],
  };

  const perfectPrediction: Prediction = {
    table_order: teamIds,
    first_sacked: "Erik ten Hag",
    top_scorers: [101, 102, 103],
    top_assists: [102, 104, 105],
    submitted_at: "2026-08-01T00:00:00Z",
  };

  it("ger maxpoäng för en perfekt gissning", () => {
    const score = computeScore(
      perfectPrediction, snapshot,
      { sacked_manager: "erik ten hag", sacked_decided: true },
      500
    );
    expect(score.basePoints).toBe(200);
    expect(score.bonusWinner).toBe(true);
    expect(score.bonusTop5).toBe(true);
    expect(score.bonusBottom3).toBe(true);
    expect(score.bonusSacked).toBe(true);
    expect(score.bonusPoints).toBe(160); // 4×25 + 30 + 30
    expect(score.tablePoints).toBe((200 + 160) * 3);
    expect(score.total).toBe(1080 + 500);
  });

  it("ignorerar inbördes ordning i topp 5 och botten 3", () => {
    const shuffled = [...teamIds];
    [shuffled[1], shuffled[4]] = [shuffled[4], shuffled[1]]; // byt plats 2 och 5
    [shuffled[17], shuffled[19]] = [shuffled[19], shuffled[17]]; // byt plats 18 och 20
    const score = computeScore(
      { ...perfectPrediction, table_order: shuffled }, snapshot,
      { sacked_manager: null, sacked_decided: false }, 0
    );
    expect(score.bonusTop5).toBe(true);
    expect(score.bonusBottom3).toBe(true);
    expect(score.bonusWinner).toBe(true);
  });

  it("ger 0 i tränarbonus tills admin markerat den som avgjord", () => {
    const score = computeScore(
      perfectPrediction, snapshot,
      { sacked_manager: "Erik ten Hag", sacked_decided: false }, 0
    );
    expect(score.bonusSacked).toBe(false);
  });

  it("ger 10 poäng per rätt namn i skytte- och assistligan, ordning ignoreras", () => {
    const score = computeScore(
      { ...perfectPrediction, top_scorers: [103, 101, 104], top_assists: [105, 101, 103] },
      snapshot, { sacked_manager: null, sacked_decided: false }, 0
    );
    expect(score.scorerHits.length).toBe(2); // 103 och 101 (104 är inte topp 3)
    expect(score.assistHits.length).toBe(1); // bara 105
  });

  it("ger null i baspoäng och inga skyttepoäng när ingen tabell finns", () => {
    const score = computeScore(perfectPrediction, { ...snapshot, table: [] },
      { sacked_manager: null, sacked_decided: false }, 42);
    expect(score.basePoints).toBeNull();
    expect(score.tablePoints).toBeNull();
    // FPL kan visa förra säsongens mål/assist före avspark – de ska inte räknas
    expect(score.scorerHits).toEqual([]);
    expect(score.assistHits).toEqual([]);
    expect(score.total).toBe(42);
  });
});

import { describe, expect, it } from "vitest";
import { canViewPrediction, predictionProgress } from "./progress";
import { Prediction } from "./types";

const full = Array.from({ length: 20 }, (_, i) => i + 1);

function pred(p: Partial<Prediction>): Prediction {
  return {
    table_order: null, first_sacked: null, top_scorers: null,
    top_assists: null, submitted_at: null, ...p,
  };
}

describe("predictionProgress", () => {
  it("räknar en tom gissning som 0 av 4 och pekar på steg 1", () => {
    const p = predictionProgress(null, 20);
    expect(p.doneCount).toBe(0);
    expect(p.complete).toBe(false);
    expect(p.nextStep).toBe(1);
  });

  it("kräver att tabellen har alla lag exakt en gång", () => {
    expect(predictionProgress(pred({ table_order: full }), 20).table).toBe(true);
    expect(predictionProgress(pred({ table_order: full.slice(0, 19) }), 20).table).toBe(false);
    // Dubblett: 20 element men bara 19 unika
    const dup = [...full.slice(0, 19), 19];
    expect(predictionProgress(pred({ table_order: dup }), 20).table).toBe(false);
  });

  it("ignorerar tränarnamn som bara är blanksteg", () => {
    expect(predictionProgress(pred({ first_sacked: "   " }), 20).sacked).toBe(false);
    expect(predictionProgress(pred({ first_sacked: "Xabi Alonso" }), 20).sacked).toBe(true);
  });

  it("kräver tre olika spelare i varje lista", () => {
    expect(predictionProgress(pred({ top_scorers: [1, 2] }), 20).scorers).toBe(false);
    expect(predictionProgress(pred({ top_scorers: [1, 2, 2] }), 20).scorers).toBe(false);
    expect(predictionProgress(pred({ top_scorers: [1, 2, 3] }), 20).scorers).toBe(true);
  });

  it("pekar på första ofärdiga steget", () => {
    const p = predictionProgress(
      pred({ table_order: full, first_sacked: "Xabi Alonso" }), 20
    );
    expect(p.doneCount).toBe(2);
    expect(p.nextStep).toBe(3);
  });

  it("är komplett när alla fyra delar är ifyllda", () => {
    const p = predictionProgress(
      pred({
        table_order: full, first_sacked: "Xabi Alonso",
        top_scorers: [1, 2, 3], top_assists: [4, 5, 6],
      }), 20
    );
    expect(p.complete).toBe(true);
    expect(p.doneCount).toBe(4);
  });
});

describe("canViewPrediction", () => {
  const v = (o: Partial<Parameters<typeof canViewPrediction>[0]>) =>
    canViewPrediction({ deadlinePassed: false, isAdmin: false, isSelf: false, ...o });

  it("döljer andras gissningar före deadline", () => {
    expect(v({})).toBe(false);
  });

  it("visar alltid den egna", () => {
    expect(v({ isSelf: true })).toBe(true);
  });

  it("öppnar allas när deadline passerat", () => {
    expect(v({ deadlinePassed: true })).toBe(true);
  });

  it("låter admin se allt även före deadline", () => {
    expect(v({ isAdmin: true })).toBe(true);
  });
});

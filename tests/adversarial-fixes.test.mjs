import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isStageResetPoints,
  getParticipantStageRawScore,
  calculateParticipantScoreInStage,
  getStageScoreColumnKey,
} from "../src/data/mockCompetition.ts";

describe("Adversarial Fixes & Verifier Feedback Test Suite", () => {
  describe("Issue 1: isStageResetPoints null / undefined / boolean coercion", () => {
    it("strictly defaults null and undefined to true (Reset to 0)", () => {
      assert.equal(isStageResetPoints(null), true);
      assert.equal(isStageResetPoints(undefined), true);
      assert.equal(isStageResetPoints({ id: "s1", name: "S1", resetPoints: null }), true);
      assert.equal(isStageResetPoints({ id: "s2", name: "S2", resetPoints: undefined }), true);
      assert.equal(isStageResetPoints({ id: "s3", name: "S3" }), true);
    });

    it("evaluates explicit false or carry_over to false", () => {
      assert.equal(isStageResetPoints({ id: "s4", name: "S4", resetPoints: false }), false);
      assert.equal(isStageResetPoints({ id: "s5", name: "S5", reset_points: false }), false);
      assert.equal(isStageResetPoints({ id: "s6", name: "S6", pointResetBehavior: "carry_over" }), false);
    });

    it("evaluates explicit true to true", () => {
      assert.equal(isStageResetPoints({ id: "s7", name: "S7", resetPoints: true }), true);
      assert.equal(isStageResetPoints({ id: "s8", name: "S8", reset_points: true }), true);
    });
  });

  describe("Issue 2: getParticipantStageRawScore stage index precedence", () => {
    it("prioritizes stageIndex over substring match in stage name", () => {
      const scores = { babak1: 100, babak2: 50, babak3: 25 };
      // Stage at index 1 named "Penyisihan Grup B" must read babak2 (50), not babak1 (100)
      const score = getParticipantStageRawScore(scores, 1, { id: "s1", name: "Penyisihan Grup B" });
      assert.equal(score, 50);

      // Stage at index 0 named "Babak 8 Besar" must read babak1 (100)
      const score0 = getParticipantStageRawScore(scores, 0, { id: "s0", name: "Babak 8 Besar" });
      assert.equal(score0, 100);
    });

    it("gracefully falls back for index beyond 2", () => {
      const scores = { babak1: 100, babak2: 50, babak3: 75 };
      assert.equal(getParticipantStageRawScore(scores, 2), 75);
      assert.equal(getParticipantStageRawScore(scores, 3), 75);
    });
  });

  describe("Issue 3: Score accumulation across stages sharing raw columns", () => {
    it("avoids double-counting babak3 when consecutive stages share babak3 and carry over", () => {
      const stages = [
        { id: "s0", name: "Babak Penyisihan", model: "ranking", turns: "2x", resetPoints: true },
        { id: "s1", name: "Babak 8 Besar", model: "gugur", turns: "1x", resetPoints: false },
        { id: "s2", name: "Babak Semifinal", model: "gugur", turns: "1x", resetPoints: true },
        { id: "s3", name: "Babak Final", model: "gugur", turns: "1x", resetPoints: false },
      ];
      const scores = { babak1: 100, babak2: 50, babak3: 75 };

      // Stage 0: 100
      assert.equal(calculateParticipantScoreInStage(scores, 0, stages), 100);
      // Stage 1 (carry over): 100 + 50 = 150
      assert.equal(calculateParticipantScoreInStage(scores, 1, stages), 150);
      // Stage 2 (resets): 75
      assert.equal(calculateParticipantScoreInStage(scores, 2, stages), 75);
      // Stage 3 (carry over from Stage 2): both map to babak3 -> must be 75 (NOT 150)
      assert.equal(calculateParticipantScoreInStage(scores, 3, stages), 75);
    });

    it("preserves accumulation when all stages carry over without duplicating shared column", () => {
      const stages = [
        { id: "s0", name: "Babak Penyisihan", model: "ranking", turns: "2x", resetPoints: true },
        { id: "s1", name: "Babak 8 Besar", model: "gugur", turns: "1x", resetPoints: false },
        { id: "s2", name: "Babak Semifinal", model: "gugur", turns: "1x", resetPoints: false },
        { id: "s3", name: "Babak Final", model: "gugur", turns: "1x", resetPoints: false },
      ];
      const scores = { babak1: 100, babak2: 50, babak3: 75 };

      // S0: 100, S1: 150, S2: 225, S3: 225 (babak3 added once)
      assert.equal(calculateParticipantScoreInStage(scores, 3, stages), 225);
    });
  });
});

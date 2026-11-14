import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  parseStopwatchTimeMs,
  formatStopwatchTimeMs,
  extractFinishTimeFromStageLabel,
  resolveMatchWinner,
  buildFastestFinishMap,
  getParticipantFastestFinishMs,
} from "../src/lib/tieBreaker.ts";

describe("Finish Time Tie-Breaker Test Suite", () => {
  it("Parses and formats stopwatch durations accurately to milliseconds", () => {
    assert.strictEqual(parseStopwatchTimeMs("01:23.45"), 83450);
    assert.strictEqual(parseStopwatchTimeMs("05:00"), 300000);
    assert.strictEqual(formatStopwatchTimeMs(83450), "01:23.45");
    assert.strictEqual(parseStopwatchTimeMs(""), null);
    assert.strictEqual(parseStopwatchTimeMs("invalid"), null);
  });

  it("Extracts team finish times and leg from PointLog labels while ignoring system completion logs", () => {
    const p1 = extractFinishTimeFromStageLabel("Finish (Laga 1 P1 @01:12.34)");
    assert.deepStrictEqual(p1, {
      timeStr: "01:12.34",
      timeMs: 72340,
      leg: 1,
      isSurrender: false,
    });

    const surrenderP2 = extractFinishTimeFromStageLabel("Menyerah • FINISH (Laga 1 P2 @05:00.00)");
    assert.deepStrictEqual(surrenderP2, {
      timeStr: "05:00.00",
      timeMs: 300000,
      leg: 2,
      isSurrender: true,
    });

    const systemSummary = extractFinishTimeFromStageLabel(
      "🏆 Pertandingan Selesai Resmi! GARUDA (20 - 20)"
    );
    assert.strictEqual(systemSummary, null);
  });

  it("Breaks tied 1x Main match scores by fastest finish time", () => {
    const res = resolveMatchWinner({
      scoreA: 30,
      scoreB: 30,
      is2xMode: false,
      finishedCorners: { p1Red: "01:40.20", p1Blue: "01:28.50" },
      teamA: "TIM A",
      teamB: "TIM B",
    });

    assert.strictEqual(res.winner, "B");
    assert.strictEqual(res.decidedBy, "finish_time");
    assert.strictEqual(res.teamAFinishFormatted, "01:40.20");
    assert.strictEqual(res.teamBFinishFormatted, "01:28.50");
  });

  it("Prefers real finish over surrender time (05:00.00) or unfinished corner on tied score", () => {
    const realVsSurrender = resolveMatchWinner({
      scoreA: 15,
      scoreB: 15,
      is2xMode: false,
      finishedCorners: { p1Red: "02:10.00", p1Blue: "05:00.00" },
      teamA: "TIM A",
      teamB: "TIM B",
    });
    assert.strictEqual(realVsSurrender.winner, "A");
    assert.strictEqual(realVsSurrender.decidedBy, "finish_time");

    const finishedVsUnfinished = resolveMatchWinner({
      scoreA: 15,
      scoreB: 15,
      is2xMode: false,
      finishedCorners: { p1Red: "", p1Blue: "03:15.00" },
      teamA: "TIM A",
      teamB: "TIM B",
    });
    assert.strictEqual(finishedVsUnfinished.winner, "B");
    assert.strictEqual(finishedVsUnfinished.decidedBy, "finish_time");
  });

  it("Breaks tied 2x Main (Tukar Sisi) scores by combined finish times across both legs", () => {
    // Team A: P1 Red = 01:30.00, P2 Blue = 01:20.00 => 02:50.00 (170s)
    // Team B: P1 Blue = 01:25.00, P2 Red = 01:40.00 => 03:05.00 (185s)
    const res = resolveMatchWinner({
      scoreA: 25,
      scoreB: 25,
      is2xMode: true,
      finishedCorners: {
        p1Red: "01:30.00",
        p1Blue: "01:25.00",
        p2Red: "01:40.00",
        p2Blue: "01:20.00",
      },
      teamA: "GARUDA A",
      teamB: "RAJAWALI B",
    });

    assert.strictEqual(res.winner, "A");
    assert.strictEqual(res.decidedBy, "finish_time");
    assert.strictEqual(res.teamAFinishFormatted, "02:50.00");
    assert.strictEqual(res.teamBFinishFormatted, "03:05.00");
  });

  it("Keeps match as tie when both points and finish times are identical or unplayed", () => {
    const unplayed = resolveMatchWinner({
      scoreA: 0,
      scoreB: 0,
      is2xMode: false,
      teamA: "A",
      teamB: "B",
    });
    assert.strictEqual(unplayed.winner, null);
    assert.strictEqual(unplayed.decidedBy, "tie");

    const exactTie = resolveMatchWinner({
      scoreA: 20,
      scoreB: 20,
      is2xMode: false,
      finishedCorners: { p1Red: "01:15.00", p1Blue: "01:15.00" },
      teamA: "A",
      teamB: "B",
    });
    assert.strictEqual(exactTie.winner, null);
    assert.strictEqual(exactTie.decidedBy, "tie");
  });

  it("Builds participant fastest finish lookup from PointLogs to rank tied standings", () => {
    const finishMap = buildFastestFinishMap([
      { participantName: "TIM ALPHA", stageLabel: "Finish (Laga 1 P1 @01:45.00)" },
      { participantName: "TIM ALPHA", stageLabel: "Finish (Laga 1 P2 @01:32.10)" },
      { participantName: "TIM BETA", stageLabel: "Finish (Laga 2 P1 @01:20.55)" },
    ]);

    const alphaMs = getParticipantFastestFinishMs("TIM ALPHA", finishMap);
    const betaMs = getParticipantFastestFinishMs("TIM BETA", finishMap);
    const gammaMs = getParticipantFastestFinishMs("TIM GAMMA", finishMap);

    assert.strictEqual(alphaMs, 92100);
    assert.strictEqual(betaMs, 80550);
    assert.strictEqual(gammaMs, Number.POSITIVE_INFINITY);
    assert.ok(betaMs < alphaMs && alphaMs < gammaMs);
  });

  it("Wires finish-time tie-breaker into Arena, Bracket API, Dashboard, Pengaturan, and ViewRankingModal", () => {
    const tanding = fs.readFileSync(path.join(process.cwd(), "src/app/tanding/[id]/page.tsx"), "utf-8");
    const bracketApi = fs.readFileSync(path.join(process.cwd(), "src/app/api/bracket/route.ts"), "utf-8");
    const home = fs.readFileSync(path.join(process.cwd(), "src/app/page.tsx"), "utf-8");
    const pengaturan = fs.readFileSync(path.join(process.cwd(), "src/app/pengaturan/page.tsx"), "utf-8");
    const modal = fs.readFileSync(
      path.join(process.cwd(), "src/components/modals/ViewRankingModal.tsx"),
      "utf-8"
    );

    assert.ok(tanding.includes("resolveMatchWinner({"));
    assert.ok(tanding.includes("menang lewat waktu finish lebih cepat!"));
    assert.ok(bracketApi.includes("resolveMatchWinner({"));
    assert.ok(bracketApi.includes("getParticipantFastestFinishMs("));
    assert.ok(home.includes("buildFastestFinishMap(pointLogs)"));
    assert.ok(home.includes("resolveDashboardMatchWinner("));
    assert.ok(pengaturan.includes("resolveMatchWinner({"));
    assert.ok(modal.includes("getParticipantFastestFinishMs(a.name, fastestFinishMap)"));
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  filterLogsForBracketMatch,
  computeMatchLogCategoryBreakdown,
  getPointLogLeg,
} from "../src/lib/scoreBreakdown.ts";

describe("Dashboard Log Poin Per-Category Breakdown", () => {
  const sampleMatch = {
    id: "m-1",
    matchLabel: "Laga 1",
    round: "Babak Penyisihan",
    teamA: "GARUDA A",
    teamB: "RAJAWALI B",
    scoreA: 25,
    scoreB: 17.5,
    scoreALeg1: 30,
    scoreBLeg1: 15,
    scoreALeg2: 20,
    scoreBLeg2: 20,
    status: "Selesai",
  };

  const sampleLogs = [
    {
      id: "log-1",
      participantId: "p-a",
      participantName: "GARUDA A",
      category: "Transporter",
      delta: 5,
      stageLabel: "Point (Laga 1 P1 @00:10.00)",
      timestamp: "2026-11-14T10:00:00Z",
    },
    {
      id: "log-2",
      participantId: "p-a",
      participantName: "GARUDA A",
      category: "Transporter",
      delta: 10,
      stageLabel: "Cekpoint (Laga 1 P1 @00:25.00)",
      timestamp: "2026-11-14T10:00:15Z",
    },
    {
      id: "log-3",
      participantId: "p-a",
      participantName: "GARUDA A",
      category: "Transporter",
      delta: 15,
      stageLabel: "Finish (Laga 1 P1 @01:00.00)",
      timestamp: "2026-11-14T10:00:50Z",
    },
    {
      id: "log-4",
      participantId: "p-a",
      participantName: "GARUDA A",
      category: "Transporter",
      delta: 5,
      stageLabel: "Bonus (Laga 1 P2 @00:40.00)",
      timestamp: "2026-11-14T10:05:00Z",
    },
    {
      id: "log-5",
      participantId: "p-b",
      participantName: "RAJAWALI B",
      category: "Transporter",
      delta: -0.5,
      stageLabel: "Retry (Laga 1 P1 @00:30.00)",
      timestamp: "2026-11-14T10:00:20Z",
    },
    {
      id: "log-6",
      participantId: "p-b",
      participantName: "RAJAWALI B",
      category: "Transporter",
      delta: 0,
      stageLabel: "Menyerah • FINISH (Laga 1 P2 @05:00)",
      timestamp: "2026-11-14T10:09:00Z",
    },
    {
      id: "log-other",
      participantId: "p-a",
      participantName: "GARUDA A",
      category: "Transporter",
      delta: 5,
      stageLabel: "Point (Laga 10 P1 @00:10.00)",
      timestamp: "2026-11-14T11:00:00Z",
    },
  ];

  it("Filters match logs cleanly for Laga 1 without matching Laga 10", () => {
    const filtered = filterLogsForBracketMatch(sampleLogs, sampleMatch);
    assert.strictEqual(filtered.length, 6);
    assert.ok(!filtered.some((l) => l.id === "log-other"));
  });

  it("Detects Putaran 1 and Putaran 2 leg identifiers accurately", () => {
    assert.strictEqual(getPointLogLeg("Point (Laga 1 P1 @00:10.00)"), 1);
    assert.strictEqual(getPointLogLeg("Bonus (Laga 1 P2 @00:40.00)"), 2);
  });

  it("Computes per-category breakdown counts and subtotals while excluding surrender from Finish", () => {
    const filtered = filterLogsForBracketMatch(sampleLogs, sampleMatch);

    const rowsAAll = computeMatchLogCategoryBreakdown({
      logs: filtered,
      match: sampleMatch,
      is2xMode: true,
      legFilter: "all",
      team: "A",
    });

    assert.deepStrictEqual(
      rowsAAll.map((r) => ({ key: r.key, count: r.count, totalPts: r.totalPts })),
      [
        { key: "point", count: 1, totalPts: 5 },
        { key: "cekpoint", count: 1, totalPts: 10 },
        { key: "finish", count: 1, totalPts: 15 },
        { key: "bonus", count: 1, totalPts: 5 },
        { key: "retry", count: 0, totalPts: 0 },
      ]
    );

    const rowsALeg2 = computeMatchLogCategoryBreakdown({
      logs: filtered,
      match: sampleMatch,
      is2xMode: true,
      legFilter: 2,
      team: "A",
    });
    assert.strictEqual(rowsALeg2.find((r) => r.key === "point")?.count, 0);
    assert.strictEqual(rowsALeg2.find((r) => r.key === "bonus")?.count, 1);

    const rowsBAll = computeMatchLogCategoryBreakdown({
      logs: filtered,
      match: sampleMatch,
      is2xMode: true,
      legFilter: "all",
      team: "B",
    });
    assert.strictEqual(rowsBAll.find((r) => r.key === "finish")?.count, 0);
    assert.strictEqual(rowsBAll.find((r) => r.key === "retry")?.count, 1);
    assert.strictEqual(rowsBAll.find((r) => r.key === "retry")?.totalPts, -0.5);
  });

  it("Renders per-category breakdown and Nilai Akhir inside Dashboard Log Poin modal", () => {
    const pageContent = fs.readFileSync(path.join(process.cwd(), "src/app/page.tsx"), "utf-8");
    const dbContent = fs.readFileSync(path.join(process.cwd(), "src/lib/db.ts"), "utf-8");

    assert.ok(pageContent.includes("Rincian Per Skor (Point, Cekpoint, Finish, Bonus, Retry)"));
    assert.ok(pageContent.includes("computeMatchLogCategoryBreakdown({"));
    assert.ok(pageContent.includes("Nilai Akhir (Rata-Rata)"));
    assert.ok(!dbContent.includes("LIMIT 30"));
  });
});

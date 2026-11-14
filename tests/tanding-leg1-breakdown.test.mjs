import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Tanding Putaran 1 Rekap & Verifikasi Log Per-Score Breakdown", () => {
  const tandingPath = path.join(process.cwd(), "src/app/tanding/[id]/page.tsx");
  const content = fs.readFileSync(tandingPath, "utf-8");

  it("Defines breakdown categories for Point, Cekpoint, Finish, Bonus, and Retry", () => {
    assert.ok(content.includes('{ key: "point", label: "Point", fallbackPoints: 5 }'));
    assert.ok(content.includes('{ key: "cekpoint", label: "Cekpoint", fallbackPoints: 10 }'));
    assert.ok(content.includes('{ key: "finish", label: "Finish", fallbackPoints: 15 }'));
    assert.ok(content.includes('{ key: "bonus", label: "Bonus", fallbackPoints: 5 }'));
    assert.ok(content.includes('{ key: "retry", label: "Retry", fallbackPoints: -0.5 }'));
  });

  it("Excludes surrender logs from Finish bonus point breakdown counting", () => {
    assert.ok(
      content.includes('if (key === "finish") return al.includes("finish") && !al.includes("menyerah");')
    );
  });

  it("Renders interactive per-score breakdown inside both Team A and Team B cards in Rekap & Verifikasi Log", () => {
    assert.ok(content.includes("Rincian Per Skor (Putaran 1):"));
    assert.ok(content.includes('renderLeg1CategoryBreakdown("A")'));
    assert.ok(content.includes('renderLeg1CategoryBreakdown("B")'));
    assert.ok(content.includes("handleAdjustLeg1Rule("));
  });

  it("Renders per-score breakdown (Point, Cekpoint, Finish, Bonus, Retry) and Nilai Akhir (Rata-Rata) in Winner Modal after Putaran 2", () => {
    assert.ok(content.includes("getScoreCategoryBreakdown("));
    assert.ok(content.includes("setWinnerBreakdownLeg(is2x ? 2 : \"all\")"));
    assert.ok(content.includes("Nilai Akhir (Rata-Rata)"));
    assert.ok(content.includes("Tampilan Rincian Per Skor:"));
  });
});

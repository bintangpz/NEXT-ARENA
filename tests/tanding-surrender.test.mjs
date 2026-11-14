import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Tanding Match Corner Surrender (Menyerah) Feature", () => {
  const tandingPath = path.join(process.cwd(), "src/app/tanding/[id]/page.tsx");
  const content = fs.readFileSync(tandingPath, "utf-8");

  it("Renders a Menyerah button inside renderCornerCard for both Red and Blue sides", () => {
    assert.ok(content.includes("onClick={() => handleSurrender(corner, leg)}"));
    assert.ok(content.includes("<span>Menyerah</span>"));
    assert.ok(content.includes("disabled={isScoringLocked}"));
  });

  it("Calculates finish time at full matchLimit (e.g. 5 minutes -> 05:00.00) on surrender", () => {
    assert.ok(content.includes("const fullTimeMs = (matchLimit > 0 ? matchLimit : 300) * 1000;"));
    assert.ok(content.includes("const fullTimeFormatted = formatTime(fullTimeMs);"));
    assert.ok(content.includes("label: `Menyerah • FINISH ("));
    assert.ok(content.includes("@${fullTimeFormatted}"));
  });

  it("Preserves last session score without adding bonus points (delta: 0) and finalizes corner", () => {
    assert.ok(content.includes("delta: 0,"));
    assert.ok(content.includes("finalizeCornerAndCheckMatchEnd("));
    assert.ok(content.includes('showTimerCornerNotif(corner, "Menyerah", false, false, 2400);'));
  });
});

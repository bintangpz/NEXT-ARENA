import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildLeg1ResultTicker,
  buildMatchFinishedTicker,
  buildWelcomeMatchTicker,
  DEFAULT_TICKER_TEXT,
  formatTickerScoreSummary,
  resolveEffectiveTicker,
} from "../src/lib/liveTicker.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

describe("Sticky Live Arena Ticker & Match Lifecycle Transitions", () => {
  test("Sticky top container wraps ticker across Dashboard, Arena Battle, and Settings pages", () => {
    const dashboard = fs.readFileSync(path.join(rootDir, "src/app/page.tsx"), "utf-8");
    const arenaBattle = fs.readFileSync(
      path.join(rootDir, "src/app/tanding/[id]/page.tsx"),
      "utf-8"
    );
    const settings = fs.readFileSync(
      path.join(rootDir, "src/app/pengaturan/page.tsx"),
      "utf-8"
    );
    const globalsCss = fs.readFileSync(
      path.join(rootDir, "src/app/globals.css"),
      "utf-8"
    );

    for (const [name, content] of [
      ["Dashboard", dashboard],
      ["Arena Battle", arenaBattle],
      ["Settings", settings],
    ]) {
      assert.match(
        content,
        /<div className="sticky top-0[^>]*>[\s\S]*?<LiveTickerBar/,
        `${name} must keep LiveTickerBar inside a sticky top-0 wrapper`
      );
    }

    assert.match(
      arenaBattle,
      /overflow-x-clip/,
      "Arena battle page must use overflow-x-clip so position:sticky works reliably"
    );
    assert.doesNotMatch(
      globalsCss,
      /body\s*\{[\s\S]*?overflow-x:\s*hidden/,
      "body in globals.css should use overflow-x: clip rather than hidden to preserve sticky ticker"
    );
  });

  test("Generates 'Selamat Bertanding' ticker for Putaran 1, Putaran 2, 1x Main, and single-team match", () => {
    const leg1Msg = buildWelcomeMatchTicker({
      matchLabel: "Laga 1",
      teamA: "GARUDA A",
      teamB: "ELANG B",
      is2x: true,
      leg: 1,
    });
    assert.match(leg1Msg, /SELAMAT BERTANDING/i);
    assert.match(leg1Msg, /TIM GARUDA A dan TIM ELANG B/i);
    assert.match(leg1Msg, /Putaran 1/i);

    const leg2Msg = buildWelcomeMatchTicker({
      matchLabel: "Laga 1",
      teamA: "GARUDA A",
      teamB: "ELANG B",
      is2x: true,
      leg: 2,
    });
    assert.match(leg2Msg, /SELAMAT BERTANDING/i);
    assert.match(leg2Msg, /TIM GARUDA A dan TIM ELANG B/i);
    assert.match(leg2Msg, /Putaran 2/i);

    const oneTurnMsg = buildWelcomeMatchTicker({
      matchLabel: "Final",
      teamA: "TIM MERAH",
      teamB: "TIM BIRU",
      is2x: false,
    });
    assert.match(oneTurnMsg, /SELAMAT BERTANDING: TIM TIM MERAH dan TIM TIM BIRU \(Final\)/);

    const singleMsg = buildWelcomeMatchTicker({
      matchLabel: "Laga 3",
      teamA: "SOLOBOT",
      teamB: "- (Tanding Tunggal)",
      is2x: true,
      leg: 1,
      isSingle: true,
    });
    assert.match(singleMsg, /SELAMAT BERTANDING: TIM SOLOBOT/);
    assert.doesNotMatch(singleMsg, /Tanding Tunggal/);
  });

  test("Generates Putaran 1 point summary ticker for both teams when Babak/Putaran 1 completes", () => {
    const summaryA = formatTickerScoreSummary([
      { label: "Point", count: 3, totalPts: 15 },
      { label: "Cekpoint", count: 2, totalPts: 20 },
      { label: "Finish", count: 1, totalPts: 15 },
      { label: "Bonus", count: 0, totalPts: 0 },
      { label: "Retry", count: 1, totalPts: -0.5 },
    ]);
    assert.equal(
      summaryA,
      "Point 3x (+15), Cekpoint 2x (+20), Finish 1x (+15), Retry 1x (-0.5)"
    );

    const leg1Result = buildLeg1ResultTicker({
      matchLabel: "Laga 2",
      teamA: "ALPHA",
      teamB: "BETA",
      scoreALeg1: 49.5,
      scoreBLeg1: 40,
      summaryA,
      summaryB: "Point 2x (+10), Cekpoint 1x (+10), Finish 1x (+20)",
      finishTimeA: "01:12.40",
      finishTimeB: "01:25.10",
    });

    assert.match(leg1Result, /HASIL DATA POIN PUTARAN 1/i);
    assert.match(leg1Result, /ALPHA: 49\.5 PTS/);
    assert.match(leg1Result, /BETA: 40 PTS/);
    assert.match(leg1Result, /Finish 01:12\.40/);
    assert.match(leg1Result, /Putaran 2/i);
  });

  test("Generates final result ticker and restores configured announcement once finished or returned to Bagan", () => {
    const finishedMsg = buildMatchFinishedTicker({
      matchLabel: "Laga 4",
      teamA: "ALPHA",
      teamB: "BETA",
      scoreA: 55,
      scoreB: 50,
      winnerName: "ALPHA",
      finishTimeA: "01:05.20",
      finishTimeB: "01:18.00",
    });
    assert.match(finishedMsg, /HASIL AKHIR \(Laga 4\)/);
    assert.match(finishedMsg, /Pemenang: ALPHA/);

    const baseAnnouncement = "Pengumuman Resmi Nusantara Next 2026!";

    // While linked match is ongoing, live ticker takes precedence
    const activeResolved = resolveEffectiveTicker({
      announcement: baseAnnouncement,
      liveTicker: "🔥 SELAMAT BERTANDING: TIM ALPHA dan TIM BETA",
      liveTickerMatchId: "m-1",
      liveTickerMode: "welcome",
      bracketMatches: [{ id: "m-1", status: "Berlangsung" }],
    });
    assert.equal(activeResolved.mode, "welcome");
    assert.match(activeResolved.text, /SELAMAT BERTANDING/);

    // When match status becomes Selesai, Bagan automatically returns to configured announcement
    const finishedResolved = resolveEffectiveTicker({
      announcement: baseAnnouncement,
      liveTicker: "🔥 SELAMAT BERTANDING: TIM ALPHA dan TIM BETA",
      liveTickerMatchId: "m-1",
      liveTickerMode: "welcome",
      bracketMatches: [{ id: "m-1", status: "Selesai" }],
    });
    assert.equal(finishedResolved.mode, "default");
    assert.equal(finishedResolved.text, baseAnnouncement);

    // When liveTicker is cleared on Kembali ke Bagan, fallback to announcement or default
    const clearedResolved = resolveEffectiveTicker({
      announcement: "",
      liveTicker: "",
      liveTickerMatchId: "",
      liveTickerMode: "default",
      bracketMatches: [],
    });
    assert.equal(clearedResolved.mode, "default");
    assert.equal(clearedResolved.text, DEFAULT_TICKER_TEXT);
  });
});

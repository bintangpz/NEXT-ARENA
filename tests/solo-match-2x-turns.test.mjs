import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  isSingleMatchTeamB,
  resolveRoundTurns,
  mergeStageTurnsMap,
  formatMatchModeLabel,
  isActiveSoloCorner,
} from "../src/lib/matchMode.ts";

describe("Odd / Solo Participant (Tanding Tunggal) 2x Main Support", () => {
  it("Identifies solo match opponents accurately", () => {
    assert.strictEqual(isSingleMatchTeamB("- (Tanding Tunggal)"), true);
    assert.strictEqual(isSingleMatchTeamB("-"), true);
    assert.strictEqual(isSingleMatchTeamB("BYE"), true);
    assert.strictEqual(isSingleMatchTeamB(""), true);
    assert.strictEqual(isSingleMatchTeamB(null), true);
    assert.strictEqual(isSingleMatchTeamB("TIM GARUDA"), false);
  });

  it("Resolves 2x vs 1x stage turns using stage settings first, then roundMatchTurns", () => {
    const stages = [
      { name: "Babak Penyisihan", turns: "2x" },
      { name: "Babak 8 Besar", turns: "2x" },
      { name: "Babak Semifinal", turns: "1x" },
      { name: "Babak Final", turns: "2x" },
    ];
    assert.strictEqual(resolveRoundTurns("Babak Penyisihan", stages, {}), "2x");
    assert.strictEqual(resolveRoundTurns("Babak 8 Besar", stages, { "Babak 8 Besar": "1x" }), "2x");
    assert.strictEqual(resolveRoundTurns("Babak Semifinal", stages, {}), "1x");
    assert.strictEqual(resolveRoundTurns("Babak Final", stages, {}), "2x");
    assert.strictEqual(
      resolveRoundTurns("Custom Round", [], { "Custom Round": "2x" }, "1x"),
      "2x"
    );
  });

  it("Merges tournament_stages and round_match_turns cleanly with canonical stage turns taking precedence", () => {
    const merged = mergeStageTurnsMap(
      JSON.stringify([
        { id: "s1", name: "Babak Penyisihan", model: "ranking", turns: "2x" },
        { id: "s2", name: "Babak 8 Besar", model: "gugur", turns: "2x" },
      ]),
      JSON.stringify({ "Babak 8 Besar": "1x", "Custom": "2x" })
    );
    assert.deepStrictEqual(merged, {
      "Babak Penyisihan": "2x",
      "Babak 8 Besar": "2x",
      Custom: "2x",
    });
  });

  it("Formats solo match mode labels with explicit 2x Main (Tukar Sisi) or 1x Main indicator", () => {
    assert.strictEqual(
      formatMatchModeLabel(true, true),
      "1 Tim (Tanding Tunggal) • 2x Main (Tukar Sisi)"
    );
    assert.strictEqual(
      formatMatchModeLabel(true, false),
      "1 Tim (Tanding Tunggal) • 1x Main"
    );
    assert.strictEqual(formatMatchModeLabel(false, true), "2x Main (Tukar Sisi)");
    assert.strictEqual(formatMatchModeLabel(false, false), "1x Main (Langsung Data)");
  });

  it("Routes active solo corners across P1 (Red) and P2 Tukar Sisi (Blue) in 2x mode", () => {
    // 2x Putaran 1 -> Sudut Merah active, Sudut Biru inactive
    assert.strictEqual(isActiveSoloCorner("red", 1, true), true);
    assert.strictEqual(isActiveSoloCorner("blue", 1, true), false);
    // 2x Putaran 2 (Tukar Sisi) -> Sudut Biru active, Sudut Merah inactive
    assert.strictEqual(isActiveSoloCorner("red", 2, true), false);
    assert.strictEqual(isActiveSoloCorner("blue", 2, true), true);
    // 1x mode -> only Sudut Merah active
    assert.strictEqual(isActiveSoloCorner("red", 1, false), true);
    assert.strictEqual(isActiveSoloCorner("blue", 1, false), false);
  });

  it("Pengaturan bracket cards allow isSingle matches in 2x rounds to render Putaran 1 & Putaran 2 (not forced into 1x)", () => {
    const pengaturanSrc = fs.readFileSync(
      path.join(process.cwd(), "src/app/pengaturan/page.tsx"),
      "utf-8"
    );
    assert.ok(
      !pengaturanSrc.includes("{is2x && !isSingle ?"),
      "pengaturan/page.tsx must not force isSingle matches into 1x UI when round is 2x"
    );
    assert.ok(pengaturanSrc.includes("formatMatchModeLabel(isSingle, is2x)"));
    assert.ok(pengaturanSrc.includes("isActiveSoloCorner("));
  });

  it("Dashboard bracket cards and Log Poin modal recognize solo matches across 2x and - (Tanding Tunggal)", () => {
    const pageSrc = fs.readFileSync(
      path.join(process.cwd(), "src/app/page.tsx"),
      "utf-8"
    );
    assert.ok(pageSrc.includes("formatMatchModeLabel(isSingle, is2x)"));
    assert.ok(pageSrc.includes("isSingleMatchTeamB(resolvedViewLogMatch.teamB)"));
    assert.ok(pageSrc.includes("isActiveSoloCorner("));
  });

  it("Battle page loads stage turns, supports solo Tukar Sisi across P1/P2, and cleans Leg 1 modal for solo teams", () => {
    const tandingSrc = fs.readFileSync(
      path.join(process.cwd(), "src/app/tanding/[id]/page.tsx"),
      "utf-8"
    );
    assert.ok(tandingSrc.includes("mergeStageTurnsMap("));
    assert.ok(tandingSrc.includes("resolveRoundTurns(match.round"));
    assert.ok(tandingSrc.includes("isActiveSoloCorner("));
    assert.ok(
      tandingSrc.includes('{/* TIM B (SUDUT BIRU DI PUTARAN 1) */}\n              {!isSingle && (')
    );
  });
});

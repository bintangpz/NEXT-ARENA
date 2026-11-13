import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Arena Battle Screen Refinements Test Suite", () => {
  const rootDir = process.cwd();
  const tandingPath = path.join(rootDir, "src/app/tanding/[id]/page.tsx");
  const tandingContent = fs.readFileSync(tandingPath, "utf-8");

  describe("Requirement 1: Header Navigation Clean-up", () => {
    it("Does NOT contain 'Monitor Proyektor' button in arena header", () => {
      assert.strictEqual(
        tandingContent.includes("Monitor Proyektor"),
        false,
        "Header should not have 'Monitor Proyektor' button"
      );
    });

    it("Has 'Kembali ke Bagan' link pointing to /?tab=bracket", () => {
      assert.strictEqual(
        tandingContent.includes("<span>Kembali ke Bagan</span>"),
        true,
        "Header must have 'Kembali ke Bagan' link"
      );
      assert.strictEqual(
        tandingContent.includes('href="/?tab=bracket"'),
        true,
        "Back button must navigate to /?tab=bracket"
      );
    });
  });

  describe("Requirement 2: Header Top-Right Badges Clean-up", () => {
    it("Does NOT contain '2x Main (Tukar Sisi)' badge in the top right header", () => {
      assert.strictEqual(
        tandingContent.includes('<span>{is2x ? "2x Main (Tukar Sisi)" : "1x Main (Langsung Final)"}</span>'),
        false,
        "Header right should not have 2x Main indicator"
      );
    });
  });

  describe("Requirement 3: Remove Skip Buttons (Selesai P1 & Tukar Sisi)", () => {
    it("Does NOT contain 'Selesai Putaran 1 & Tukar Sisi ➔'", () => {
      assert.strictEqual(
        tandingContent.includes("Selesai Putaran 1 & Tukar Sisi ➔"),
        false,
        "Main timer buttons should not allow skipping Putaran 1"
      );
    });

    it("Does NOT contain 'Selesai P1 & Tukar Sisi ke Putaran 2 ➔'", () => {
      assert.strictEqual(
        tandingContent.includes("Selesai P1 & Tukar Sisi ke Putaran 2 ➔"),
        false,
        "Switcher bar should not contain skip button"
      );
    });

    it("Contains 'Selesai Laga & Kunci Skor' for official match conclusion", () => {
      assert.strictEqual(
        tandingContent.includes("<span>Selesai Laga & Kunci Skor</span>"),
        true,
        "Official finish button must be present"
      );
    });
  });

  describe("Requirement 4: Sleek Esports HUD Toast & Switcher Tabs", () => {
    it("Uses smooth entrance animation instead of crude animate-bounce", () => {
      assert.strictEqual(
        tandingContent.includes("animate-bounce flex items-center gap-2"),
        false,
        "Toast must not use animate-bounce"
      );
      assert.strictEqual(
        tandingContent.includes("slide-in-from-top-4"),
        true,
        "Toast must use smooth slide-in-from-top entrance"
      );
    });

    it("Supports rich feedback for Putaran 2 Tukar Sisi with corner badges", () => {
      assert.strictEqual(
        tandingContent.includes("TUKAR SISI ARENA • PUTARAN 2"),
        true,
        "Must have rich Putaran 2 Tukar Sisi announcement"
      );
      assert.strictEqual(
        tandingContent.includes("KEMBALI KE PUTARAN 1"),
        true,
        "Must have rich Kembali ke Putaran 1 announcement"
      );
    });

    it("Supports rich feedback for Reset Pertandingan & Reset Stopwatch", () => {
      assert.strictEqual(
        tandingContent.includes("PERTANDINGAN BERHASIL DIRESET"),
        true,
        "Must have rich reset match notification"
      );
      assert.strictEqual(
        tandingContent.includes("STOPWATCH DIRESET"),
        true,
        "Must have rich reset stopwatch notification"
      );
    });

    it("2x Main Switcher Bar features segmented control with live status indicators", () => {
      assert.strictEqual(
        tandingContent.includes("Fokus Sesi Laga:"),
        true,
        "Must have prominent session selector label"
      );
      assert.strictEqual(
        tandingContent.includes("handleSwitchLeg(1)"),
        true,
        "Must support switching to Leg 1"
      );
      assert.strictEqual(
        tandingContent.includes("handleSwitchLeg(2)"),
        true,
        "Must support switching to Leg 2"
      );
    });
  });

  describe("Requirement 5: Preparation Controls Clean-up (No Skip & No Double Icons)", () => {
    it("Does NOT contain 'Selesai Persiapan (Kembali ke Tempat)' button", () => {
      assert.strictEqual(
        tandingContent.includes("Selesai Persiapan (Kembali ke Tempat)"),
        false,
        "Preparation time cannot be skipped"
      );
    });

    it("Jeda Persiapan does NOT contain duplicate ⏸️ emoji", () => {
      assert.strictEqual(
        tandingContent.includes("<span>Jeda Persiapan</span>"),
        true,
        "Must contain clean 'Jeda Persiapan' label"
      );
      assert.strictEqual(
        tandingContent.includes("⏸️ Jeda Persiapan"),
        false,
        "Must not contain duplicate ⏸️ emoji"
      );
    });

    it("Lanjutkan Persiapan does NOT contain duplicate ▶️ emoji", () => {
      assert.strictEqual(
        tandingContent.includes("<span>Lanjutkan Persiapan</span>"),
        true,
        "Must contain clean 'Lanjutkan Persiapan' label"
      );
      assert.strictEqual(
        tandingContent.includes("▶️ Lanjutkan Persiapan"),
        false,
        "Must not contain duplicate ▶️ emoji"
      );
    });

    it("Preparation notifications and emojis are completely removed", () => {
      assert.strictEqual(
        tandingContent.includes("Waktu persiapan habis! Pastikan seluruh peserta"),
        false,
        "Blue preparation ended banner must be removed"
      );
      assert.strictEqual(
        tandingContent.includes("🚀"),
        false,
        "Rocket emoji must be removed"
      );
      assert.strictEqual(
        tandingContent.includes("🚶"),
        false,
        "Walking person emoji must be removed"
      );
    });
  });

  describe("Requirement 6: Start Match Button Replacement (Replaces Peserta Sudah di Tempat)", () => {
    it("Does NOT contain 'Peserta Sudah di Tempat' button label", () => {
      assert.strictEqual(
        tandingContent.includes("Peserta Sudah di Tempat"),
        false,
        "'Peserta Sudah di Tempat' button must be replaced"
      );
    });

    it("Replaced with 'Mulai Pertandingan' button that triggers countdown", () => {
      assert.strictEqual(
        tandingContent.includes("<span>Mulai Pertandingan</span>"),
        true,
        "Must contain 'Mulai Pertandingan' button label"
      );
      assert.strictEqual(
        tandingContent.includes('title="Mulai Pertandingan (Langsung Hitung Mundur 3-2-1)"'),
        true,
        "Button title must reflect direct countdown action"
      );
    });
  });

  describe("Requirement 7: Match Mode Hotkey Restriction", () => {
    const homeContent = fs.readFileSync(path.join(rootDir, "src/app/page.tsx"), "utf-8");
    const pengaturanContent = fs.readFileSync(path.join(rootDir, "src/app/pengaturan/page.tsx"), "utf-8");

    it("Arena battle page only enables scoring hotkeys when in match mode", () => {
      assert.strictEqual(
        tandingContent.includes('if (timerPhase !== "match" && timerPhase !== "match_paused")'),
        true,
        "handleKeyDown in tanding page must guard against non-match timer phases"
      );
    });

    it("Dashboard and Pengaturan only enable hotkeys if a match has status 'Berlangsung'", () => {
      assert.strictEqual(
        homeContent.includes('const activeMatch = bracketMatches.find((m) => m.status === "Berlangsung");'),
        true,
        "Dashboard hotkeys must require status 'Berlangsung'"
      );
      assert.strictEqual(
        pengaturanContent.includes('const activeMatch = bracketMatches.find((m) => m.status === "Berlangsung");'),
        true,
        "Pengaturan hotkeys must require status 'Berlangsung'"
      );
    });
  });

  describe("Requirement 8: 2x Match Transition (Log Review, Score Revision & Standby Putaran 2)", () => {
    it("Contains Putaran 1 Log Review and Revision Modal", () => {
      assert.strictEqual(
        tandingContent.includes("Rekap &amp; Verifikasi Log Putaran 1") ||
          tandingContent.includes("Rekap & Verifikasi Log Putaran 1"),
        true,
        "Must contain Putaran 1 Log Verification & Revision header"
      );
      assert.strictEqual(
        tandingContent.includes("revisedLeg1ScoreA") && tandingContent.includes("revisedLeg1ScoreB"),
        true,
        "Must support score revision for both teams in Putaran 1"
      );
    });

    it("Requires ACC confirmation before proceeding to Putaran 2", () => {
      assert.strictEqual(
        tandingContent.includes("handleConfirmAccLeg1"),
        true,
        "Must define handleConfirmAccLeg1 handler"
      );
      assert.strictEqual(
        tandingContent.includes("ACC Skor &amp; Masuk ke Putaran 2") ||
          tandingContent.includes("ACC Skor & Masuk ke Putaran 2"),
        true,
        "Must require ACC confirmation button to proceed"
      );
    });

    it("Putaran 2 is STOPPED / IDLE upon entry and does NOT automatically start", () => {
      // In handleConfirmAccLeg1, timer is idle and stopped
      assert.match(
        tandingContent,
        /setTimerPhase\("idle"\)[\s\S]*?setIsTimerRunning\(false\)/,
        "Timer must be in idle stopped state when entering Putaran 2"
      );
      // Switcher bar has access to review Putaran 1 logs
      assert.strictEqual(
        tandingContent.includes("Tinjau Log Putaran 1"),
        true,
        "Must contain 'Tinjau Log Putaran 1' button in switcher bar"
      );
    });
  });
});


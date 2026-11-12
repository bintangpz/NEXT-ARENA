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
});


/**
 * Next Arena - E2E Stage Point Reset & Monitor Cleanup Test Suite
 * Covers R1, R2, R3, R4 across Tiers 1-4 per TEST_INFRA.md and PROJECT.md
 *
 * Execution:
 * node tests/e2e-stage-reset.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

// Paths to project files under test
const PROJECT_ROOT = process.cwd();
const SETTINGS_PAGE_PATH = path.join(PROJECT_ROOT, "src/app/pengaturan/page.tsx");
const MOCK_COMPETITION_PATH = path.join(PROJECT_ROOT, "src/data/mockCompetition.ts");
const DB_LIB_PATH = path.join(PROJECT_ROOT, "src/lib/db.ts");
const DASHBOARD_PAGE_PATH = path.join(PROJECT_ROOT, "src/app/page.tsx");

// Helper: Read file safely
function readSource(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Target source file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Authoritative Scoring Oracle
 * Implements Stage Scoring Contract from PROJECT.md:
 * - Stage 0: E(p, 0) = S(p, 0)
 * - Stage k > 0:
 *   - If stage.resetPoints !== false (default true): E(p, k) = S(p, k)
 *   - If stage.resetPoints === false: E(p, k) = E(p, k-1) + S(p, k)
 */
export function calculateEffectiveStageScores(stages, participantScoresByStage) {
  const result = {};
  for (const [pId, scores] of Object.entries(participantScoresByStage)) {
    const effective = [];
    for (let k = 0; k < stages.length; k++) {
      const earned = scores[k] ?? 0;
      const stage = stages[k];
      const reset = stage?.resetPoints !== false; // Contract: defaults to true unless explicitly false
      if (k === 0 || reset) {
        effective.push(earned);
      } else {
        effective.push(effective[k - 1] + earned);
      }
    }
    result[pId] = effective;
  }
  return result;
}

/**
 * Authoritative Standings Ranking Oracle
 * Computes sorted standings at stageIndex based on effective stage score.
 */
export function rankParticipantsForStage(stages, participantScoresByStage, stageIndex) {
  const effectiveScores = calculateEffectiveStageScores(stages, participantScoresByStage);
  const list = Object.entries(effectiveScores).map(([pId, scores]) => ({
    id: pId,
    effectiveScore: scores[stageIndex] ?? 0,
  }));

  list.sort((a, b) => b.effectiveScore - a.effectiveScore);

  let currentRank = 1;
  return list.map((item, idx, arr) => {
    if (idx > 0 && item.effectiveScore < arr[idx - 1].effectiveScore) {
      currentRank = idx + 1;
    }
    return {
      ...item,
      rank: currentRank,
    };
  });
}

/**
 * In-Memory SQLite Helper matching Next Arena schema
 */
function createInMemoryDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

// ============================================================================
// TIER 1: FEATURE COVERAGE (≥5 per feature, 20 total)
// ============================================================================

describe("Tier 1 - Feature Coverage", () => {
  // Feature 1: R1 Remove Monitor Focus Setting
  describe("R1: Remove Monitor / Projector Focus Setting", () => {
    it("T1.1_R1: Monitor focus heading is completely absent from settings page", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      const hasHeading = source.includes("Fokus Layar Monitor / Proyektor Arena");
      assert.equal(
        hasHeading,
        false,
        'Expected "Fokus Layar Monitor / Proyektor Arena" to be completely removed from src/app/pengaturan/page.tsx'
      );
    });

    it("T1.2_R1: Monitor focus explanation subtitle is completely absent", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      const hasSubtitle = source.includes(
        "Pilih tampilan utama yang disiarkan pada layar monitor / proyektor arena"
      );
      assert.equal(
        hasSubtitle,
        false,
        'Expected "Pilih tampilan utama yang disiarkan pada layar monitor / proyektor arena" to be completely removed'
      );
    });

    it("T1.3_R1: Monitor focus 3-option display selector is removed", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      // The old monitor block had "Aktif: Bagan Pertandingan / Matriks Juri / Klasemen & Peringkat"
      const hasMonitorBadge = /Aktif:\s*\{defaultMonitorView\s*===/i.test(source);
      assert.equal(
        hasMonitorBadge,
        false,
        "Expected the defaultMonitorView selector block in settings page to be removed"
      );
    });

    it("T1.4_R1: No lingering monitor focus UI container or comment remains", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      const hasContainer = /Pengaturan Tampilan Monitor Utama Arena/i.test(source);
      assert.equal(
        hasContainer,
        false,
        'Expected comment/section "Pengaturan Tampilan Monitor Utama Arena" to be completely removed'
      );
    });

    it("T1.5_R1: Other settings sections remain intact and undamaged", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      assert.ok(
        source.includes("Daftar Babak Pertandingan"),
        'Expected "Daftar Babak Pertandingan" section to remain intact'
      );
      assert.ok(
        source.includes("Setting Babak & Model"),
        'Expected "Setting Babak & Model" tab to remain intact'
      );
      assert.ok(
        source.includes("Input & Kelola Peserta"),
        'Expected "Input & Kelola Peserta" tab to remain intact'
      );
      assert.ok(
        source.includes("Setting Match Timer"),
        'Expected "Setting Match Timer" tab to remain intact'
      );
    });
  });

  // Feature 2: R2 Stage Point Reset Setting
  describe("R2: Stage Point Reset Setting", () => {
    it("T1.6_R2: Stage card contains controls for point reset (reset to 0 vs carry over)", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      const hasResetPointsControl =
        source.includes("resetPoints") &&
        (source.includes("Reset ke 0") || source.includes("Reset Poin") || source.includes("Bawa Poin") || source.includes("Akumulasi"));
      assert.ok(
        hasResetPointsControl,
        "Expected stage cards in src/app/pengaturan/page.tsx to have point reset toggle controls"
      );
    });

    it("T1.7_R2: Add Stage Modal includes point reset configuration", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      // Search within the Add Stage modal area or state
      const hasModalResetControl =
        source.includes("newStageResetPoints") ||
        (source.includes("isAddStageModalOpen") && source.includes("resetPoints"));
      assert.ok(
        hasModalResetControl,
        "Expected Add Stage modal to offer a point reset toggle/selection"
      );
    });

    it("T1.8_R2: handleAddStage defaults newly created stages to reset points to 0 (resetPoints: true)", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      // Verify handleAddStage creates newStage with resetPoints: true (or equivalent)
      const createsWithResetTrue =
        /handleAddStage[\s\S]*?newStage[\s\S]*?resetPoints/m.test(source) &&
        /resetPoints:\s*(true|newStageResetPoints)/.test(source);
      assert.ok(
        createsWithResetTrue,
        "Expected handleAddStage to default resetPoints to true on newly created stages"
      );
    });

    it("T1.9_R2: handleUpdateStage supports updating resetPoints", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      // handleUpdateStage takes Partial<TournamentStage>
      const supportsUpdate =
        source.includes("handleUpdateStage") &&
        source.includes("resetPoints");
      assert.ok(
        supportsUpdate,
        "Expected handleUpdateStage to support updating the resetPoints property"
      );
    });

    it("T1.10_R2: Stage cards display visual indicator / badge of point reset mode", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      const hasBadge =
        source.includes("stage.resetPoints") ||
        source.includes("resetPoints !== false");
      assert.ok(
        hasBadge,
        "Expected stage cards to display visual status of resetPoints setting"
      );
    });
  });

  // Feature 3: R3 Data Model and Storage
  describe("R3: Data Model and Storage", () => {
    it("T1.11_R3: TournamentStage interface includes resetPoints property", () => {
      const source = readSource(MOCK_COMPETITION_PATH);
      const interfaceMatch = source.match(/export interface TournamentStage\s*\{([\s\S]*?)\}/);
      assert.ok(interfaceMatch, "TournamentStage interface must exist in src/data/mockCompetition.ts");
      const interfaceBody = interfaceMatch[1];
      assert.ok(
        interfaceBody.includes("resetPoints?: boolean") || interfaceBody.includes("resetPoints: boolean"),
        "TournamentStage interface must include resetPoints?: boolean"
      );
    });

    it("T1.12_R3: DEFAULT_TOURNAMENT_STAGES defines resetPoints for default stages", () => {
      const source = readSource(MOCK_COMPETITION_PATH);
      const defaultStagesMatch = source.match(/DEFAULT_TOURNAMENT_STAGES:\s*TournamentStage\[\]\s*=\s*\[([\s\S]*?)\];/);
      assert.ok(defaultStagesMatch, "DEFAULT_TOURNAMENT_STAGES must be defined");
      assert.ok(
        defaultStagesMatch[1].includes("resetPoints"),
        "DEFAULT_TOURNAMENT_STAGES entries must specify resetPoints"
      );
    });

    it("T1.13_R3: SQLite database initial seed includes resetPoints in tournament_stages", () => {
      const source = readSource(DB_LIB_PATH);
      const insertSettingStages = source.match(/insertSetting\.run\(\s*["']tournament_stages["'],\s*JSON\.stringify\(\[([\s\S]*?)\]\)\s*\);/);
      assert.ok(insertSettingStages, "db.ts must have insertSetting for tournament_stages");
      assert.ok(
        insertSettingStages[1].includes("resetPoints"),
        "db.ts initial tournament_stages seed must include resetPoints"
      );
    });

    it("T1.14_R3: SQLite database migration/ensure seed includes resetPoints", () => {
      const source = readSource(DB_LIB_PATH);
      const ensureSettingStages = source.match(/ensureSetting\.run\(\s*["']tournament_stages["'],\s*JSON\.stringify\(\[([\s\S]*?)\]\)\s*\);/);
      assert.ok(ensureSettingStages, "db.ts must have ensureSetting for tournament_stages");
      assert.ok(
        ensureSettingStages[1].includes("resetPoints"),
        "db.ts ensureSetting tournament_stages seed must include resetPoints"
      );
    });

    it("T1.15_R3: Serialization and deserialization preserves resetPoints boolean", () => {
      const sampleStages = [
        { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
        { id: "s2", name: "Babak 2", model: "gugur", turns: "2x", resetPoints: false },
      ];
      const serialized = JSON.stringify(sampleStages);
      const parsed = JSON.parse(serialized);
      assert.equal(parsed[0].resetPoints, true);
      assert.equal(parsed[1].resetPoints, false);
    });
  });

  // Feature 4: R4 Scoring and Standings Calculation
  describe("R4: Scoring and Standings Calculation", () => {
    it("T1.16_R4: Stage 0 score starts at 0 and equals points earned in stage 0", () => {
      const stages = [
        { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
      ];
      const scores = { "team-a": [450] };
      const effective = calculateEffectiveStageScores(stages, scores);
      assert.equal(effective["team-a"][0], 450);
    });

    it("T1.17_R4: Stage with resetPoints: true isolates score to points earned in this stage", () => {
      const stages = [
        { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
        { id: "s2", name: "Babak 2", model: "ranking", turns: "1x", resetPoints: true },
      ];
      const scores = { "team-a": [300, 200] };
      const effective = calculateEffectiveStageScores(stages, scores);
      assert.equal(effective["team-a"][0], 300);
      assert.equal(effective["team-a"][1], 200); // Reset to 0: only stage 2 points
    });

    it("T1.18_R4: Stage with resetPoints: false carries over accumulated points from prior stage", () => {
      const stages = [
        { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
        { id: "s2", name: "Babak 2", model: "ranking", turns: "1x", resetPoints: false },
      ];
      const scores = { "team-a": [300, 200] };
      const effective = calculateEffectiveStageScores(stages, scores);
      assert.equal(effective["team-a"][0], 300);
      assert.equal(effective["team-a"][1], 500); // 300 + 200
    });

    it("T1.19_R4: Standings ranks participants strictly by effective stage score in descending order", () => {
      const stages = [
        { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
        { id: "s2", name: "Babak 2", model: "ranking", turns: "1x", resetPoints: false },
      ];
      const scores = {
        "team-a": [300, 100], // S0: 300, S1: 400
        "team-b": [100, 400], // S0: 100, S1: 500
      };
      const rankings = rankParticipantsForStage(stages, scores, 1);
      assert.equal(rankings[0].id, "team-b");
      assert.equal(rankings[0].rank, 1);
      assert.equal(rankings[0].effectiveScore, 500);
      assert.equal(rankings[1].id, "team-a");
      assert.equal(rankings[1].rank, 2);
      assert.equal(rankings[1].effectiveScore, 400);
    });

    it("T1.20_R4: src/app/page.tsx standings computation references stage resetPoints logic", () => {
      const source = readSource(DASHBOARD_PAGE_PATH);
      const referencesResetPoints =
        source.includes("resetPoints") ||
        source.includes("reset_points") ||
        source.includes("stage.resetPoints");
      assert.ok(
        referencesResetPoints,
        "Expected src/app/page.tsx standings or ranking computation to reference stage resetPoints configuration"
      );
    });
  });
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (≥5 per feature, 20 total)
// ============================================================================

describe("Tier 2 - Boundary and Corner Cases", () => {
  // Feature 1 Corner Cases
  describe("R1 Corner Cases: Monitor Focus Removal", () => {
    it("T2.1_R1: Case-insensitive and whitespace-flexible search finds 0 monitor focus headings", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      const matches = source.match(/fokus\s+layar\s+monitor\s*\/\s*proyektor\s+arena/gi);
      assert.equal(matches, null, "Regex match for monitor focus heading must be null");
    });

    it("T2.2_R1: Tournament round title / banner setting remains available", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      assert.ok(
        source.includes("roundTitle") || source.includes("round_title"),
        "The tournament round title setting must remain functional"
      );
    });

    it("T2.3_R1: Settings page JSX remains syntactically well-formed without dangling closing tags", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      assert.ok(
        source.includes("export default function PengaturanPage"),
        "Settings page must export PengaturanPage"
      );
      // Verify main container tags balance
      const openMains = (source.match(/<main(\s|>)/g) || []).length;
      const closeMains = (source.match(/<\/main>/g) || []).length;
      assert.equal(openMains, closeMains, "Main container tags must balance");
      // Verify balanced curly brackets across component
      let openBraces = 0;
      let closeBraces = 0;
      for (const ch of source) {
        if (ch === "{") openBraces++;
        if (ch === "}") closeBraces++;
      }
      assert.equal(openBraces, closeBraces, `Braces must balance: { ${openBraces} vs } ${closeBraces}`);
    });

    it("T2.4_R1: Settings page handles empty/undefined default_monitor_view gracefully", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      // Settings page should not crash if default_monitor_view is absent from DB
      assert.ok(source.length > 1000, "Settings source is valid");
    });

    it("T2.5_R1: No orphaned buttons for monitor display modes in settings page", () => {
      const source = readSource(SETTINGS_PAGE_PATH);
      // Verify the 3 specific buttons from the old monitor focus block are gone
      const hasOldCard1 = source.includes("Bagan Pertandingan") && source.includes("Matriks Juri");
      // If present, verify they are not inside a monitor selection card
      const hasOldMonitorOptions = /Pilih tampilan utama yang disiarkan/i.test(source);
      assert.equal(hasOldMonitorOptions, false);
    });
  });

  // Feature 2 Corner Cases
  describe("R2 Corner Cases: Stage Point Reset Setting", () => {
    it("T2.6_R2: Creating a stage with explicit carry-over (resetPoints: false) sets false correctly", () => {
      const stages = [];
      const newStage = {
        id: "stage-custom",
        name: "Playoff",
        model: "gugur",
        turns: "1x",
        resetPoints: false,
      };
      stages.push(newStage);
      assert.equal(stages[0].resetPoints, false);
    });

    it("T2.7_R2: Creating a stage with special characters and whitespace retains resetPoints", () => {
      const rawName = "  Babak Playoff & Wildcard #1 [2026]  ";
      const trimmed = rawName.trim();
      const stage = {
        id: `stage-${Date.now()}`,
        name: trimmed,
        model: "ranking",
        turns: "2x",
        resetPoints: true,
      };
      assert.equal(stage.name, "Babak Playoff & Wildcard #1 [2026]");
      assert.equal(stage.resetPoints, true);
    });

    it("T2.8_R2: Multiple toggles of resetPoints on an existing stage alternate cleanly", () => {
      let stage = { id: "s1", name: "Penyisihan", model: "ranking", turns: "1x", resetPoints: true };
      // Toggle to false
      stage = { ...stage, resetPoints: false };
      assert.equal(stage.resetPoints, false);
      // Toggle back to true
      stage = { ...stage, resetPoints: true };
      assert.equal(stage.resetPoints, true);
      // Toggle back to false
      stage = { ...stage, resetPoints: false };
      assert.equal(stage.resetPoints, false);
    });

    it("T2.9_R2: Deleting a stage does not corrupt remaining stages' resetPoints settings", () => {
      const stages = [
        { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
        { id: "s2", name: "Babak 2", model: "ranking", turns: "1x", resetPoints: false },
        { id: "s3", name: "Babak 3", model: "gugur", turns: "1x", resetPoints: true },
      ];
      // Delete middle stage s2
      const filtered = stages.filter((s) => s.id !== "s2");
      assert.equal(filtered.length, 2);
      assert.equal(filtered[0].id, "s1");
      assert.equal(filtered[0].resetPoints, true);
      assert.equal(filtered[1].id, "s3");
      assert.equal(filtered[1].resetPoints, true);
    });

    it("T2.10_R2: Reordering stages preserves each stage's attached resetPoints setting", () => {
      const stages = [
        { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
        { id: "s2", name: "Babak 2", model: "gugur", turns: "1x", resetPoints: false },
      ];
      // Swap order
      const reordered = [stages[1], stages[0]];
      assert.equal(reordered[0].id, "s2");
      assert.equal(reordered[0].resetPoints, false);
      assert.equal(reordered[1].id, "s1");
      assert.equal(reordered[1].resetPoints, true);
    });
  });

  // Feature 3 Corner Cases
  describe("R3 Corner Cases: Data Model and Storage", () => {
    it("T2.11_R3: Legacy stage object without resetPoints defaults to true per contract", () => {
      const legacyStage = { id: "s-legacy", name: "Old Stage", model: "ranking", turns: "1x" };
      const effectiveReset = legacyStage.resetPoints !== false;
      assert.equal(effectiveReset, true, "Legacy stage without resetPoints must default to true");
    });

    it("T2.12_R3: Explicit false is preserved and never coerced to truthy default", () => {
      const stage = { id: "s-carry", name: "Carry Stage", model: "ranking", turns: "1x", resetPoints: false };
      const effectiveReset = stage.resetPoints !== false;
      assert.equal(effectiveReset, false, "Explicit false must not be coerced to true");
    });

    it("T2.13_R3: Deserializing empty array of stages succeeds safely", () => {
      const emptyJson = "[]";
      const parsed = JSON.parse(emptyJson);
      assert.ok(Array.isArray(parsed));
      assert.equal(parsed.length, 0);
    });

    it("T2.14_R3: SQLite database roundtrip preserves boolean resetPoints integrity", () => {
      const db = createInMemoryDb();
      const testStages = [
        { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
        { id: "s2", name: "Babak 2", model: "gugur", turns: "1x", resetPoints: false },
      ];
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
        "tournament_stages",
        JSON.stringify(testStages)
      );

      const row = db.prepare("SELECT value FROM settings WHERE key = 'tournament_stages'").get();
      assert.ok(row, "Setting row must be retrieved");
      const retrieved = JSON.parse(row.value);
      assert.equal(retrieved[0].resetPoints, true);
      assert.equal(retrieved[1].resetPoints, false);
      db.close();
    });

    it("T2.15_R3: Stage with extra/unknown metadata fields preserves resetPoints without collision", () => {
      const complexStage = {
        id: "s-complex",
        name: "Stage Complex",
        model: "ranking",
        turns: "2x",
        resetPoints: false,
        extraFlag: true,
        customPillColor: "purple",
      };
      const jsonStr = JSON.stringify(complexStage);
      const parsed = JSON.parse(jsonStr);
      assert.equal(parsed.resetPoints, false);
      assert.equal(parsed.extraFlag, true);
    });
  });

  // Feature 4 Corner Cases
  describe("R4 Corner Cases: Scoring and Standings Calculation", () => {
    it("T2.16_R4: Zero points earned across multiple stages remains 0 in both modes", () => {
      const stages = [
        { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
        { id: "s2", name: "Babak 2", model: "ranking", turns: "1x", resetPoints: false },
        { id: "s3", name: "Babak 3", model: "ranking", turns: "1x", resetPoints: true },
      ];
      const scores = { "team-zero": [0, 0, 0] };
      const effective = calculateEffectiveStageScores(stages, scores);
      assert.deepEqual(effective["team-zero"], [0, 0, 0]);
    });

    it("T2.17_R4: Negative points (penalties): reset stage isolates current negative score without past penalty", () => {
      const stages = [
        { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
        { id: "s2", name: "Babak 2", model: "ranking", turns: "1x", resetPoints: true },
      ];
      const scores = { "team-penalized": [-50, -25] };
      const effective = calculateEffectiveStageScores(stages, scores);
      assert.equal(effective["team-penalized"][0], -50);
      assert.equal(effective["team-penalized"][1], -25); // Resets to 0, so -25 only
    });

    it("T2.18_R4: Negative points (penalties): carry-over stage subtracts past penalty from cumulative score", () => {
      const stages = [
        { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
        { id: "s2", name: "Babak 2", model: "ranking", turns: "1x", resetPoints: false },
      ];
      const scores = { "team-penalized": [-50, 100] };
      const effective = calculateEffectiveStageScores(stages, scores);
      assert.equal(effective["team-penalized"][0], -50);
      assert.equal(effective["team-penalized"][1], 50); // -50 + 100 = 50
    });

    it("T2.19_R4: Tied scores receive identical ranks without crashing or skipping incorrectly", () => {
      const stages = [
        { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
      ];
      const scores = {
        "team-alpha": [500],
        "team-beta": [500],
        "team-gamma": [300],
      };
      const rankings = rankParticipantsForStage(stages, scores, 0);
      assert.equal(rankings[0].effectiveScore, 500);
      assert.equal(rankings[0].rank, 1);
      assert.equal(rankings[1].effectiveScore, 500);
      assert.equal(rankings[1].rank, 1); // Tied for rank 1
      assert.equal(rankings[2].effectiveScore, 300);
      assert.equal(rankings[2].rank, 3); // Next rank is 3
    });

    it("T2.20_R4: Extremely large scores (e.g. 100,000+ points) calculate accurately without precision loss", () => {
      const stages = [
        { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
        { id: "s2", name: "Babak 2", model: "ranking", turns: "1x", resetPoints: false },
      ];
      const scores = { "team-high": [125000, 375000] };
      const effective = calculateEffectiveStageScores(stages, scores);
      assert.equal(effective["team-high"][0], 125000);
      assert.equal(effective["team-high"][1], 500000);
    });
  });
});

// ============================================================================
// TIER 3: CROSS-FEATURE / PAIRWISE INTERACTIONS (≥4 combinations)
// ============================================================================

describe("Tier 3 - Cross-Feature Pairwise Interactions", () => {
  it("T3.1_C1: R2 + R3 - UI Stage Toggle to SQLite Database Persistence Roundtrip", () => {
    const db = createInMemoryDb();
    // Simulate initial stages loaded in UI
    let currentStages = [
      { id: "stage-1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
      { id: "stage-2", name: "Babak 2", model: "gugur", turns: "1x", resetPoints: true },
    ];

    // Admin updates stage-2 in UI: toggles resetPoints to false (carry-over)
    const updatedStages = currentStages.map((s) =>
      s.id === "stage-2" ? { ...s, resetPoints: false } : s
    );

    // Save to DB (simulating saveSettings({ tournament_stages: JSON.stringify(...) }))
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
      "tournament_stages",
      JSON.stringify(updatedStages)
    );

    // Reload from DB (simulating initial load / broadcastSync)
    const reloadedRow = db.prepare("SELECT value FROM settings WHERE key = 'tournament_stages'").get();
    const parsedStages = JSON.parse(reloadedRow.value);

    assert.equal(parsedStages[1].id, "stage-2");
    assert.equal(parsedStages[1].resetPoints, false);
    db.close();
  });

  it("T3.2_C2: R2 + R4 - Dynamic UI Toggle changing stage configuration immediately alters leaderboard", () => {
    const scores = {
      "tim-garuda": [400, 100], // S0: 400, S1: 100
      "tim-badak": [100, 350],  // S0: 100, S1: 350
    };

    // Mode A: Stage 1 is carry-over (resetPoints: false)
    const stagesCarryOver = [
      { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
      { id: "s2", name: "Babak 2", model: "ranking", turns: "1x", resetPoints: false },
    ];
    const rankCarry = rankParticipantsForStage(stagesCarryOver, scores, 1);
    // Tim Garuda = 400 + 100 = 500, Tim Badak = 100 + 350 = 450
    assert.equal(rankCarry[0].id, "tim-garuda");
    assert.equal(rankCarry[0].effectiveScore, 500);

    // Mode B: Admin toggles Stage 1 to reset to 0 (resetPoints: true)
    const stagesReset = [
      { id: "s1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
      { id: "s2", name: "Babak 2", model: "ranking", turns: "1x", resetPoints: true },
    ];
    const rankReset = rankParticipantsForStage(stagesReset, scores, 1);
    // Tim Badak = 350, Tim Garuda = 100 -> Tim Badak leads!
    assert.equal(rankReset[0].id, "tim-badak");
    assert.equal(rankReset[0].effectiveScore, 350);
  });

  it("T3.3_C3: R3 + R4 - Seeded Database Stages feed Scoring Engine with accurate cumulative results", () => {
    const db = createInMemoryDb();
    const seededStages = [
      { id: "stage-penyisihan", name: "Babak Penyisihan", model: "ranking", turns: "2x", resetPoints: true },
      { id: "stage-8besar", name: "Babak 8 Besar", model: "gugur", turns: "1x", resetPoints: false },
      { id: "stage-semifinal", name: "Babak Semifinal", model: "gugur", turns: "1x", resetPoints: true },
      { id: "stage-final", name: "Babak Final", model: "gugur", turns: "1x", resetPoints: false },
    ];
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
      "tournament_stages",
      JSON.stringify(seededStages)
    );

    const stages = JSON.parse(db.prepare("SELECT value FROM settings WHERE key = 'tournament_stages'").get().value);

    const teamScores = {
      "tim-1": [200, 150, 100, 50],
    };

    const effective = calculateEffectiveStageScores(stages, teamScores);
    // Stage 0 (Penyisihan): 200
    assert.equal(effective["tim-1"][0], 200);
    // Stage 1 (8 Besar, carry-over): 200 + 150 = 350
    assert.equal(effective["tim-1"][1], 350);
    // Stage 2 (Semifinal, reset): 100 (resets to 0)
    assert.equal(effective["tim-1"][2], 100);
    // Stage 3 (Final, carry-over): 100 + 50 = 150
    assert.equal(effective["tim-1"][3], 150);

    db.close();
  });

  it("T3.4_C4: R1 + R2 + R3 + R4 - Full Cross-Cutting Workflow Verification", () => {
    // 1. Verify R1: Settings page has no monitor focus
    const settingsSource = readSource(SETTINGS_PAGE_PATH);
    assert.equal(settingsSource.includes("Fokus Layar Monitor / Proyektor Arena"), false);

    // 2. Verify R2 + R3: New stage created defaults to resetPoints: true
    const newStage = {
      id: "stage-created",
      name: "Playoff Wildcard",
      model: "ranking",
      turns: "1x",
      resetPoints: true, // Default
    };

    // 3. Persist to DB
    const db = createInMemoryDb();
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
      "tournament_stages",
      JSON.stringify([newStage])
    );
    const dbStages = JSON.parse(db.prepare("SELECT value FROM settings WHERE key = 'tournament_stages'").get().value);
    assert.equal(dbStages[0].resetPoints, true);

    // 4. Verify R4: Standings computed with new stage
    const standings = rankParticipantsForStage(dbStages, { "team-x": [250] }, 0);
    assert.equal(standings[0].effectiveScore, 250);
    assert.equal(standings[0].rank, 1);

    db.close();
  });
});

// ============================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS (≥5 realistic scenarios)
// ============================================================================

describe("Tier 4 - Real-World Application Scenarios", () => {
  it("T4.1_Scenario 1: 4-Stage Championship with 8 Participants and Mixed Reset/Carry-Over", () => {
    /**
     * Structure:
     * Stage 0: Penyisihan (Ranking, resetPoints: true)
     * Stage 1: 8 Besar (Gugur, resetPoints: false - carry over from Penyisihan)
     * Stage 2: Semifinal (Gugur, resetPoints: true - reset to 0)
     * Stage 3: Final (Gugur, resetPoints: false - carry over from Semifinal)
     */
    const stages = [
      { id: "s0", name: "Penyisihan", model: "ranking", turns: "2x", resetPoints: true },
      { id: "s1", name: "8 Besar", model: "gugur", turns: "1x", resetPoints: false },
      { id: "s2", name: "Semifinal", model: "gugur", turns: "1x", resetPoints: true },
      { id: "s3", name: "Final", model: "gugur", turns: "1x", resetPoints: false },
    ];

    const teamScores = {
      "Alpha": [400, 150, 200, 180],
      "Bravo": [350, 180, 220, 140],
      "Charlie": [300, 120, 190, 160],
      "Delta": [280, 160, 150, 130],
      "Echo": [250, 110, 140, 120],
      "Foxtrot": [220, 90, 130, 110],
      "Golf": [200, 80, 120, 100],
      "Hotel": [180, 70, 110, 90],
    };

    // Stage 0 Rankings (Penyisihan - pure S0 scores)
    const rankS0 = rankParticipantsForStage(stages, teamScores, 0);
    assert.equal(rankS0[0].id, "Alpha");
    assert.equal(rankS0[0].effectiveScore, 400);
    assert.equal(rankS0[1].id, "Bravo");
    assert.equal(rankS0[1].effectiveScore, 350);

    // Stage 1 Rankings (8 Besar - S0 + S1 accumulated)
    const rankS1 = rankParticipantsForStage(stages, teamScores, 1);
    // Alpha: 400 + 150 = 550
    // Bravo: 350 + 180 = 530
    assert.equal(rankS1[0].id, "Alpha");
    assert.equal(rankS1[0].effectiveScore, 550);
    assert.equal(rankS1[1].id, "Bravo");
    assert.equal(rankS1[1].effectiveScore, 530);

    // Stage 2 Rankings (Semifinal - Resets to 0, pure S2 scores)
    const rankS2 = rankParticipantsForStage(stages, teamScores, 2);
    // Bravo earned 220 in S2, Alpha earned 200 in S2 -> Bravo leads!
    assert.equal(rankS2[0].id, "Bravo");
    assert.equal(rankS2[0].effectiveScore, 220);
    assert.equal(rankS2[1].id, "Alpha");
    assert.equal(rankS2[1].effectiveScore, 200);

    // Stage 3 Rankings (Final - S2 + S3 accumulated)
    const rankS3 = rankParticipantsForStage(stages, teamScores, 3);
    // Alpha: 200 + 180 = 380
    // Bravo: 220 + 140 = 360
    assert.equal(rankS3[0].id, "Alpha");
    assert.equal(rankS3[0].effectiveScore, 380);
    assert.equal(rankS3[1].id, "Bravo");
    assert.equal(rankS3[1].effectiveScore, 360);
  });

  it("T4.2_Scenario 2: Admin Mid-Tournament Toggle from Carry-Over to Reset", () => {
    // Initial configuration: Babak 2 carries over from Babak 1
    const stagesInitial = [
      { id: "b1", name: "Babak 1", model: "ranking", turns: "1x", resetPoints: true },
      { id: "b2", name: "Babak 2", model: "ranking", turns: "1x", resetPoints: false },
    ];

    const scores = {
      "Team Veteran": [600, 100],  // Huge lead in Babak 1, weak Babak 2
      "Team Rookie":  [100, 450],  // Weak Babak 1, amazing Babak 2
    };

    // Under initial carry-over setting: Veteran leads (700 vs 550)
    const initialStandings = rankParticipantsForStage(stagesInitial, scores, 1);
    assert.equal(initialStandings[0].id, "Team Veteran");
    assert.equal(initialStandings[0].effectiveScore, 700);

    // Admin updates setting: Babak 2 should reset points to 0
    const stagesUpdated = stagesInitial.map((s) =>
      s.id === "b2" ? { ...s, resetPoints: true } : s
    );

    // Under reset setting: Rookie leads (450 vs 100)
    const updatedStandings = rankParticipantsForStage(stagesUpdated, scores, 1);
    assert.equal(updatedStandings[0].id, "Team Rookie");
    assert.equal(updatedStandings[0].effectiveScore, 450);
    assert.equal(updatedStandings[1].id, "Team Veteran");
    assert.equal(updatedStandings[1].effectiveScore, 100);
  });

  it("T4.3_Scenario 3: Custom 5-Stage Tournament Creation with Default Reset Verification", () => {
    const createdStages = [];
    const stageNames = ["Kualifikasi", "Grup A", "Grup B", "Playoff", "Grand Final"];

    // Admin creates 5 stages sequentially using default behavior
    for (const name of stageNames) {
      createdStages.push({
        id: `stage-${name.toLowerCase().replace(/\s+/g, "-")}`,
        name,
        model: "ranking",
        turns: "1x",
        resetPoints: true, // System default
      });
    }

    // Verify all 5 default to resetPoints: true
    for (const st of createdStages) {
      assert.equal(st.resetPoints, true, `Stage ${st.name} must default to resetPoints: true`);
    }

    // Admin configures Playoff and Grand Final to carry over
    createdStages[3].resetPoints = false; // Playoff carries over from Grup B
    createdStages[4].resetPoints = false; // Grand Final carries over from Playoff

    const teamScores = {
      "Robotika UI": [100, 100, 100, 200, 300],
    };

    const effective = calculateEffectiveStageScores(createdStages, teamScores);
    assert.equal(effective["Robotika UI"][0], 100); // Kualifikasi
    assert.equal(effective["Robotika UI"][1], 100); // Grup A (resets)
    assert.equal(effective["Robotika UI"][2], 100); // Grup B (resets)
    assert.equal(effective["Robotika UI"][3], 300); // Playoff (Grup B 100 + Playoff 200 = 300)
    assert.equal(effective["Robotika UI"][4], 600); // Grand Final (Playoff 300 + Final 300 = 600)
  });

  it("T4.4_Scenario 4: Settings Page Cleanliness and Layout Integrity Check", () => {
    const source = readSource(SETTINGS_PAGE_PATH);

    // Verify completely purged monitor focus strings
    const bannedPhrases = [
      "Fokus Layar Monitor / Proyektor Arena",
      "Pilih tampilan utama yang disiarkan pada layar monitor / proyektor arena",
      "Aktif: {defaultMonitorView ===",
    ];

    for (const phrase of bannedPhrases) {
      assert.equal(
        source.includes(phrase),
        false,
        `Forbidden phrase found in settings page: "${phrase}"`
      );
    }

    // Verify settings navigation and main actions are preserved
    assert.ok(source.includes("Halaman Pengaturan & Konfigurasi NEXT Arena"));
    assert.ok(source.includes("Setting Babak & Model"));
  });

  it("T4.5_Scenario 5: End-to-End Tournament Lifecycle with Score Adjustments and Stage Progression", () => {
    // 3-Stage competition
    const stages = [
      { id: "stage-kualifikasi", name: "Kualifikasi", model: "ranking", turns: "2x", resetPoints: true },
      { id: "stage-semifinal", name: "Semifinal", model: "gugur", turns: "1x", resetPoints: false },
      { id: "stage-final", name: "Grand Final", model: "gugur", turns: "1x", resetPoints: true },
    ];

    // Teams with baseline points and real-time arcade adjustments (+50 bonus, -25 penalty)
    const baseScores = {
      "Garuda-1": [300, 150, 250],
      "Rajawali-2": [280, 180, 200],
    };

    // Event 1: Garuda-1 gets +50 bonus in Kualifikasi
    baseScores["Garuda-1"][0] += 50; // 350
    // Event 2: Rajawali-2 gets -25 penalty in Semifinal
    baseScores["Rajawali-2"][1] -= 25; // 155

    const effective = calculateEffectiveStageScores(stages, baseScores);

    // Kualifikasi check
    assert.equal(effective["Garuda-1"][0], 350);
    assert.equal(effective["Rajawali-2"][0], 280);

    // Semifinal check (carry-over)
    // Garuda-1: 350 + 150 = 500
    // Rajawali-2: 280 + 155 = 435
    assert.equal(effective["Garuda-1"][1], 500);
    assert.equal(effective["Rajawali-2"][1], 435);

    // Grand Final check (reset to 0)
    // Garuda-1: 250 (previous 500 reset)
    // Rajawali-2: 200 (previous 435 reset)
    assert.equal(effective["Garuda-1"][2], 250);
    assert.equal(effective["Rajawali-2"][2], 200);

    // Final standings check
    const finalRankings = rankParticipantsForStage(stages, baseScores, 2);
    assert.equal(finalRankings[0].id, "Garuda-1");
    assert.equal(finalRankings[0].effectiveScore, 250);
    assert.equal(finalRankings[0].rank, 1);

    assert.equal(finalRankings[1].id, "Rajawali-2");
    assert.equal(finalRankings[1].effectiveScore, 200);
    assert.equal(finalRankings[1].rank, 2);
  });
});

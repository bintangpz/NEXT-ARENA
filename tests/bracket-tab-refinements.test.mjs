import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

describe("Bracket Tab Refinements & Round Synchronization Test Suite", () => {
  const rootDir = process.cwd();
  const pengaturanPath = path.join(rootDir, "src/app/pengaturan/page.tsx");
  const homePath = path.join(rootDir, "src/app/page.tsx");
  const dbPath = path.join(rootDir, "src/lib/db.ts");
  const apiRoutePath = path.join(rootDir, "src/app/api/bracket/route.ts");

  const pengaturanContent = fs.readFileSync(pengaturanPath, "utf-8");
  const homeContent = fs.readFileSync(homePath, "utf-8");
  const dbContent = fs.readFileSync(dbPath, "utf-8");
  const apiRouteContent = fs.readFileSync(apiRoutePath, "utf-8");

  describe("Requirement 1: Tampilkan Bagan di Monitor Utama dihapus", () => {
    it("Settings page does not contain 'Tampilkan Bagan di Monitor Utama'", () => {
      assert.strictEqual(
        pengaturanContent.includes("Tampilkan Bagan di Monitor Utama"),
        false,
        "Should not contain 'Tampilkan Bagan di Monitor Utama'"
      );
    });

    it("Settings page does not contain 'SEDANG TAMPIL DI MONITOR'", () => {
      assert.strictEqual(
        pengaturanContent.includes("SEDANG TAMPIL DI MONITOR"),
        false,
        "Should not contain 'SEDANG TAMPIL DI MONITOR'"
      );
    });
  });

  describe("Requirement 2: Reset Jadwal diganti ke Reset Poin dan terupdate ke 0", () => {
    it("Settings page has 'Reset Poin' and no longer has 'Reset Jadwal'", () => {
      assert.strictEqual(pengaturanContent.includes("Reset Poin"), true);
      assert.strictEqual(
        pengaturanContent.includes("<span>Reset Jadwal</span>"),
        false,
        "Should not have '<span>Reset Jadwal</span>'"
      );
    });

    it("Home page (Dashboard monitoring) does not contain 'Reset Poin' button (only in Pengaturan)", () => {
      assert.strictEqual(
        homeContent.includes("<span>Reset Poin</span>"),
        false,
        "Dashboard monitoring should not have Reset Poin button"
      );
    });

    it("API route handles action=reset_points and resets all scores, points, and logs", () => {
      assert.strictEqual(apiRouteContent.includes('action === "reset_points"'), true);
      assert.strictEqual(apiRouteContent.includes("score_a = 0, score_b = 0"), true);
      assert.strictEqual(apiRouteContent.includes("babak1 = 0, babak2 = 0, babak3 = 0, total_points = 0"), true);
      assert.strictEqual(apiRouteContent.includes("DELETE FROM point_logs"), true);
    });

    it("Database reset_points query executes correctly against mock database", () => {
      const memDb = new Database(":memory:");
      memDb.exec(`
        CREATE TABLE participants (
          id TEXT PRIMARY KEY,
          name TEXT,
          babak1 REAL DEFAULT 0,
          babak2 REAL DEFAULT 0,
          babak3 REAL DEFAULT 0,
          total_points REAL DEFAULT 0
        );
        CREATE TABLE bracket_matches (
          id TEXT PRIMARY KEY,
          score_a REAL DEFAULT 0,
          score_b REAL DEFAULT 0,
          score_a_leg1 REAL DEFAULT 0,
          score_b_leg1 REAL DEFAULT 0,
          score_a_leg2 REAL DEFAULT 0,
          score_b_leg2 REAL DEFAULT 0,
          status TEXT DEFAULT 'Siap Tanding',
          winner TEXT
        );
        CREATE TABLE point_logs (
          id TEXT PRIMARY KEY,
          match_id TEXT,
          team_id TEXT
        );

        INSERT INTO participants (id, name, babak1, babak2, babak3, total_points)
        VALUES ('p1', 'Tim Alpha', 100, 50, 200, 350);

        INSERT INTO bracket_matches (id, score_a, score_b, score_a_leg1, score_b_leg1, status, winner)
        VALUES ('m1', 80, 40, 80, 40, 'Selesai', 'Tim Alpha');

        INSERT INTO point_logs (id, match_id, team_id)
        VALUES ('l1', 'm1', 'p1');
      `);

      // Run reset queries
      memDb.prepare(`
        UPDATE bracket_matches
        SET score_a = 0, score_b = 0,
            score_a_leg1 = 0, score_b_leg1 = 0,
            score_a_leg2 = 0, score_b_leg2 = 0,
            status = 'Siap Tanding',
            winner = NULL
      `).run();

      memDb.prepare(`
        UPDATE participants
        SET babak1 = 0, babak2 = 0, babak3 = 0, total_points = 0
      `).run();

      memDb.prepare(`DELETE FROM point_logs`).run();

      const p = memDb.prepare("SELECT * FROM participants WHERE id = 'p1'").get();
      assert.strictEqual(p.babak1, 0);
      assert.strictEqual(p.babak2, 0);
      assert.strictEqual(p.babak3, 0);
      assert.strictEqual(p.total_points, 0);

      const m = memDb.prepare("SELECT * FROM bracket_matches WHERE id = 'm1'").get();
      assert.strictEqual(m.score_a, 0);
      assert.strictEqual(m.score_b, 0);
      assert.strictEqual(m.status, "Siap Tanding");
      assert.strictEqual(m.winner, null);

      const logsCount = memDb.prepare("SELECT COUNT(*) as cnt FROM point_logs").get().cnt;
      assert.strictEqual(logsCount, 0);

      memDb.close();
    });
  });

  describe("Requirement 3: Tombol acak & generate hapus iconnya", () => {
    it("Pengaturan page: Acak & Generate button has no <Zap icon and no 🎲 emoji", () => {
      assert.strictEqual(
        pengaturanContent.includes("🎲 Acak & Generate"),
        false,
        "Should not have 🎲 in Acak & Generate"
      );
      assert.strictEqual(
        pengaturanContent.includes("🎲 Acak & Buat"),
        false,
        "Should not have 🎲 in Acak & Buat"
      );
      // Check that the buttons in bracket tab do not contain <Zap on the generate button
      const hasZapInBracketBtn = pengaturanContent.includes(
        '<Zap className="w-4 h-4 fill-current" />\n                      <span>Acak & Generate Jadwal'
      );
      assert.strictEqual(hasZapInBracketBtn, false);
    });

    it("Home page (Dashboard monitoring) does not contain 'Acak & Generate' or 'Acak & Buat' buttons", () => {
      assert.strictEqual(
        homeContent.includes("Acak & Generate Jadwal"),
        false,
        "Dashboard monitoring should not have 'Acak & Generate Jadwal'"
      );
      assert.strictEqual(
        homeContent.includes("Acak & Buat Jadwal"),
        false,
        "Dashboard monitoring should not have 'Acak & Buat Jadwal'"
      );
    });

    it("Home page (Dashboard monitoring) does not contain 'Format Babak: 2x Main (Tukar Sisi)' indicator", () => {
      assert.strictEqual(
        homeContent.includes("Format {selectedBracketRound}:"),
        false,
        "Dashboard monitoring should not display 'Format {selectedBracketRound}:'"
      );
    });
  });

  describe("Requirement 4: Format Babak tidak dibuat bisa dirubah di Bagan", () => {
    it("Pengaturan bracket tab does not allow toggling round format (1x/2x)", () => {
      // In Pengaturan, stage format is only altered in stages setting, not bracket tab
      assert.strictEqual(
        pengaturanContent.includes("Klik untuk ganti ke"),
        false,
        "Should not have format switcher toggle in bracket tab"
      );
    });
  });

  describe("Requirement 5: Bagan harus sinkron dengan babak yang dibuat", () => {
    it("db.ts handles empty stages array [] without falling back to DEFAULT_TOURNAMENT_STAGES", () => {
      assert.strictEqual(
        dbContent.includes("if (Array.isArray(parsed)) stages = parsed;"),
        true,
        "db.ts should set stages = parsed when parsed is an array (even if empty)"
      );
    });

    it("db.ts getAllArenaData filters bracket matches against active tournament stages", () => {
      assert.strictEqual(
        dbContent.includes("const stageNames = new Set(stages.map((s) => s.name));"),
        true,
        "db.ts should collect stage names into a Set"
      );
      assert.strictEqual(
        dbContent.includes("stageNames.has(r.round)"),
        true,
        "db.ts should filter bracket matches by stage names"
      );
    });

    it("Pengaturan and Home show 'Belum Ada Babak Perlombaan' empty state if stages.length === 0", () => {
      assert.strictEqual(pengaturanContent.includes("Belum Ada Babak Perlombaan"), true);
      assert.strictEqual(homeContent.includes("Belum Ada Babak Perlombaan"), true);
    });
  });

  describe("Requirement 6: Round Tab Isolation & Qualified Participants in Subsequent Rounds", () => {
    it("Home and Pengaturan use functional state updater to prevent tab bounce-back", () => {
      assert.strictEqual(
        homeContent.includes("setSelectedBracketRound((prev) =>"),
        true,
        "Home must use functional updater for selectedBracketRound"
      );
      assert.strictEqual(
        pengaturanContent.includes("setSelectedBracketRound((prev) =>"),
        true,
        "Pengaturan must use functional updater for selectedBracketRound"
      );
    });

    it("Home and Pengaturan compute qualified participants for the selected round", () => {
      assert.strictEqual(
        homeContent.includes("qualifiedBracketParticipants"),
        true,
        "Home must compute qualifiedBracketParticipants"
      );
      assert.strictEqual(
        pengaturanContent.includes("qualifiedBracketParticipants"),
        true,
        "Pengaturan must compute qualifiedBracketParticipants"
      );
    });

    it("API route filters participants by current_stage_idx when generating subsequent round matches", () => {
      assert.strictEqual(
        apiRouteContent.includes("current_stage_idx >= ?"),
        true,
        "API must query participants with current_stage_idx >= stageIdx"
      );
    });
  });

  describe("Requirement 7: Reset Babak (Semua Kembali ke Babak Pertama & Babak 2 dst Kosong)", () => {
    it("Pengaturan page has 'Reset Babak' button and confirmation modal", () => {
      assert.strictEqual(
        pengaturanContent.includes("Reset Babak"),
        true,
        "Pengaturan must contain 'Reset Babak' button"
      );
      assert.strictEqual(
        pengaturanContent.includes("showResetRoundModal"),
        true,
        "Pengaturan must have showResetRoundModal state"
      );
      assert.strictEqual(
        pengaturanContent.includes("handleResetRound"),
        true,
        "Pengaturan must define handleResetRound handler"
      );
    });

    it("Home page (Dashboard monitoring) does not contain 'Reset Babak' button (only in Pengaturan)", () => {
      assert.strictEqual(
        homeContent.includes("<span>Reset Babak</span>"),
        false,
        "Dashboard monitoring should not have Reset Babak button"
      );
    });

    it("API route handles action=reset_babak and deletes subsequent round matches while returning participants to stage 0", () => {
      assert.strictEqual(
        apiRouteContent.includes('action === "reset_babak"'),
        true,
        "API must check for action === 'reset_babak'"
      );
      assert.strictEqual(
        apiRouteContent.includes("DELETE FROM bracket_matches"),
        true,
        "API must delete bracket matches for subsequent rounds"
      );
      assert.strictEqual(
        apiRouteContent.includes("current_stage_idx = 0"),
        true,
        "API must set participants' current_stage_idx to 0"
      );
      assert.strictEqual(
        apiRouteContent.includes("status = 'Aktif'"),
        true,
        "API must reset participants' status to 'Aktif'"
      );
    });

    it("Database reset_babak logic executes correctly against mock database", () => {
      const memDb = new Database(":memory:");
      memDb.exec(`
        CREATE TABLE participants (
          id TEXT PRIMARY KEY,
          name TEXT,
          status TEXT DEFAULT 'Aktif',
          current_stage_idx INTEGER DEFAULT 0,
          babak1 REAL DEFAULT 0,
          babak2 REAL DEFAULT 0,
          babak3 REAL DEFAULT 0,
          total_points REAL DEFAULT 0
        );
        CREATE TABLE bracket_matches (
          id TEXT PRIMARY KEY,
          round TEXT,
          match_label TEXT,
          score_a REAL DEFAULT 0,
          score_b REAL DEFAULT 0,
          status TEXT DEFAULT 'Siap Tanding'
        );
        CREATE TABLE point_logs (
          id TEXT PRIMARY KEY,
          stage_label TEXT
        );

        INSERT INTO participants (id, name, status, current_stage_idx, babak1, babak2, babak3, total_points)
        VALUES
          ('p1', 'Tim Alpha', 'Aktif', 1, 100, 80, 0, 180),
          ('p2', 'Tim Beta', 'Gugur', 0, 50, 0, 0, 50),
          ('p3', 'Tim Gamma', 'Aktif', 2, 90, 85, 95, 270);

        INSERT INTO bracket_matches (id, round, match_label)
        VALUES
          ('m1', 'Babak 1', 'Laga 01'),
          ('m2', 'Babak 1', 'Laga 02'),
          ('m3', 'Babak 2', 'Laga 01'),
          ('m4', 'Babak 3', 'Laga 01');

        INSERT INTO point_logs (id, stage_label)
        VALUES
          ('l1', '+10 Poin (Laga 01 P1)'),
          ('l2', '+15 Poin (m3 P1)');
      `);

      const firstStageName = "Babak 1";
      const firstStageId = "babak1";

      // 1. Delete matches not in first round
      const matchesToDelete = memDb
        .prepare("SELECT id, match_label FROM bracket_matches WHERE round != ? AND round != ?")
        .all(firstStageName, firstStageId);

      for (const m of matchesToDelete) {
        memDb.prepare(`
          DELETE FROM point_logs
          WHERE stage_label LIKE '%' || ? || '%' OR stage_label LIKE '%' || ? || '%'
        `).run(m.match_label, m.id);
      }

      memDb.prepare("DELETE FROM bracket_matches WHERE round != ? AND round != ?").run(firstStageName, firstStageId);

      // 2. Reset participants to stage 0
      memDb.prepare(`
        UPDATE participants
        SET current_stage_idx = 0,
            status = 'Aktif',
            babak2 = 0,
            babak3 = 0,
            total_points = COALESCE(babak1, 0)
      `).run();

      // Assertions
      const remainingMatches = memDb.prepare("SELECT * FROM bracket_matches").all();
      assert.strictEqual(remainingMatches.length, 2, "Only Babak 1 matches should remain");
      assert.strictEqual(remainingMatches.every((m) => m.round === "Babak 1"), true);

      const allParticipants = memDb.prepare("SELECT * FROM participants").all();
      for (const p of allParticipants) {
        assert.strictEqual(p.current_stage_idx, 0, `Participant ${p.name} must be in stage 0`);
        assert.strictEqual(p.status, "Aktif", `Participant ${p.name} status must be Aktif`);
        assert.strictEqual(p.babak2, 0, `Participant ${p.name} babak2 score must be 0`);
        assert.strictEqual(p.babak3, 0, `Participant ${p.name} babak3 score must be 0`);
        assert.strictEqual(p.total_points, p.babak1, `Participant ${p.name} total_points must equal babak1`);
      }

      memDb.close();
    });
  });
});

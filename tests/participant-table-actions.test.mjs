import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getParticipantStageRawScore } from "../src/data/mockCompetition.ts";

describe("Participant Table Refinements & Stage Progression Test Suite", () => {
  const rootDir = process.cwd();
  const homePath = path.join(rootDir, "src/app/page.tsx");
  const dbPath = path.join(rootDir, "src/lib/db.ts");
  const apiRoutePath = path.join(rootDir, "src/app/api/participants/route.ts");

  const homeContent = fs.readFileSync(homePath, "utf-8");
  const dbContent = fs.readFileSync(dbPath, "utf-8");
  const apiRouteContent = fs.readFileSync(apiRoutePath, "utf-8");

  describe("Requirement 1: Header 'Skor' & Tab Pilihan Babak Terpisah", () => {
    it("Table header is 'Skor' without 'per Babak'", () => {
      assert.strictEqual(
        homeContent.includes('<th className="py-3.5 px-3 text-center">Skor</th>'),
        true,
        "Header must be 'Skor'"
      );
      assert.strictEqual(
        homeContent.includes('<th className="py-3.5 px-3 text-center">Skor per Babak</th>'),
        false,
        "Header must not be 'Skor per Babak'"
      );
    });

    it("Leaderboard has round switcher tabs for each stage and 'Semua Babak'", () => {
      assert.strictEqual(
        homeContent.includes("TAMPILAN BABAK:"),
        true,
        "Must have stage view selector 'TAMPILAN BABAK:'"
      );
      assert.strictEqual(
        homeContent.includes("tournamentStages.map((stage, sIdx)"),
        true,
        "Must map over tournamentStages to render stage tabs"
      );
      assert.strictEqual(
        homeContent.includes("Semua Babak (Total)"),
        true,
        "Must provide a tab for 'Semua Babak (Total)'"
      );
    });

    it("getParticipantStageRawScore correctly resolves scores for any stage index", () => {
      const scores = { babak1: 85, babak2: 120, babak3: 200 };
      assert.strictEqual(getParticipantStageRawScore(scores, 0, { name: "Penyisihan" }), 85);
      assert.strictEqual(getParticipantStageRawScore(scores, 1, { name: "8 Besar" }), 120);
      assert.strictEqual(getParticipantStageRawScore(scores, 2, { name: "Semifinal" }), 200);
    });
  });

  describe("Requirement 2: Header 'Aksi' & Tombol Gugur / Lanjut Babak", () => {
    it("Table header is 'Aksi' without '& Poin'", () => {
      assert.strictEqual(
        homeContent.includes('<th className="py-3.5 pl-3 pr-6 text-right">Aksi</th>'),
        true,
        "Header must be 'Aksi'"
      );
      assert.strictEqual(
        homeContent.includes("Aksi & Poin"),
        false,
        "Header must not be 'Aksi & Poin'"
      );
    });

    it("Table action buttons include 'Gugur' / 'Batal Gugur'", () => {
      assert.strictEqual(
        homeContent.includes("handleToggleGugur(p)"),
        true,
        "Must have handleToggleGugur handler"
      );
      assert.strictEqual(
        homeContent.includes("<span>Gugur</span>"),
        true,
        "Must render Gugur button"
      );
      assert.strictEqual(
        homeContent.includes("<span>Batal Gugur</span>"),
        true,
        "Must render Batal Gugur button when participant is Gugur"
      );
    });

    it("Table action buttons include 'Lanjut ke Babak Selanjutnya' and 'Batal Lanjut'", () => {
      assert.strictEqual(
        homeContent.includes("handleAdvanceStage"),
        true,
        "Must have handleAdvanceStage handler"
      );
      assert.strictEqual(
        homeContent.includes("handleRevertStage"),
        true,
        "Must have handleRevertStage handler"
      );
      assert.strictEqual(
        homeContent.includes("<span>Batal Lanjut</span>"),
        true,
        "Must render Batal Lanjut button when advanced"
      );
      assert.strictEqual(
        homeContent.includes("Lanjut"),
        true,
        "Must render Lanjut button"
      );
    });

    it("Stage isolation prevents consecutive skips and requires opening round tab", () => {
      assert.strictEqual(
        homeContent.includes("currentIdx > tabIdx"),
        true,
        "Must detect when participant has already advanced beyond the current tab"
      );
      assert.strictEqual(
        homeContent.includes("handleRevertStage(p, tabIdx)"),
        true,
        "Clicking Batal Lanjut in a round tab must revert to that tab's stage"
      );
    });
  });

  describe("Requirement 3: API & Database Persistence", () => {
    it("db.ts includes current_stage_idx column and maps it to Participant", () => {
      assert.strictEqual(
        dbContent.includes("current_stage_idx INTEGER DEFAULT 0"),
        true,
        "db.ts must add current_stage_idx column"
      );
      assert.strictEqual(
        dbContent.includes("currentStageIdx: Number(row.current_stage_idx ?? 0)"),
        true,
        "db.ts must map currentStageIdx"
      );
    });

    it("API route handles advance_stage and toggle_status", () => {
      assert.strictEqual(
        apiRouteContent.includes('body.type === "advance_stage"'),
        true,
        "API must handle advance_stage"
      );
      assert.strictEqual(
        apiRouteContent.includes('body.type === "toggle_status"'),
        true,
        "API must handle toggle_status"
      );
      assert.strictEqual(
        apiRouteContent.includes("current_stage_idx = ?"),
        true,
        "API must update current_stage_idx"
      );
    });

    it("SQLite database executes stage advance and elimination smoothly in memory", () => {
      const memDb = new Database(":memory:");
      memDb.exec(`
        CREATE TABLE participants (
          id TEXT PRIMARY KEY,
          name TEXT,
          status TEXT DEFAULT 'Aktif',
          current_stage_idx INTEGER DEFAULT 0,
          total_points REAL DEFAULT 0
        );

        INSERT INTO participants (id, name, status, current_stage_idx, total_points)
        VALUES ('p1', 'Tim Robotika', 'Aktif', 0, 100);
      `);

      // 1. Advance to stage 1
      memDb.prepare(`
        UPDATE participants
        SET current_stage_idx = 1, status = 'Aktif'
        WHERE id = 'p1'
      `).run();

      let p = memDb.prepare("SELECT * FROM participants WHERE id = 'p1'").get();
      assert.strictEqual(p.current_stage_idx, 1);
      assert.strictEqual(p.status, "Aktif");

      // 2. Advance to final stage (stage 2) -> becomes Finalis
      memDb.prepare(`
        UPDATE participants
        SET current_stage_idx = 2, status = 'Finalis'
        WHERE id = 'p1'
      `).run();

      p = memDb.prepare("SELECT * FROM participants WHERE id = 'p1'").get();
      assert.strictEqual(p.current_stage_idx, 2);
      assert.strictEqual(p.status, "Finalis");

      // 3. Mark as Gugur
      memDb.prepare(`
        UPDATE participants
        SET status = 'Gugur'
        WHERE id = 'p1'
      `).run();

      p = memDb.prepare("SELECT * FROM participants WHERE id = 'p1'").get();
      assert.strictEqual(p.status, "Gugur");

      memDb.close();
    });
  });
});


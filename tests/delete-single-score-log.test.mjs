import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const tandingPath = path.join(rootDir, "src/app/tanding/[id]/page.tsx");
const pagePath = path.join(rootDir, "src/app/page.tsx");
const bracketApiPath = path.join(rootDir, "src/app/api/bracket/route.ts");
const participantsApiPath = path.join(rootDir, "src/app/api/participants/route.ts");

const tandingContent = fs.readFileSync(tandingPath, "utf8");
const pageContent = fs.readFileSync(pagePath, "utf8");
const bracketApiContent = fs.readFileSync(bracketApiPath, "utf8");
const participantsApiContent = fs.readFileSync(participantsApiPath, "utf8");

test("Delete Individual Score Log Feature", async (t) => {
  await t.test("Tanding match page renders delete icon button per score log and handles cleanup + score revert", () => {
    assert.ok(tandingContent.includes("handleDeleteScoreLog"), "Missing handleDeleteScoreLog handler in tanding page");
    assert.ok(tandingContent.includes("renderHistoryDeltaAndDelete"), "Missing renderHistoryDeltaAndDelete helper in tanding page");
    assert.ok(tandingContent.includes("item.corner !== \"system\""), "Should exclude system logs from individual delete button");
    assert.ok(tandingContent.includes("Hapus log poin ini & koreksi skor"), "Missing accessible delete log button title");
    assert.ok(
      tandingContent.includes("logId: encodeURIComponent(item.id)") || tandingContent.includes("logId=${encodeURIComponent(item.id)}"),
      "Tanding delete handler must pass logId to DELETE /api/bracket"
    );
    assert.ok(
      tandingContent.includes("logId,") && tandingContent.includes("logId: surrenderLogId"),
      "Tanding quick_adjust calls must send logId so client IDs match SQLite point_logs IDs"
    );
  });

  await t.test("Dashboard match log modal renders delete icon button per score log", () => {
    assert.ok(pageContent.includes("handleDeleteSingleLog"), "Missing handleDeleteSingleLog handler in dashboard");
    assert.ok(pageContent.includes("renderSingleLogAction"), "Missing renderSingleLogAction helper in dashboard");
    assert.ok(
      pageContent.includes("logId=${encodeURIComponent(logId)}"),
      "Dashboard delete handler must pass logId to DELETE /api/bracket"
    );
  });

  await t.test("Dashboard match log modal only has Sesi 1 & Sesi 2 tabs (no duplicate Putaran/Gabungan switcher) and shows Red/Blue split per session", () => {
    assert.ok(!pageContent.includes("Dua Sesi Terpisah"), "Dua Sesi Terpisah tab must be removed");
    assert.ok(!pageContent.includes("Semua ({matchLogs.length})"), "Semua tab must be removed");
    assert.ok(!pageContent.includes("setLogBreakdownLeg"), "Duplicate breakdown leg switcher must be removed");
    assert.ok(pageContent.includes("Total Point Sesi 1"), "Must show Total Point Sesi 1 below Retry");
    assert.ok(pageContent.includes("Total Point Sesi 2"), "Must show Total Point Sesi 2 below Retry");
    assert.ok(pageContent.includes("🔴 SUDUT MERAH"), "Must display Red corner column");
    assert.ok(pageContent.includes("🔵 SUDUT BIRU"), "Must display Blue corner column");
  });

  await t.test("Bracket & Participants APIs support logId persistence and atomic score subtraction on DELETE", () => {
    assert.ok(
      participantsApiContent.includes('typeof body.logId === "string"'),
      "Participants API quick_adjust must honor client-provided logId"
    );
    assert.ok(
      bracketApiContent.includes('const logId = url.searchParams.get("logId")'),
      "Bracket DELETE route must read logId query param"
    );
    assert.ok(
      bracketApiContent.includes("if (matchId && logId)"),
      "Bracket DELETE route must handle single log deletion when both matchId and logId are supplied"
    );
    assert.ok(
      bracketApiContent.includes("DELETE FROM point_logs WHERE id = ?"),
      "Bracket DELETE route must delete only the targeted point_logs row"
    );
    assert.ok(
      bracketApiContent.includes("nextLeg1A - delta") && bracketApiContent.includes("nextScoreA - delta"),
      "Bracket DELETE route must subtract deleted log delta from 2x legs and 1x scores"
    );
  });
});

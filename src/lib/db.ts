import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import {
  CATEGORIES as DEFAULT_CATEGORIES,
  INITIAL_BRACKET_MATCHES,
  INITIAL_LOGS,
  INITIAL_PARTICIPANTS,
  Participant,
  BracketMatch,
  PointLog,
  CustomPointRule,
  DEFAULT_POINT_RULES,
  TournamentStage,
  DEFAULT_TOURNAMENT_STAGES,
  isStageResetPoints,
  resolveStageIndex,
  calculateParticipantScoreInStage,
} from "@/data/mockCompetition";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (err) {
    console.error("[NextArena DB] Gagal membuat direktori data:", err);
  }
}

const dbPath = path.join(dbDir, "next_arena.db");

// Singleton connection on globalThis to prevent multiple native C++ connections
// during Next.js dev hot-reloads (which causes STATUS_ACCESS_VIOLATION / segfault crashes on Windows)
declare global {
  var _nextArenaDb: Database.Database | undefined;
  var _nextArenaDbInitialized: boolean | undefined;
}

function getDatabase(): Database.Database {
  if (globalThis._nextArenaDb) {
    return globalThis._nextArenaDb;
  }

  const database = new Database(dbPath, {
    timeout: 10000, // Tunggu hingga 10 detik jika file sedang terkunci di Windows
  });

  // Enable WAL mode with graceful fallback to DELETE mode if file mapping is blocked
  try {
    database.pragma("journal_mode = WAL");
  } catch (err) {
    console.warn("[NextArena DB] WAL mode tidak dapat diaktifkan, beralih ke DELETE mode:", err);
    try {
      database.pragma("journal_mode = DELETE");
    } catch {}
  }

  try {
    database.pragma("busy_timeout = 10000");
    database.pragma("synchronous = NORMAL");
  } catch {}

  globalThis._nextArenaDb = database;
  return database;
}

const db = getDatabase();

export function initDatabase() {
  if (globalThis._nextArenaDbInitialized) {
    return;
  }
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      institution TEXT NOT NULL,
      city TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      current_stage_idx INTEGER DEFAULT 0,
      babak1 INTEGER DEFAULT 0,
      babak2 INTEGER DEFAULT 0,
      babak3 INTEGER DEFAULT 0,
      criteria_teknis INTEGER DEFAULT 200,
      criteria_inovasi INTEGER DEFAULT 200,
      criteria_kecepatan INTEGER DEFAULT 200,
      criteria_presentasi INTEGER DEFAULT 200,
      members_json TEXT NOT NULL,
      total_points INTEGER NOT NULL,
      previous_rank INTEGER DEFAULT 1,
      last_updated TEXT NOT NULL,
      avatar_color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS point_logs (
      id TEXT PRIMARY KEY,
      participant_id TEXT,
      participant_name TEXT NOT NULL,
      category TEXT NOT NULL,
      delta INTEGER NOT NULL,
      stage_label TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bracket_matches (
      id TEXT PRIMARY KEY,
      round TEXT NOT NULL,
      match_label TEXT NOT NULL,
      category TEXT NOT NULL,
      team_a TEXT NOT NULL,
      team_a_code TEXT NOT NULL,
      score_a REAL DEFAULT 0,
      team_b TEXT NOT NULL,
      team_b_code TEXT NOT NULL,
      score_b REAL DEFAULT 0,
      status TEXT NOT NULL,
      winner TEXT,
      current_leg INTEGER DEFAULT 1,
      score_a_leg1 REAL DEFAULT 0,
      score_b_leg1 REAL DEFAULT 0,
      score_a_leg2 REAL DEFAULT 0,
      score_b_leg2 REAL DEFAULT 0
    );
  `);

  try {
    db.exec(`
      ALTER TABLE bracket_matches ADD COLUMN current_leg INTEGER DEFAULT 1;
      ALTER TABLE bracket_matches ADD COLUMN score_a_leg1 REAL DEFAULT 0;
      ALTER TABLE bracket_matches ADD COLUMN score_b_leg1 REAL DEFAULT 0;
      ALTER TABLE bracket_matches ADD COLUMN score_a_leg2 REAL DEFAULT 0;
      ALTER TABLE bracket_matches ADD COLUMN score_b_leg2 REAL DEFAULT 0;
    `);
  } catch {
    // columns exist
  }

  try {
    db.prepare("ALTER TABLE participants ADD COLUMN current_stage_idx INTEGER DEFAULT 0").run();
  } catch {
    // column exists
  }

  // Seed default categories if empty
  const categoryCount = (db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number }).count;
  if (categoryCount === 0) {
    const insertCat = db.prepare("INSERT INTO categories (name) VALUES (?)");
    for (const cat of DEFAULT_CATEGORIES) {
      insertCat.run(cat);
    }
  }

  // Seed default settings if empty
  const defaultAnnouncement = (db.prepare("SELECT value FROM settings WHERE key = 'announcement'").get() as { value: string } | undefined);
  if (!defaultAnnouncement) {
    const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    insertSetting.run("announcement", "🔥 LIVE ARENA: Babak 3 Grand Final sedang berlangsung! Selamat bertanding seluruh tim finalis.");
    insertSetting.run("round_title", "BABAK 3 • GRAND FINAL");
    insertSetting.run("stage_model", "klasemen");
    insertSetting.run("default_monitor_view", "leaderboard");
    insertSetting.run("timer_mode", "stopwatch");
    insertSetting.run("timer_phase", "idle");
    insertSetting.run("prep_duration", "60");
    insertSetting.run("match_limit", "300");
    insertSetting.run("timer_seconds", "0");
    insertSetting.run("timer_started_at", "0");
    insertSetting.run("timer_base_seconds", "0");
    insertSetting.run("timer_running", "false");
    insertSetting.run("active_round", "babak1");
    insertSetting.run("show_timer_on_monitor", "true");
    insertSetting.run("point_bonus", "50");
    insertSetting.run("point_penalty", "25");
    insertSetting.run("point_flag", "100");
    insertSetting.run("max_criteria", "250");
    insertSetting.run("custom_point_rules", JSON.stringify(DEFAULT_POINT_RULES));
    insertSetting.run(
      "tournament_stages",
      JSON.stringify([
        { id: "stage-penyisihan", name: "Babak Penyisihan", model: "ranking", turns: "2x", resetPoints: true },
        { id: "stage-8besar", name: "Babak 8 Besar", model: "gugur", turns: "1x", resetPoints: true },
        { id: "stage-semifinal", name: "Babak Semifinal", model: "gugur", turns: "1x", resetPoints: true },
        { id: "stage-final", name: "Babak Final", model: "gugur", turns: "1x", resetPoints: true },
      ])
    );
  } else {
    // Ensure new timer & stage settings exist for existing database
    const ensureSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
    ensureSetting.run("timer_mode", "stopwatch");
    ensureSetting.run("timer_phase", "idle");
    ensureSetting.run("timer_started_at", "0");
    ensureSetting.run("timer_base_seconds", "0");
    ensureSetting.run("active_round", "babak1");
    ensureSetting.run("prep_duration", "60");
    ensureSetting.run("match_limit", "300");
    ensureSetting.run("default_monitor_view", "leaderboard");
    ensureSetting.run("stage_model", "klasemen");
    ensureSetting.run("sound_prep_url", "");
    ensureSetting.run("sound_prep_name", "");
    ensureSetting.run("sound_countdown_url", "");
    ensureSetting.run("sound_countdown_name", "");
    ensureSetting.run("sound_start_url", "");
    ensureSetting.run("sound_start_name", "");
    ensureSetting.run("sound_finish_url", "");
    ensureSetting.run("sound_finish_name", "");
    ensureSetting.run("sound_volume", "0.8");
    ensureSetting.run("sound_enabled", "true");
    ensureSetting.run("sound_prep_loop", "true");
    ensureSetting.run("sound_countdown_loop", "false");
    ensureSetting.run("sound_start_loop", "false");
    ensureSetting.run("sound_finish_loop", "false");
    ensureSetting.run("custom_point_rules", JSON.stringify(DEFAULT_POINT_RULES));
    ensureSetting.run(
      "tournament_stages",
      JSON.stringify([
        { id: "stage-penyisihan", name: "Babak Penyisihan", model: "ranking", turns: "2x", resetPoints: true },
        { id: "stage-8besar", name: "Babak 8 Besar", model: "gugur", turns: "1x", resetPoints: true },
        { id: "stage-semifinal", name: "Babak Semifinal", model: "gugur", turns: "1x", resetPoints: true },
        { id: "stage-final", name: "Babak Final", model: "gugur", turns: "1x", resetPoints: true },
      ])
    );
  }

  // Check if database has been seeded once
  const seededOnce = (db.prepare("SELECT value FROM settings WHERE key = 'seeded_once'").get() as { value: string } | undefined)?.value === "true";
  if (!seededOnce) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('seeded_once', 'true')").run();
  }

  // Auto-heal participants that have an invalid/deleted category
  try {
    db.prepare(`
      UPDATE participants 
      SET category = (SELECT name FROM categories ORDER BY id ASC LIMIT 1) 
      WHERE category NOT IN (SELECT name FROM categories)
    `).run();
  } catch (e) {}

  globalThis._nextArenaDbInitialized = true;
}

// Ensure DB is initialized safely
try {
  initDatabase();
} catch (err) {
  console.error("[NextArena DB Init Error]:", err);
}

export function getAllArenaData() {
  const categoriesRows = db.prepare("SELECT name FROM categories ORDER BY id ASC").all() as { name: string }[];
  const categories = categoriesRows.map((r) => r.name);

  const settingsRows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  settingsRows.forEach((r) => {
    settings[r.key] = r.value;
  });

  const announcement = settings.announcement || "NEXT ARENA LIVE MONITOR";

  const stagesSetting = settings.tournament_stages;
  let stages: TournamentStage[] = DEFAULT_TOURNAMENT_STAGES;
  if (stagesSetting !== undefined && stagesSetting !== null) {
    try {
      const parsed = typeof stagesSetting === "string" ? JSON.parse(stagesSetting) : stagesSetting;
      if (Array.isArray(parsed)) stages = parsed;
    } catch {}
  }
  const activeRound = settings.active_round || "babak1";
  const activeStageIdx = resolveStageIndex(activeRound, stages);

  const participantsRows = db.prepare("SELECT * FROM participants").all() as any[];
  const mappedParticipants: Participant[] = participantsRows.map((row) => {
    const rawScores = {
      babak1: row.babak1,
      babak2: row.babak2,
      babak3: row.babak3,
    };
    const effectiveTotal = calculateParticipantScoreInStage(rawScores, activeStageIdx, stages);
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      institution: row.institution,
      city: row.city,
      category: row.category,
      status: row.status,
      currentStageIdx: Number(row.current_stage_idx ?? 0),
      scores: rawScores,
      criteria: {
        teknis: row.criteria_teknis,
        inovasi: row.criteria_inovasi,
        kecepatan: row.criteria_kecepatan,
        presentasi: row.criteria_presentasi,
      },
      members: JSON.parse(row.members_json || "[]"),
      totalPoints: effectiveTotal,
      previousRank: row.previous_rank,
      lastUpdated: row.last_updated,
      avatarColor: row.avatar_color,
    };
  });

  mappedParticipants.sort((a, b) => b.totalPoints - a.totalPoints);
  const participants: Participant[] = mappedParticipants;

  const logsRows = db.prepare("SELECT * FROM point_logs ORDER BY rowid DESC LIMIT 30").all() as any[];
  const pointLogs: PointLog[] = logsRows.map((r) => ({
    id: r.id,
    participantId: r.participant_id,
    participantName: r.participant_name,
    category: r.category,
    delta: r.delta,
    stageLabel: r.stage_label,
    timestamp: r.timestamp,
  }));

  const bracketRows = db.prepare("SELECT * FROM bracket_matches ORDER BY rowid ASC").all() as any[];
  const stageNames = new Set(stages.map((s) => s.name));
  const validBracketRows = bracketRows.filter((r) => stageNames.has(r.round));

  // Bersihkan laga yatim piatu di database yang babaknya sudah dihapus
  if (stages.length === 0) {
    if (bracketRows.length > 0) {
      db.prepare("DELETE FROM bracket_matches").run();
    }
  } else if (validBracketRows.length < bracketRows.length) {
    const placeholders = Array.from(stageNames).map(() => "?").join(",");
    db.prepare(`DELETE FROM bracket_matches WHERE round NOT IN (${placeholders})`).run(...Array.from(stageNames));
  }

  const bracketMatches: BracketMatch[] = validBracketRows.map((r) => ({
    id: r.id,
    round: r.round,
    matchLabel: r.match_label,
    category: r.category,
    teamA: r.team_a,
    teamACode: r.team_a_code,
    scoreA: Number(r.score_a || 0),
    teamB: r.team_b,
    teamBCode: r.team_b_code,
    scoreB: Number(r.score_b || 0),
    status: r.status,
    winner: r.winner,
    currentLeg: r.current_leg ?? 1,
    scoreALeg1: Number(r.score_a_leg1 || 0),
    scoreBLeg1: Number(r.score_b_leg1 || 0),
    scoreALeg2: Number(r.score_a_leg2 || 0),
    scoreBLeg2: Number(r.score_b_leg2 || 0),
  }));

  return {
    database: "SQLite (data/next_arena.db)",
    categories,
    settings,
    announcement,
    participants,
    pointLogs,
    bracketMatches,
  };
}

export function clearParticipants() {
  db.exec(`
    DELETE FROM participants;
    DELETE FROM point_logs;
    DELETE FROM bracket_matches;
  `);
  return getAllArenaData();
}

export function resetArenaData() {
  db.exec(`
    DELETE FROM participants;
    DELETE FROM point_logs;
    DELETE FROM bracket_matches;
  `);
  return getAllArenaData();
}

export { db };

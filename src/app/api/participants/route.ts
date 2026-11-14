import { NextResponse } from "next/server";
import { db, getAllArenaData } from "@/lib/db";
import {
  DEFAULT_TOURNAMENT_STAGES,
  TournamentStage,
  resolveStageIndex,
  calculateParticipantScoreInStage,
} from "@/data/mockCompetition";

export const dynamic = "force-dynamic";

function getStagesHelper(): TournamentStage[] {
  const stagesJson = db.prepare("SELECT value FROM settings WHERE key = 'tournament_stages'").get() as { value?: string } | undefined;
  if (stagesJson?.value) {
    try {
      const parsed = JSON.parse(stagesJson.value);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  return DEFAULT_TOURNAMENT_STAGES;
}

export async function POST(req: Request) {
  try {
    const p = await req.json();

    const insertParticipant = db.prepare(`
      INSERT INTO participants (
        id, code, name, institution, city, category, status, current_stage_idx,
        babak1, babak2, babak3,
        criteria_teknis, criteria_inovasi, criteria_kecepatan, criteria_presentasi,
        members_json, total_points, previous_rank, last_updated, avatar_color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertParticipant.run(
      p.id,
      p.code,
      p.name,
      p.institution,
      p.city,
      p.category,
      p.status,
      p.currentStageIdx ?? 0,
      p.scores.babak1,
      p.scores.babak2,
      p.scores.babak3,
      p.criteria?.teknis ?? 200,
      p.criteria?.inovasi ?? 200,
      p.criteria?.kecepatan ?? 200,
      p.criteria?.presentasi ?? 200,
      JSON.stringify(p.members || []),
      p.totalPoints,
      p.previousRank || 1,
      p.lastUpdated || "Baru saja",
      p.avatarColor || "from-cyan-500 to-blue-600"
    );

    const insertLog = db.prepare(`
      INSERT INTO point_logs (id, participant_id, participant_name, category, delta, stage_label, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertLog.run(
      `log-${Date.now()}`,
      p.id,
      p.name,
      p.category,
      p.totalPoints,
      "Peserta Baru Terdaftar",
      "Baru saja"
    );

    return NextResponse.json({ success: true, data: getAllArenaData() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    // Mode 1: Quick Adjust Point
    if (body.type === "quick_adjust") {
      const { participantId, delta, label, targetRound } = body;
      const current = db.prepare("SELECT * FROM participants WHERE id = ?").get(participantId) as any;
      if (!current) {
        return NextResponse.json({ error: "Participant not found" }, { status: 404 });
      }

      // Check active round from settings if not explicitly passed
      let roundToUpdate = targetRound;
      if (!roundToUpdate) {
        const activeRoundSetting = db.prepare("SELECT value FROM settings WHERE key = 'active_round'").get() as { value?: string } | undefined;
        roundToUpdate = activeRoundSetting?.value || "babak3";
      }

      const stages = getStagesHelper();
      const stageIdx = resolveStageIndex(roundToUpdate, stages);

      let newB1 = current.babak1;
      let newB2 = current.babak2;
      let newB3 = current.babak3;

      if (stageIdx === 0) {
        newB1 = Number((current.babak1 + delta).toFixed(1));
      } else if (stageIdx === 1) {
        newB2 = Number((current.babak2 + delta).toFixed(1));
      } else {
        newB3 = Number((current.babak3 + delta).toFixed(1));
      }

      const newTotal = calculateParticipantScoreInStage(
        { babak1: newB1, babak2: newB2, babak3: newB3 },
        stageIdx,
        stages
      );

      db.prepare(`
        UPDATE participants
        SET babak1 = ?, babak2 = ?, babak3 = ?, total_points = ?, last_updated = 'Baru saja'
        WHERE id = ?
      `).run(newB1, newB2, newB3, newTotal, participantId);

      const nowIso = new Date().toISOString();
      const uniqueLogId =
        typeof body.logId === "string" && body.logId.trim()
          ? body.logId.trim()
          : `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO point_logs (id, participant_id, participant_name, category, delta, stage_label, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uniqueLogId, participantId, current.name, current.category, delta, label, nowIso);

      return NextResponse.json({ success: true, data: getAllArenaData() });
    }

    // Mode 2: Update Criteria Juri
    if (body.type === "update_criteria") {
      const { participantId, field, value } = body;
      const current = db.prepare("SELECT * FROM participants WHERE id = ?").get(participantId) as any;
      if (!current) {
        return NextResponse.json({ error: "Participant not found" }, { status: 404 });
      }

      const clamped = Math.max(0, Math.min(250, Number(value)));
      const fieldColumnMap: Record<string, string> = {
        teknis: "criteria_teknis",
        inovasi: "criteria_inovasi",
        kecepatan: "criteria_kecepatan",
        presentasi: "criteria_presentasi",
      };
      const colName = fieldColumnMap[field];
      if (!colName) {
        return NextResponse.json({ error: "Invalid criteria field" }, { status: 400 });
      }

      db.prepare(`UPDATE participants SET ${colName} = ? WHERE id = ?`).run(clamped, participantId);

      const refreshed = db.prepare("SELECT * FROM participants WHERE id = ?").get(participantId) as any;
      const newBabak3 =
        refreshed.criteria_teknis +
        refreshed.criteria_inovasi +
        refreshed.criteria_kecepatan +
        refreshed.criteria_presentasi;
      const stages = getStagesHelper();
      const activeRoundSetting = db.prepare("SELECT value FROM settings WHERE key = 'active_round'").get() as { value?: string } | undefined;
      const stageIdx = resolveStageIndex(activeRoundSetting?.value || "babak3", stages);
      const newTotal = calculateParticipantScoreInStage(
        { babak1: refreshed.babak1, babak2: refreshed.babak2, babak3: newBabak3 },
        stageIdx,
        stages
      );

      db.prepare(`
        UPDATE participants
        SET babak3 = ?, total_points = ?, last_updated = 'Baru saja'
        WHERE id = ?
      `).run(newBabak3, newTotal, participantId);

      return NextResponse.json({ success: true, data: getAllArenaData() });
    }

    // Mode 3: Advance Stage / Revert Stage (Lanjut / Batal Lanjut Babak)
    if (body.type === "advance_stage" || body.type === "revert_stage") {
      const { participantId, targetStageIdx, status } = body;
      const current = db.prepare("SELECT * FROM participants WHERE id = ?").get(participantId) as any;
      if (!current) {
        return NextResponse.json({ error: "Participant not found" }, { status: 404 });
      }

      const stages = getStagesHelper();
      const currentIdx = Number(current.current_stage_idx || 0);
      const newIdx = targetStageIdx !== undefined ? Number(targetStageIdx) : currentIdx + 1;
      const isLastStage = newIdx >= stages.length - 1;
      const newStatus = status || (isLastStage ? "Finalis" : "Aktif");

      db.prepare(`
        UPDATE participants
        SET current_stage_idx = ?, status = ?, last_updated = 'Baru saja'
        WHERE id = ?
      `).run(newIdx, newStatus, participantId);

      const targetStageName = stages[newIdx]?.name || `Babak ${newIdx + 1}`;
      const nowIso = new Date().toISOString();
      const uniqueLogId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const logLabel = newIdx < currentIdx
        ? `Batal Lolos — Kembali ke ${targetStageName}`
        : `Lolos ke ${targetStageName}`;
      db.prepare(`
        INSERT INTO point_logs (id, participant_id, participant_name, category, delta, stage_label, timestamp)
        VALUES (?, ?, ?, ?, 0, ?, ?)
      `).run(uniqueLogId, participantId, current.name, current.category, logLabel, nowIso);

      return NextResponse.json({ success: true, data: getAllArenaData() });
    }

    // Mode 4: Toggle Status (Gugur / Aktif / Finalis)
    if (body.type === "toggle_status" || body.type === "set_status") {
      const { participantId, status } = body;
      const current = db.prepare("SELECT * FROM participants WHERE id = ?").get(participantId) as any;
      if (!current) {
        return NextResponse.json({ error: "Participant not found" }, { status: 404 });
      }

      db.prepare(`
        UPDATE participants
        SET status = ?, last_updated = 'Baru saja'
        WHERE id = ?
      `).run(status, participantId);

      const nowIso = new Date().toISOString();
      const uniqueLogId =
        typeof body.logId === "string" && body.logId.trim()
          ? body.logId.trim()
          : `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO point_logs (id, participant_id, participant_name, category, delta, stage_label, timestamp)
        VALUES (?, ?, ?, ?, 0, ?, ?)
      `).run(uniqueLogId, participantId, current.name, current.category, `Status: ${status}`, nowIso);

      return NextResponse.json({ success: true, data: getAllArenaData() });
    }

    // Mode 5: Full Profile & Score Update
    const { p, note } = body;
    const current = db.prepare("SELECT * FROM participants WHERE id = ?").get(p.id) as any;
    if (!current) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    const b1 = Number(p.scores.babak1);
    const b2 = Number(p.scores.babak2);
    const b3 = Number(p.scores.babak3);
    const stages = getStagesHelper();
    const activeRoundSetting = db.prepare("SELECT value FROM settings WHERE key = 'active_round'").get() as { value?: string } | undefined;
    const stageIdx = resolveStageIndex(activeRoundSetting?.value || "babak1", stages);
    const newTotal = calculateParticipantScoreInStage(
      { babak1: b1, babak2: b2, babak3: b3 },
      stageIdx,
      stages
    );
    const delta = newTotal - current.total_points;

    db.prepare(`
      UPDATE participants
      SET code = ?, name = ?, institution = ?, city = ?, category = ?, status = ?,
          current_stage_idx = ?,
          babak1 = ?, babak2 = ?, babak3 = ?, members_json = ?, total_points = ?, last_updated = 'Baru saja'
      WHERE id = ?
    `).run(
      p.code,
      p.name,
      p.institution,
      p.city,
      p.category,
      p.status,
      p.currentStageIdx ?? current.current_stage_idx ?? 0,
      b1,
      b2,
      b3,
      JSON.stringify(p.members || []),
      newTotal,
      p.id
    );

    if (delta !== 0) {
      const nowIso = new Date().toISOString();
      const uniqueLogId =
        typeof body.logId === "string" && body.logId.trim()
          ? body.logId.trim()
          : `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO point_logs (id, participant_id, participant_name, category, delta, stage_label, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uniqueLogId, p.id, p.name, p.category, delta, note || "Perubahan Data Peserta", nowIso);
    }

    return NextResponse.json({ success: true, data: getAllArenaData() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const target = db.prepare("SELECT * FROM participants WHERE id = ?").get(id) as any;
    if (target) {
      const nowIso = new Date().toISOString();
      const uniqueLogId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare("DELETE FROM participants WHERE id = ?").run(id);
      db.prepare(`
        INSERT INTO point_logs (id, participant_id, participant_name, category, delta, stage_label, timestamp)
        VALUES (?, ?, ?, ?, ?, 'Peserta Dihapus', ?)
      `).run(uniqueLogId, id, target.name, target.category, -target.total_points, nowIso);
    }

    return NextResponse.json({ success: true, data: getAllArenaData() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


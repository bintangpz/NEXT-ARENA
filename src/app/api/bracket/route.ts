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

// Helper: Fisher-Yates Shuffle
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: getAllArenaData() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const reqBody = await req.json();
    const { matchId, scoreA, scoreB, winner, status: customStatus, teamA, teamB, currentLeg, scoreALeg1, scoreBLeg1, scoreALeg2, scoreBLeg2, logEntry } = reqBody;

    const currentMatch = db.prepare("SELECT * FROM bracket_matches WHERE id = ?").get(matchId) as any;
    if (!currentMatch) {
      return NextResponse.json({ error: "Laga pertandingan tidak ditemukan" }, { status: 404 });
    }

    const resolvedLeg = currentLeg !== undefined ? Number(currentLeg) : (currentMatch.current_leg || 1);

    if (logEntry && logEntry.teamName && logEntry.delta !== undefined) {
      const targetP = db.prepare("SELECT * FROM participants WHERE name = ?").get(logEntry.teamName) as any;
      const nowIso = new Date().toISOString();
      const uniqueLogId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const mLabel = currentMatch.match_label || matchId;
      const cleanMLabel = mLabel.toLowerCase().startsWith("laga") ? mLabel : `Laga ${mLabel}`;
      const legNum = logEntry.leg || resolvedLeg || 1;
      const swTime = logEntry.swTime || "00:00";
      const stageLabel = `${logEntry.label || (logEntry.delta > 0 ? `+${logEntry.delta} Poin` : `${logEntry.delta} Poin`)} (${cleanMLabel} P${legNum} @${swTime})`;

      db.prepare(`
        INSERT INTO point_logs (id, participant_id, participant_name, category, delta, stage_label, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uniqueLogId,
        targetP?.id || matchId,
        logEntry.teamName,
        targetP?.category || currentMatch.category || "Transporter SMP",
        Number(logEntry.delta),
        stageLabel,
        nowIso
      );
    }
    const resolvedScoreALeg1 = scoreALeg1 !== undefined ? Number(scoreALeg1) : (currentMatch.score_a_leg1 || 0);
    const resolvedScoreBLeg1 = scoreBLeg1 !== undefined ? Number(scoreBLeg1) : (currentMatch.score_b_leg1 || 0);
    const resolvedScoreALeg2 = scoreALeg2 !== undefined ? Number(scoreALeg2) : (currentMatch.score_a_leg2 || 0);
    const resolvedScoreBLeg2 = scoreBLeg2 !== undefined ? Number(scoreBLeg2) : (currentMatch.score_b_leg2 || 0);

    let resolvedScoreA = scoreA !== undefined ? Number(scoreA) : (scoreALeg1 !== undefined || scoreALeg2 !== undefined ? Number(((resolvedScoreALeg1 + resolvedScoreALeg2) / 2).toFixed(2)) : currentMatch.score_a);
    let resolvedScoreB = scoreB !== undefined ? Number(scoreB) : (scoreBLeg1 !== undefined || scoreBLeg2 !== undefined ? Number(((resolvedScoreBLeg1 + resolvedScoreBLeg2) / 2).toFixed(2)) : currentMatch.score_b);

    const isPlayed = resolvedScoreA !== 0 || resolvedScoreB !== 0;

    let resolvedWinner = winner;
    if (resolvedWinner === undefined) {
      resolvedWinner = isPlayed
        ? resolvedScoreA > resolvedScoreB
          ? "A"
          : resolvedScoreB > resolvedScoreA
          ? "B"
          : null
        : null;
    }

    const status =
      customStatus ||
      (isPlayed
        ? resolvedWinner
          ? "Selesai"
          : "Berlangsung"
        : "Siap Tanding");

    db.prepare(`
      UPDATE bracket_matches
      SET score_a = ?, score_b = ?, winner = ?, status = ?,
          team_a = COALESCE(?, team_a),
          team_b = COALESCE(?, team_b),
          current_leg = ?,
          score_a_leg1 = ?,
          score_b_leg1 = ?,
          score_a_leg2 = ?,
          score_b_leg2 = ?
      WHERE id = ?
    `).run(
      resolvedScoreA,
      resolvedScoreB,
      resolvedWinner,
      status,
      teamA || null,
      teamB || null,
      resolvedLeg,
      resolvedScoreALeg1,
      resolvedScoreBLeg1,
      resolvedScoreALeg2,
      resolvedScoreBLeg2,
      matchId
    );

    // Sync match scores directly with participant ranking points for the active round
    const targetTeamA = teamA || currentMatch.team_a;
    const targetTeamB = teamB || currentMatch.team_b;
    const roundName = currentMatch.round;

    const stages = getStagesHelper();
    const matchStageIdx = resolveStageIndex(roundName, stages);

    const updateParticipantScore = (teamName: string, newScore: number) => {
      if (!teamName || teamName.startsWith("-") || teamName.startsWith("BYE")) return;
      const p = db.prepare("SELECT * FROM participants WHERE name = ?").get(teamName) as any;
      if (!p) return;

      let b1 = p.babak1;
      let b2 = p.babak2;
      let b3 = p.babak3;

      if (matchStageIdx === 0) {
        b1 = newScore;
      } else if (matchStageIdx === 1) {
        b2 = newScore;
      } else {
        b3 = newScore;
      }

      const total = calculateParticipantScoreInStage({ babak1: b1, babak2: b2, babak3: b3 }, matchStageIdx, stages);

      db.prepare(`
        UPDATE participants
        SET babak1 = ?, babak2 = ?, babak3 = ?, total_points = ?, last_updated = 'Baru saja'
        WHERE id = ?
      `).run(b1, b2, b3, total, p.id);
    };

    updateParticipantScore(targetTeamA, resolvedScoreA);
    updateParticipantScore(targetTeamB, resolvedScoreB);

    // AUTO-PROGRESSION BABAK:
    // Jika sebuah laga selesai, cek apakah seluruh laga di babak tersebut telah selesai.
    // Jika seluruh laga babak tersebut selesai dan babak selanjutnya belum dibuat, buat secara otomatis!
    if (status === "Selesai") {
      try {
        if (roundName.includes("Penyisihan")) {
          const penyisihanMatches = db.prepare("SELECT * FROM bracket_matches WHERE round = 'Babak Penyisihan'").all() as any[];
          const allDone = penyisihanMatches.length > 0 && penyisihanMatches.every((m) => m.status === "Selesai");
          const count8b = (db.prepare("SELECT count(*) as c FROM bracket_matches WHERE round = 'Babak 8 Besar'").get() as any)?.c || 0;
          if (allDone && count8b === 0) {
            generate8BesarMatches();
          }
        } else if (roundName.includes("8 Besar")) {
          const matches8b = db.prepare("SELECT * FROM bracket_matches WHERE round = 'Babak 8 Besar'").all() as any[];
          const allDone = matches8b.length > 0 && matches8b.every((m) => m.status === "Selesai");
          const countSf = (db.prepare("SELECT count(*) as c FROM bracket_matches WHERE round = 'Babak Semifinal'").get() as any)?.c || 0;
          if (allDone && countSf === 0) {
            generateSemifinalMatches();
          }
        } else if (roundName.includes("Semifinal")) {
          const matchesSf = db.prepare("SELECT * FROM bracket_matches WHERE round = 'Babak Semifinal'").all() as any[];
          const allDone = matchesSf.length > 0 && matchesSf.every((m) => m.status === "Selesai");
          const countFn = (db.prepare("SELECT count(*) as c FROM bracket_matches WHERE round = 'Babak Final'").get() as any)?.c || 0;
          if (allDone && countFn === 0) {
            generateFinalMatches();
          }
        }
      } catch (e) {
        console.error("Gagal auto-advance babak:", e);
      }
    }

    return NextResponse.json({ success: true, data: getAllArenaData() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generate8BesarMatches(): boolean {
  const top8 = db
    .prepare("SELECT * FROM participants ORDER BY babak1 DESC, total_points DESC LIMIT 8")
    .all() as any[];

  if (top8.length < 2) return false;

  db.prepare("DELETE FROM bracket_matches WHERE round = 'Babak 8 Besar'").run();

  const insertMatch = db.prepare(`
    INSERT INTO bracket_matches (
      id, round, match_label, category,
      team_a, team_a_code, score_a,
      team_b, team_b_code, score_b,
      status, winner
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const category = top8[0]?.category || "Transporter SMP";

  for (let i = 0; i < top8.length; i += 2) {
    const teamA = top8[i];
    const teamB = top8[i + 1];
    const matchNum = Math.floor(i / 2) + 1;
    const matchId = `m-8b-${matchNum}`;
    const matchLabel = `Laga 8B-${String(matchNum).padStart(2, "0")}`;

    if (teamB) {
      insertMatch.run(
        matchId, "Babak 8 Besar", matchLabel, category,
        teamA.name, teamA.code || teamA.id, 0,
        teamB.name, teamB.code || teamB.id, 0,
        "Siap Tanding", null
      );
    } else {
      insertMatch.run(
        matchId, "Babak 8 Besar", matchLabel, category,
        teamA.name, teamA.code || teamA.id, 0,
        "- (Tanding Tunggal)", "-", 0,
        "Siap Tanding", null
      );
    }
  }
  return true;
}

function generateSemifinalMatches(): boolean {
  const matches8Besar = db
    .prepare("SELECT * FROM bracket_matches WHERE round = 'Babak 8 Besar' ORDER BY id ASC")
    .all() as any[];

  let semiTeams: { name: string; code: string }[] = [];

  // Jika 8 Besar sudah ada dan memiliki pemenang
  if (matches8Besar.length >= 2) {
    for (const m of matches8Besar) {
      const winnerName = m.winner === "A" ? m.team_a : m.winner === "B" ? m.team_b : (m.score_a >= m.score_b ? m.team_a : m.team_b);
      const winnerCode = m.winner === "A" ? m.team_a_code : m.winner === "B" ? m.team_b_code : (m.score_a >= m.score_b ? m.team_a_code : m.team_b_code);
      if (winnerName && !winnerName.startsWith("-")) {
        semiTeams.push({ name: winnerName, code: winnerCode || "-" });
      }
    }
  }

  // Fallback ke top 4 klasemen jika pemenang bracket 8 besar belum mencukupi 2 tim
  if (semiTeams.length < 2) {
    const allP = db.prepare("SELECT * FROM participants").all() as any[];
    const stages = getStagesHelper();
    allP.sort((a, b) => {
      const sA = calculateParticipantScoreInStage({ babak1: a.babak1, babak2: a.babak2, babak3: a.babak3 }, 1, stages);
      const sB = calculateParticipantScoreInStage({ babak1: b.babak1, babak2: b.babak2, babak3: b.babak3 }, 1, stages);
      if (sB !== sA) return sB - sA;
      return (b.total_points || 0) - (a.total_points || 0);
    });
    const top4 = allP.slice(0, 4);
    semiTeams = top4.map((p) => ({ name: p.name, code: p.code || p.id }));
  }

  if (semiTeams.length < 2) return false;

  db.prepare("DELETE FROM bracket_matches WHERE round = 'Babak Semifinal'").run();

  const insertMatch = db.prepare(`
    INSERT INTO bracket_matches (
      id, round, match_label, category,
      team_a, team_a_code, score_a,
      team_b, team_b_code, score_b,
      status, winner
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const category = "Transporter SMP";

  for (let i = 0; i < semiTeams.length; i += 2) {
    const teamA = semiTeams[i];
    const teamB = semiTeams[i + 1];
    const matchNum = Math.floor(i / 2) + 1;
    const matchId = `m-sf-${matchNum}`;
    const matchLabel = `Semifinal ${matchNum}`;

    if (teamB) {
      insertMatch.run(
        matchId, "Babak Semifinal", matchLabel, category,
        teamA.name, teamA.code, 0,
        teamB.name, teamB.code, 0,
        "Siap Tanding", null
      );
    } else {
      insertMatch.run(
        matchId, "Babak Semifinal", matchLabel, category,
        teamA.name, teamA.code, 0,
        "- (Tanding Tunggal)", "-", 0,
        "Siap Tanding", null
      );
    }
  }
  return true;
}

function generateFinalMatches(): boolean {
  const sfMatches = db
    .prepare("SELECT * FROM bracket_matches WHERE round = 'Babak Semifinal' ORDER BY id ASC")
    .all() as any[];

  db.prepare("DELETE FROM bracket_matches WHERE round = 'Babak Final'").run();

  const insertMatch = db.prepare(`
    INSERT INTO bracket_matches (
      id, round, match_label, category,
      team_a, team_a_code, score_a,
      team_b, team_b_code, score_b,
      status, winner
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const category = "Transporter SMP";

  if (sfMatches.length >= 2) {
    const sf1 = sfMatches[0];
    const sf2 = sfMatches[1];

    const sf1Winner = sf1.winner === "A" ? sf1.team_a : sf1.winner === "B" ? sf1.team_b : (sf1.score_a >= sf1.score_b ? sf1.team_a : sf1.team_b);
    const sf1WinnerCode = sf1.winner === "A" ? sf1.team_a_code : sf1.winner === "B" ? sf1.team_b_code : (sf1.score_a >= sf1.score_b ? sf1.team_a_code : sf1.team_b_code);
    const sf1Loser = sf1.winner === "A" ? sf1.team_b : sf1.winner === "B" ? sf1.team_a : (sf1.score_a >= sf1.score_b ? sf1.team_b : sf1.team_a);
    const sf1LoserCode = sf1.winner === "A" ? sf1.team_b_code : sf1.winner === "B" ? sf1.team_a_code : (sf1.score_a >= sf1.score_b ? sf1.team_b_code : sf1.team_a_code);

    const sf2Winner = sf2.winner === "A" ? sf2.team_a : sf2.winner === "B" ? sf2.team_b : (sf2.score_a >= sf2.score_b ? sf2.team_a : sf2.team_b);
    const sf2WinnerCode = sf2.winner === "A" ? sf2.team_a_code : sf2.winner === "B" ? sf2.team_b_code : (sf2.score_a >= sf2.score_b ? sf2.team_a_code : sf2.team_b_code);
    const sf2Loser = sf2.winner === "A" ? sf2.team_b : sf2.winner === "B" ? sf2.team_a : (sf2.score_a >= sf2.score_b ? sf2.team_b : sf2.team_a);
    const sf2LoserCode = sf2.winner === "A" ? sf2.team_b_code : sf2.winner === "B" ? sf2.team_a_code : (sf2.score_a >= sf2.score_b ? sf2.team_b_code : sf2.team_a_code);

    // 1. Grand Final (Juara 1 & 2)
    insertMatch.run(
      "m-final-1st", "Babak Final", "Grand Final (Juara 1 & 2)", category,
      sf1Winner, sf1WinnerCode || "-", 0,
      sf2Winner, sf2WinnerCode || "-", 0,
      "Siap Tanding", null
    );

    // 2. Perebutan Juara 3 (Juara 3 & 4)
    insertMatch.run(
      "m-final-3rd", "Babak Final", "Perebutan Juara 3 & 4", category,
      sf1Loser, sf1LoserCode || "-", 0,
      sf2Loser, sf2LoserCode || "-", 0,
      "Siap Tanding", null
    );

    return true;
  }

  // Fallback jika SF belum ada laga
  const allParticipants = db.prepare("SELECT * FROM participants").all() as any[];
  const stages = getStagesHelper();
  allParticipants.sort((a, b) => {
    const scoreA = calculateParticipantScoreInStage({ babak1: a.babak1, babak2: a.babak2, babak3: a.babak3 }, 2, stages);
    const scoreB = calculateParticipantScoreInStage({ babak1: b.babak1, babak2: b.babak2, babak3: b.babak3 }, 2, stages);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (b.total_points || 0) - (a.total_points || 0);
  });
  const top4 = allParticipants.slice(0, 4);

  if (top4.length < 2) return false;

  insertMatch.run(
    "m-final-1st", "Babak Final", "Grand Final (Juara 1 & 2)", category,
    top4[0]?.name || "Finalis 1", top4[0]?.code || "-", 0,
    top4[1]?.name || "Finalis 2", top4[1]?.code || "-", 0,
    "Siap Tanding", null
  );

  if (top4.length >= 4) {
    insertMatch.run(
      "m-final-3rd", "Babak Final", "Perebutan Juara 3 & 4", category,
      top4[2]?.name || "Semifinalis 1", top4[2]?.code || "-", 0,
      top4[3]?.name || "Semifinalis 2", top4[3]?.code || "-", 0,
      "Siap Tanding", null
    );
  }

  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedRound: string = body?.round || "Babak Penyisihan";

    const insertMatch = db.prepare(`
      INSERT INTO bracket_matches (
        id, round, match_label, category,
        team_a, team_a_code, score_a,
        team_b, team_b_code, score_b,
        status, winner
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const stages = getStagesHelper();
    const stageIdx = stages.findIndex((s) => s.name === requestedRound);

    // Cek apakah ada tim yang diloloskan secara spesifik ke babak ini (current_stage_idx >= stageIdx)
    let qualifiedForRound: any[] = [];
    if (stageIdx > 0) {
      qualifiedForRound = db
        .prepare(`
          SELECT * FROM participants
          WHERE (current_stage_idx >= ? OR (current_stage_idx IS NULL AND ? = 0))
            AND (status IS NULL OR status != 'Gugur')
          ORDER BY total_points DESC, rowid ASC
        `)
        .all(stageIdx, stageIdx) as any[];
    }

    if (stageIdx > 0 && qualifiedForRound.length >= 2) {
      // Prioritaskan peserta yang telah diloloskan oleh operator melalui tombol Lanjut Babak!
      const participants = qualifiedForRound;

      // Hapus laga babak ini sebelumnya
      db.prepare("DELETE FROM bracket_matches WHERE round = ?").run(requestedRound);

      // Acak urutan tim untuk duel tanding
      const shuffled = shuffleArray(participants);
      const category = participants[0]?.category || "Transporter SMP";
      const roundSlug = requestedRound
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      for (let i = 0; i < shuffled.length; i += 2) {
        const teamA = shuffled[i];
        const teamB = shuffled[i + 1];
        const matchNum = Math.floor(i / 2) + 1;
        const matchId = `m-${roundSlug}-${matchNum}`;
        const matchLabel = `Laga ${String(matchNum).padStart(2, "0")}`;

        if (teamB) {
          insertMatch.run(
            matchId,
            requestedRound,
            matchLabel,
            category,
            teamA.name,
            teamA.code || teamA.id,
            0,
            teamB.name,
            teamB.code || teamB.id,
            0,
            "Siap Tanding",
            null
          );
        } else {
          insertMatch.run(
            matchId,
            requestedRound,
            matchLabel,
            category,
            teamA.name,
            teamA.code || teamA.id,
            0,
            "- (Tanding Tunggal)",
            "-",
            0,
            "Siap Tanding",
            null
          );
        }
      }
    } else if (requestedRound.includes("8 Besar")) {
      const ok = generate8BesarMatches();
      if (!ok) {
        return NextResponse.json(
          { error: `Dibutuhkan minimal 2 tim yang lolos ke ${requestedRound} untuk membuat jadwal tanding` },
          { status: 400 }
        );
      }
    } else if (requestedRound.includes("Semifinal")) {
      const ok = generateSemifinalMatches();
      if (!ok) {
        return NextResponse.json(
          { error: `Dibutuhkan minimal 2 tim yang lolos ke ${requestedRound} untuk membuat jadwal tanding` },
          { status: 400 }
        );
      }
    } else if (requestedRound.includes("Final")) {
      const ok = generateFinalMatches();
      if (!ok) {
        return NextResponse.json(
          { error: `Dibutuhkan minimal 2 tim yang lolos ke ${requestedRound} untuk membuat jadwal tanding` },
          { status: 400 }
        );
      }
    } else {
      // Babak 1 atau babak penyisihan
      if (stageIdx > 0) {
        return NextResponse.json(
          { error: `Dibutuhkan minimal 2 tim yang dinyatakan lolos ke ${requestedRound} (Saat ini baru ${qualifiedForRound.length} tim). Buka tab Daftar Peserta & Klasemen untuk meloloskan tim.` },
          { status: 400 }
        );
      }

      let participants = db
        .prepare(`
          SELECT * FROM participants
          WHERE (status IS NULL OR status != 'Gugur')
          ORDER BY total_points DESC, rowid ASC
        `)
        .all() as any[];

      if (participants.length < 2) {
        return NextResponse.json(
          { error: "Minimal harus ada 2 tim terdaftar untuk membuat jadwal tanding" },
          { status: 400 }
        );
      }

      // Jika babak 16 besar, ambil top 16 tim
      if (requestedRound.includes("16")) {
        participants = participants.slice(0, 16);
      }

      // Hapus laga babak ini sebelumnya
      db.prepare("DELETE FROM bracket_matches WHERE round = ?").run(requestedRound);

      // Acak urutan tim untuk duel tanding
      const shuffled = shuffleArray(participants);
      const category = participants[0]?.category || "Transporter SMP";
      const roundSlug = requestedRound
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      for (let i = 0; i < shuffled.length; i += 2) {
        const teamA = shuffled[i];
        const teamB = shuffled[i + 1];
        const matchNum = Math.floor(i / 2) + 1;
        const matchId = `m-${roundSlug}-${matchNum}`;
        const matchLabel = `Laga ${String(matchNum).padStart(2, "0")}`;

        if (teamB) {
          insertMatch.run(
            matchId,
            requestedRound,
            matchLabel,
            category,
            teamA.name,
            teamA.code || teamA.id,
            0,
            teamB.name,
            teamB.code || teamB.id,
            0,
            "Siap Tanding",
            null
          );
        } else {
          insertMatch.run(
            matchId,
            requestedRound,
            matchLabel,
            category,
            teamA.name,
            teamA.code || teamA.id,
            0,
            "- (Tanding Tunggal)",
            "-",
            0,
            "Siap Tanding",
            null
          );
        }
      }
    }

    return NextResponse.json({ success: true, data: getAllArenaData() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const matchId = url.searchParams.get("matchId");
    const clearLogs = url.searchParams.get("clearLogs") === "true";
    const logsOnly = url.searchParams.get("logsOnly") === "true";
    const action = url.searchParams.get("action");
    const deleteRound = url.searchParams.get("deleteRound");

    // Hapus seluruh laga untuk 1 babak tertentu (dipanggil saat babak dihapus)
    if (deleteRound) {
      db.prepare("DELETE FROM bracket_matches WHERE round = ?").run(deleteRound);
      return NextResponse.json({ success: true, data: getAllArenaData() });
    }

    // Reset seluruh perolehan poin: skor laga, poin peserta, dan log aktivitas poin kembali ke 0
    if (action === "reset_points") {
      db.prepare(`
        UPDATE bracket_matches
        SET score_a = 0, score_b = 0,
            score_a_leg1 = 0, score_b_leg1 = 0,
            score_a_leg2 = 0, score_b_leg2 = 0,
            current_leg = 1,
            status = 'Siap Tanding',
            winner = NULL
      `).run();

      db.prepare(`
        UPDATE participants
        SET babak1 = 0, babak2 = 0, babak3 = 0, total_points = 0,
            status = 'Aktif', current_stage_idx = 0, last_updated = 'Baru saja'
      `).run();

      db.prepare("DELETE FROM point_logs").run();

      return NextResponse.json({ success: true, data: getAllArenaData() });
    }

    // Reset babak turnamen:
    // - Kembalikan seluruh peserta ke babak pertama (current_stage_idx = 0, status = 'Aktif')
    // - Hapus seluruh jadwal laga babak 2, babak 3, dst (babak 2 dst jadi kosong lagi)
    if (action === "reset_babak" || action === "reset_stages" || action === "reset_round") {
      const stages = getStagesHelper();
      const firstStageName = stages[0]?.name || "Babak 1";
      const firstStageId = stages[0]?.id || "babak1";

      // 1. Cari dan bersihkan log poin laga babak 2 dst yang akan dihapus
      const matchesToDelete = db
        .prepare(`
          SELECT id, match_label FROM bracket_matches
          WHERE round != ? AND round != ?
        `)
        .all(firstStageName, firstStageId) as any[];

      for (const m of matchesToDelete) {
        db.prepare(`
          DELETE FROM point_logs
          WHERE stage_label LIKE '%' || ? || '%' OR stage_label LIKE '%' || ? || '%'
        `).run(m.match_label, m.id);
      }

      // Hapus seluruh laga babak 2 dst
      db.prepare(`
        DELETE FROM bracket_matches
        WHERE round != ? AND round != ?
      `).run(firstStageName, firstStageId);

      // 2. Kembalikan seluruh peserta ke babak pertama (current_stage_idx = 0, status = 'Aktif')
      // Bersihkan perolehan babak 2 & babak 3 dan sesuaikan total_points ke babak 1
      db.prepare(`
        UPDATE participants
        SET current_stage_idx = 0,
            status = 'Aktif',
            babak2 = 0,
            babak3 = 0,
            total_points = COALESCE(babak1, 0),
            last_updated = 'Baru saja'
      `).run();

      return NextResponse.json({ success: true, data: getAllArenaData() });
    }

    if (matchId) {
      const match = db.prepare("SELECT * FROM bracket_matches WHERE id = ?").get(matchId) as any;
      if (match) {
        if (logsOnly) {
          // Hanya hapus log aktivitas poin untuk laga ini
          db.prepare(`
            DELETE FROM point_logs
            WHERE stage_label LIKE '%' || ? || '%' OR stage_label LIKE '%' || ? || '%'
          `).run(match.match_label, matchId);
        } else {
          // Reset laga ke kondisi awal
          db.prepare(`
            UPDATE bracket_matches
            SET score_a = 0, score_b = 0,
                score_a_leg1 = 0, score_b_leg1 = 0,
                score_a_leg2 = 0, score_b_leg2 = 0,
                current_leg = 1,
                status = 'Siap Tanding',
                winner = NULL
            WHERE id = ?
          `).run(matchId);

          if (clearLogs) {
            db.prepare(`
              DELETE FROM point_logs
              WHERE stage_label LIKE '%' || ? || '%' OR stage_label LIKE '%' || ? || '%'
            `).run(match.match_label, matchId);
          }

          // Sinkronisasi skor peserta kembali ke 0 untuk babak ini
          const stages = getStagesHelper();
          const matchStageIdx = resolveStageIndex(match.round, stages);

          const resetParticipantScore = (teamName: string) => {
            if (!teamName || teamName.startsWith("-") || teamName.startsWith("BYE")) return;
            const p = db.prepare("SELECT * FROM participants WHERE name = ?").get(teamName) as any;
            if (!p) return;

            let b1 = p.babak1;
            let b2 = p.babak2;
            let b3 = p.babak3;

            if (matchStageIdx === 0) {
              b1 = 0;
            } else if (matchStageIdx === 1) {
              b2 = 0;
            } else {
              b3 = 0;
            }

            const total = calculateParticipantScoreInStage({ babak1: b1, babak2: b2, babak3: b3 }, matchStageIdx, stages);

            db.prepare(`
              UPDATE participants
              SET babak1 = ?, babak2 = ?, babak3 = ?, total_points = ?, last_updated = 'Baru saja'
              WHERE id = ?
            `).run(b1, b2, b3, total, p.id);
          };

          if (match.team_a) resetParticipantScore(match.team_a);
          if (match.team_b) resetParticipantScore(match.team_b);
        }
      }
      return NextResponse.json({ success: true, data: getAllArenaData() });
    }

    // Default: Reset seluruh jadwal laga
    db.prepare("DELETE FROM bracket_matches").run();
    return NextResponse.json({ success: true, data: getAllArenaData() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

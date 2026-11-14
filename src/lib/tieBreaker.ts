import type { PointLog } from "@/data/mockCompetition";

export interface FinishedCornersSnapshot {
  p1Red?: string;
  p1Blue?: string;
  p2Red?: string;
  p2Blue?: string;
}

export interface FinishTimeInfo {
  timeStr: string;
  timeMs: number;
  leg: 1 | 2;
  isSurrender: boolean;
}

export interface MatchWinnerResolution {
  winner: "A" | "B" | null;
  decidedBy: "score" | "finish_time" | "tie";
  teamAFinishMs: number | null;
  teamBFinishMs: number | null;
  teamAFinishFormatted: string | null;
  teamBFinishFormatted: string | null;
  teamALeg1Formatted: string | null;
  teamALeg2Formatted: string | null;
  teamBLeg1Formatted: string | null;
  teamBLeg2Formatted: string | null;
  teamALegsFinished: number;
  teamBLegsFinished: number;
}

export interface FastestFinishEntry {
  bestMs: number;
  bestFormatted: string;
}

/**
 * Parses a stopwatch duration string ("MM:SS" or "MM:SS.cc") into milliseconds.
 */
export function parseStopwatchTimeMs(timeStr: string | undefined | null): number | null {
  if (!timeStr) return null;
  const match = String(timeStr).trim().match(/^(\d+):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  const fracRaw = match[3] || "0";
  const ms =
    fracRaw.length === 1
      ? Number(fracRaw) * 100
      : fracRaw.length === 2
      ? Number(fracRaw) * 10
      : Number(fracRaw);
  return (minutes * 60 + seconds) * 1000 + ms;
}

/**
 * Formats milliseconds into "MM:SS.cc".
 */
export function formatStopwatchTimeMs(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return null;
  const totalCs = Math.round(ms / 10);
  const mins = Math.floor(totalCs / 6000);
  const secs = Math.floor((totalCs % 6000) / 100);
  const cs = totalCs % 100;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${cs
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Extracts finish timestamp and leg from a PointLog stageLabel when it represents a team Finish or Surrender.
 */
export function extractFinishTimeFromStageLabel(
  stageLabel: string | undefined
): FinishTimeInfo | null {
  const raw = stageLabel || "";
  if (!/finish/i.test(raw)) return null;
  if (/pertandingan selesai/i.test(raw)) return null;

  const swMatch = raw.match(/@(\d+:\d{2}(?:\.\d{1,3})?)/);
  if (!swMatch) return null;
  const timeStr = swMatch[1];
  const timeMs = parseStopwatchTimeMs(timeStr);
  if (timeMs === null) return null;

  const leg: 1 | 2 =
    /\bP2[\s@)]/i.test(raw) || /Putaran\s*2/i.test(raw) || /Sesi\s*2/i.test(raw) ? 2 : 1;

  return {
    timeStr,
    timeMs,
    leg,
    isSurrender: /menyerah/i.test(raw),
  };
}

/**
 * Resolves a head-to-head match winner by score first, then by fastest finish time when tied.
 */
export function resolveMatchWinner(params: {
  scoreA: number;
  scoreB: number;
  is2xMode?: boolean;
  finishedCorners?: FinishedCornersSnapshot;
  matchLogs?: Array<Pick<PointLog, "participantName" | "stageLabel">>;
  teamA?: string;
  teamB?: string;
}): MatchWinnerResolution {
  const {
    scoreA,
    scoreB,
    is2xMode = false,
    finishedCorners,
    matchLogs = [],
    teamA = "",
    teamB = "",
  } = params;

  const legMsA: { 1: number | null; 2: number | null } = {
    1: parseStopwatchTimeMs(finishedCorners?.p1Red),
    2: is2xMode ? parseStopwatchTimeMs(finishedCorners?.p2Blue) : null,
  };
  const legMsB: { 1: number | null; 2: number | null } = {
    1: parseStopwatchTimeMs(finishedCorners?.p1Blue),
    2: is2xMode ? parseStopwatchTimeMs(finishedCorners?.p2Red) : null,
  };

  const targetA = teamA.trim().toLowerCase();
  const targetB = teamB.trim().toLowerCase();
  let detectedLeg2Log = false;

  for (const log of matchLogs) {
    const info = extractFinishTimeFromStageLabel(log.stageLabel);
    if (!info) continue;
    if (info.leg === 2) detectedLeg2Log = true;

    const pn = (log.participantName || "").trim().toLowerCase();
    if (!pn) continue;

    if (targetA && pn === targetA) {
      if (legMsA[info.leg] === null || info.timeMs < legMsA[info.leg]!) {
        legMsA[info.leg] = info.timeMs;
      }
    } else if (targetB && pn === targetB) {
      if (legMsB[info.leg] === null || info.timeMs < legMsB[info.leg]!) {
        legMsB[info.leg] = info.timeMs;
      }
    }
  }

  const effectiveIs2x = is2xMode || detectedLeg2Log;
  const timesA = [legMsA[1], ...(effectiveIs2x ? [legMsA[2]] : [])].filter(
    (v): v is number => v !== null
  );
  const timesB = [legMsB[1], ...(effectiveIs2x ? [legMsB[2]] : [])].filter(
    (v): v is number => v !== null
  );

  const teamAFinishMs =
    timesA.length > 0 ? Math.min(...timesA) : null;
  const teamBFinishMs =
    timesB.length > 0 ? Math.min(...timesB) : null;

  const baseResult = {
    teamAFinishMs,
    teamBFinishMs,
    teamAFinishFormatted: formatStopwatchTimeMs(teamAFinishMs),
    teamBFinishFormatted: formatStopwatchTimeMs(teamBFinishMs),
    teamALeg1Formatted: formatStopwatchTimeMs(legMsA[1]),
    teamALeg2Formatted: effectiveIs2x ? formatStopwatchTimeMs(legMsA[2]) : null,
    teamBLeg1Formatted: formatStopwatchTimeMs(legMsB[1]),
    teamBLeg2Formatted: effectiveIs2x ? formatStopwatchTimeMs(legMsB[2]) : null,
    teamALegsFinished: timesA.length,
    teamBLegsFinished: timesB.length,
  };

  if (scoreA > scoreB) {
    return { ...baseResult, winner: "A", decidedBy: "score" };
  }
  if (scoreB > scoreA) {
    return { ...baseResult, winner: "B", decidedBy: "score" };
  }

  if (scoreA === 0 && scoreB === 0 && timesA.length === 0 && timesB.length === 0) {
    return { ...baseResult, winner: null, decidedBy: "tie" };
  }

  // Same points: take the fastest single-leg finish time across Putaran 1 or Putaran 2
  if (teamAFinishMs !== null && teamBFinishMs === null) {
    return { ...baseResult, winner: "A", decidedBy: "finish_time" };
  }
  if (teamBFinishMs !== null && teamAFinishMs === null) {
    return { ...baseResult, winner: "B", decidedBy: "finish_time" };
  }

  if (teamAFinishMs !== null && teamBFinishMs !== null && teamAFinishMs !== teamBFinishMs) {
    return {
      ...baseResult,
      winner: teamAFinishMs < teamBFinishMs ? "A" : "B",
      decidedBy: "finish_time",
    };
  }

  return { ...baseResult, winner: null, decidedBy: "tie" };
}

/**
 * Builds a lookup map from lowercased participant name to their fastest recorded finish duration.
 */
export function buildFastestFinishMap(
  logs: Array<Pick<PointLog, "participantName" | "stageLabel">>
): Record<string, FastestFinishEntry> {
  const map: Record<string, FastestFinishEntry> = {};

  for (const log of logs) {
    const pn = (log.participantName || "").trim().toLowerCase();
    if (!pn) continue;
    const info = extractFinishTimeFromStageLabel(log.stageLabel);
    if (!info) continue;

    const existing = map[pn];
    if (!existing || info.timeMs < existing.bestMs) {
      map[pn] = {
        bestMs: info.timeMs,
        bestFormatted: formatStopwatchTimeMs(info.timeMs) || info.timeStr,
      };
    }
  }

  return map;
}

/**
 * Looks up a participant's fastest recorded finish time in milliseconds (Infinity if none).
 */
export function getParticipantFastestFinishMs(
  participantName: string | undefined,
  fastestFinishMap: Record<string, FastestFinishEntry>
): number {
  const key = (participantName || "").trim().toLowerCase();
  if (!key) return Number.POSITIVE_INFINITY;
  return fastestFinishMap[key]?.bestMs ?? Number.POSITIVE_INFINITY;
}

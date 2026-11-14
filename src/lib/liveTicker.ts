import type { BracketMatch } from "@/data/mockCompetition";

export const DEFAULT_TICKER_TEXT = "Selamat datang di NEXT ARENA Tournament!";

export type LiveTickerMode = "default" | "welcome" | "leg1_result" | "finished";

export interface ScoreCategorySummaryItem {
  label: string;
  count: number;
  totalPts: number;
}

export function formatTickerScoreSummary(
  rows: ScoreCategorySummaryItem[]
): string {
  const parts = rows
    .filter((r) => r.count > 0 || r.totalPts !== 0)
    .map((r) => `${r.label} ${r.count}x (${r.totalPts > 0 ? `+${r.totalPts}` : r.totalPts})`);
  return parts.join(", ");
}

export function buildWelcomeMatchTicker(params: {
  matchLabel: string;
  round?: string;
  teamA: string;
  teamB: string;
  is2x?: boolean;
  leg?: 1 | 2;
  isSingle?: boolean;
}): string {
  const { matchLabel, teamA, teamB, is2x = false, leg = 1, isSingle = false } = params;
  const stageSuffix = is2x
    ? leg === 2
      ? `${matchLabel} • Putaran 2 (Tukar Sisi)`
      : `${matchLabel} • Putaran 1`
    : matchLabel;

  if (isSingle || teamB === "- (Tanding Tunggal)") {
    return `🔥 SELAMAT BERTANDING: TIM ${teamA} (${stageSuffix}) — Selamat bertanding & raih poin terbaik!`;
  }

  return `🔥 SELAMAT BERTANDING: TIM ${teamA} dan TIM ${teamB} (${stageSuffix}) — Selamat bertanding, junjung sportivitas & raih poin terbaik!`;
}

export function buildLeg1ResultTicker(params: {
  matchLabel: string;
  teamA: string;
  teamB: string;
  scoreALeg1: number;
  scoreBLeg1: number;
  isSingle?: boolean;
  summaryA?: string;
  summaryB?: string;
  finishTimeA?: string;
  finishTimeB?: string;
}): string {
  const {
    matchLabel,
    teamA,
    teamB,
    scoreALeg1,
    scoreBLeg1,
    isSingle = false,
    summaryA,
    summaryB,
    finishTimeA,
    finishTimeB,
  } = params;

  const detailA = [summaryA, finishTimeA ? `Finish ${finishTimeA}` : ""]
    .filter(Boolean)
    .join(" • ");
  const partA = `${teamA}: ${scoreALeg1} PTS${detailA ? ` [${detailA}]` : ""}`;

  if (isSingle || teamB === "- (Tanding Tunggal)") {
    return `🏁 HASIL DATA POIN PUTARAN 1 (${matchLabel}): ${partA} • Bersiap menuju Putaran 2 (Tukar Sisi)!`;
  }

  const detailB = [summaryB, finishTimeB ? `Finish ${finishTimeB}` : ""]
    .filter(Boolean)
    .join(" • ");
  const partB = `${teamB}: ${scoreBLeg1} PTS${detailB ? ` [${detailB}]` : ""}`;

  return `🏁 HASIL DATA POIN PUTARAN 1 (${matchLabel}): ${partA}  |  ${partB} • Bersiap menuju Putaran 2 (Tukar Sisi)!`;
}

export function buildMatchFinishedTicker(params: {
  matchLabel: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  winnerName?: string | null;
  isSingle?: boolean;
  finishTimeA?: string | null;
  finishTimeB?: string | null;
}): string {
  const {
    matchLabel,
    teamA,
    teamB,
    scoreA,
    scoreB,
    winnerName,
    isSingle = false,
    finishTimeA,
    finishTimeB,
  } = params;

  const textA = `${teamA}: ${scoreA} PTS${finishTimeA ? ` (⏱ ${finishTimeA})` : ""}`;
  if (isSingle || teamB === "- (Tanding Tunggal)") {
    return `🏆 HASIL AKHIR (${matchLabel}): ${textA} • Pertandingan Selesai!`;
  }

  const textB = `${teamB}: ${scoreB} PTS${finishTimeB ? ` (⏱ ${finishTimeB})` : ""}`;
  const resultLabel = winnerName ? `Pemenang: ${winnerName}` : "Hasil Seri";
  return `🏆 HASIL AKHIR (${matchLabel}): ${textA} vs ${textB} • ${resultLabel}!`;
}

export function resolveEffectiveTicker(params: {
  announcement?: string;
  liveTicker?: string;
  liveTickerMatchId?: string;
  liveTickerMode?: string;
  bracketMatches?: BracketMatch[];
}): { text: string; mode: LiveTickerMode } {
  const {
    announcement,
    liveTicker,
    liveTickerMatchId,
    liveTickerMode,
    bracketMatches,
  } = params;

  const fallbackText = (announcement || "").trim() || DEFAULT_TICKER_TEXT;
  const activeText = (liveTicker || "").trim();

  if (!activeText) {
    return { text: fallbackText, mode: "default" };
  }

  if (liveTickerMatchId && Array.isArray(bracketMatches) && bracketMatches.length > 0) {
    const linkedMatch = bracketMatches.find((m) => m.id === liveTickerMatchId);
    if (!linkedMatch || linkedMatch.status === "Selesai") {
      return { text: fallbackText, mode: "default" };
    }
  }

  const normalizedMode: LiveTickerMode =
    liveTickerMode === "welcome" ||
    liveTickerMode === "leg1_result" ||
    liveTickerMode === "finished"
      ? liveTickerMode
      : "welcome";

  return { text: activeText, mode: normalizedMode };
}

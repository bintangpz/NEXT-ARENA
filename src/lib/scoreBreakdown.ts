import type { BracketMatch, CustomPointRule, PointLog } from "@/data/mockCompetition";

export type ScoreRuleKey = "point" | "cekpoint" | "finish" | "bonus" | "retry";

export interface ScoreBreakdownCategory {
  key: ScoreRuleKey;
  label: string;
  fallbackPoints: number;
}

export interface ScoreBreakdownRow extends ScoreBreakdownCategory {
  rulePoints: number;
  count: number;
  totalPts: number;
}

export const SCORE_BREAKDOWN_CATEGORIES: ScoreBreakdownCategory[] = [
  { key: "point", label: "Point", fallbackPoints: 5 },
  { key: "cekpoint", label: "Cekpoint", fallbackPoints: 10 },
  { key: "finish", label: "Finish", fallbackPoints: 15 },
  { key: "bonus", label: "Bonus", fallbackPoints: 5 },
  { key: "retry", label: "Retry", fallbackPoints: -0.5 },
];

/**
 * Matches a log or rule label against one of the 5 standard scoring categories,
 * excluding surrender actions from Finish bonus counts.
 */
export function matchesScoreRuleKey(rawLabel: string | undefined, key: ScoreRuleKey): boolean {
  const al = (rawLabel || "").trim().toLowerCase();
  if (!al) return false;
  if (key === "point") return al === "point" || al === "poin" || /^(?:point|poin)\b/.test(al);
  if (key === "cekpoint") return al.includes("cekpoint") || al.includes("checkpoint");
  if (key === "finish") return al.includes("finish") && !al.includes("menyerah");
  if (key === "bonus") return al.includes("bonus");
  return al.includes("retry");
}

/**
 * Extracts match leg (Putaran 1 vs Putaran 2) from a PointLog stageLabel.
 */
export function getPointLogLeg(stageLabel: string | undefined): 1 | 2 {
  const raw = stageLabel || "";
  if (/\bP2[\s@)]/i.test(raw) || /Putaran\s*2/i.test(raw) || /Sesi\s*2/i.test(raw)) {
    return 2;
  }
  return 1;
}

/**
 * Filters tournament point logs that belong to a specific bracket match.
 */
export function filterLogsForBracketMatch(
  logs: PointLog[],
  match: BracketMatch | null
): PointLog[] {
  if (!match) return [];
  const mLabel = (match.matchLabel || "").trim().toLowerCase();
  const mId = (match.id || "").trim().toLowerCase();
  const teamA = (match.teamA || "").trim().toLowerCase();
  const teamB = (match.teamB || "").trim().toLowerCase();

  const escapedLabel = mLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const labelRegex = mLabel
    ? new RegExp(`(?:^|[\\s(])${escapedLabel}(?=$|[\\s)])`, "i")
    : null;

  return logs.filter((log) => {
    const sl = (log.stageLabel || "").toLowerCase();
    const pn = (log.participantName || "").trim().toLowerCase();

    if (labelRegex && labelRegex.test(sl)) return true;
    if (mId && sl.includes(mId)) return true;
    if ((pn === teamA || pn === teamB) && sl.includes("laga") && !/laga\s+\d+/i.test(sl)) {
      return true;
    }
    return false;
  });
}

/**
 * Computes per-category score counts and point subtotals for Team A or Team B
 * from bracket match point logs.
 */
export function computeMatchLogCategoryBreakdown(params: {
  logs: PointLog[];
  match: BracketMatch;
  is2xMode: boolean;
  legFilter: 1 | 2 | "all";
  team: "A" | "B";
  customPointRules?: CustomPointRule[];
}): ScoreBreakdownRow[] {
  const { logs, match, is2xMode, legFilter, team, customPointRules = [] } = params;
  const targetName = (team === "A" ? match.teamA : match.teamB || "").trim().toLowerCase();

  const teamLogs = logs.filter((log) => {
    const pn = (log.participantName || "").trim().toLowerCase();
    if (!targetName || pn !== targetName) return false;
    if (is2xMode && legFilter !== "all") {
      return getPointLogLeg(log.stageLabel) === legFilter;
    }
    return true;
  });

  return SCORE_BREAKDOWN_CATEGORIES.map((cat) => {
    const matchedRule = customPointRules.find((r) => matchesScoreRuleKey(r.label, cat.key));
    const rulePoints = matchedRule ? matchedRule.points : cat.fallbackPoints;

    const categoryLogs = teamLogs.filter((log) => {
      const cleanAction = (log.stageLabel || "").replace(/\s*\(Laga[^)]*\)/gi, "").trim();
      return matchesScoreRuleKey(cleanAction, cat.key);
    });

    const count = categoryLogs.length;
    const totalPts = Number(
      categoryLogs.reduce((sum, item) => sum + (Number(item.delta) || 0), 0).toFixed(2)
    );

    return {
      ...cat,
      rulePoints,
      count,
      totalPts,
    };
  });
}

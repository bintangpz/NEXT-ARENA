import type { TournamentStage } from "@/data/mockCompetition";

/**
 * Checks whether a bracket match's opponent slot represents a solo / odd-team match (no live opponent).
 */
export function isSingleMatchTeamB(teamB?: string | null): boolean {
  const normalized = (teamB ?? "").trim();
  return (
    normalized === "" ||
    normalized === "-" ||
    normalized === "- (Tanding Tunggal)" ||
    normalized.toUpperCase() === "BYE"
  );
}

/**
 * Resolves the match turns ("1x" or "2x") for a round name using configured stages first,
 * then the roundMatchTurns map, with standard round name fallbacks.
 */
export function resolveRoundTurns(
  roundName: string | undefined,
  stages: Pick<TournamentStage, "name" | "turns">[] = [],
  roundMatchTurns: Record<string, "1x" | "2x"> = {},
  fallback: "1x" | "2x" = "1x"
): "1x" | "2x" {
  const target = (roundName || "").trim();
  if (!target) return fallback;

  const stageObj = stages.find((st) => st.name === target);
  if (stageObj) return stageObj.turns === "2x" ? "2x" : "1x";

  if (roundMatchTurns[target]) return roundMatchTurns[target];
  if (target.includes("Penyisihan") || target.includes("16 Besar")) {
    return roundMatchTurns["Babak Penyisihan"] || "2x";
  }
  if (target.includes("8 Besar")) {
    return roundMatchTurns["Babak 8 Besar"] || "1x";
  }
  if (target.includes("Semifinal")) {
    return roundMatchTurns["Babak Semifinal"] || "1x";
  }
  if (target.includes("Final")) {
    return roundMatchTurns["Babak Final"] || roundMatchTurns["Babak Semifinal"] || "1x";
  }
  return fallback;
}

/**
 * Merges stage turns from `round_match_turns` and `tournament_stages` settings,
 * letting canonical stage entries override stale legacy `round_match_turns` values.
 */
export function mergeStageTurnsMap(
  stagesRaw: unknown,
  roundMatchTurnsRaw: unknown
): Record<string, "1x" | "2x"> {
  const merged: Record<string, "1x" | "2x"> = {};
  const parseJson = (val: unknown) => {
    if (!val) return null;
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    }
    return val;
  };

  const turnsObj = parseJson(roundMatchTurnsRaw);
  if (turnsObj && typeof turnsObj === "object" && !Array.isArray(turnsObj)) {
    for (const [k, v] of Object.entries(turnsObj)) {
      if (v === "1x" || v === "2x") {
        merged[k] = v;
      }
    }
  }

  const stages = parseJson(stagesRaw);
  if (Array.isArray(stages)) {
    for (const st of stages) {
      if (st && typeof st.name === "string" && (st.turns === "1x" || st.turns === "2x")) {
        merged[st.name] = st.turns;
      }
    }
  }

  return merged;
}

/**
 * Formats the match mode summary badge text so solo matches clearly retain 1x vs 2x format info.
 */
export function formatMatchModeLabel(isSingle: boolean, is2x: boolean): string {
  if (isSingle) {
    return is2x
      ? "1 Tim (Tanding Tunggal) • 2x Main (Tukar Sisi)"
      : "1 Tim (Tanding Tunggal) • 1x Main";
  }
  return is2x ? "2x Main (Tukar Sisi)" : "1x Main (Langsung Data)";
}

/**
 * Returns whether the given arena corner ("red" | "blue") holds an active participant in a solo match.
 * In 1x mode, the solo participant plays in Red. In 2x mode, they play Red in P1 and swap to Blue in P2.
 */
export function isActiveSoloCorner(
  corner: "red" | "blue",
  leg: 1 | 2,
  is2x: boolean
): boolean {
  if (!is2x) return corner === "red";
  return leg === 1 ? corner === "red" : corner === "blue";
}

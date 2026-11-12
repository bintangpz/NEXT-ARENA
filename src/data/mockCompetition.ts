export type ParticipantStatus = "Finalis" | "Aktif" | "Gugur";

export type CompetitionCategory = string;

export interface RoundScores {
  babak1: number; // Penyisihan / Kualifikasi (Max 1000)
  babak2: number; // Semifinal / Challenge (Max 1000)
  babak3: number; // Grand Final & Kriteria Juri (Max 1000)
}

export interface JudgingCriteria {
  teknis: number; // Bobot 0 - 250
  inovasi: number; // Bobot 0 - 250
  kecepatan: number; // Bobot 0 - 250
  presentasi: number; // Bobot 0 - 250
}

export interface TeamMember {
  name: string;
  role: string;
}

export interface Participant {
  id: string;
  code: string;
  name: string;
  institution: string;
  city: string;
  category: CompetitionCategory;
  status: ParticipantStatus;
  currentStageIdx?: number;
  scores: RoundScores;
  criteria: JudgingCriteria;
  members: TeamMember[];
  totalPoints: number;
  previousRank: number;
  lastUpdated: string;
  avatarColor: string;
}

export interface PointLog {
  id: string;
  participantId?: string;
  participantName: string;
  category: CompetitionCategory;
  delta: number;
  stageLabel: string;
  timestamp: string;
}

export type CustomPointType = "bonus" | "penalty" | "objective" | "custom";
export type CustomPointColor = "emerald" | "rose" | "amber" | "blue" | "purple" | "cyan" | "orange";

export interface CustomPointRule {
  id: string;
  label: string;
  points: number; // nilai poin positif (misal +50) atau negatif (misal -25)
  type: CustomPointType;
  color: CustomPointColor;
  description?: string;
  enabled: boolean;
  hotkeyRed?: string; // Hotkey Keyboard Sudut Merah (Tim A), misal "Q"
  hotkeyBlue?: string; // Hotkey Keyboard Sudut Biru (Tim B), misal "U"
}

export interface TournamentStage {
  id: string;
  name: string;
  model: "ranking" | "gugur"; // HANYA 2 MODEL: Ranking vs Gugur
  turns: "1x" | "2x"; // HANYA 2 FORMAT: 1x Main vs 2x Main (Tukar Sisi)
  resetPoints?: boolean; // true = reset skor ke 0 di babak ini (default); false = bawa poin (carry over) dari babak sebelumnya
}

export const DEFAULT_TOURNAMENT_STAGES: TournamentStage[] = [
  {
    id: "stage-penyisihan",
    name: "Babak Penyisihan",
    model: "ranking",
    turns: "2x",
    resetPoints: true,
  },
  {
    id: "stage-8besar",
    name: "Babak 8 Besar",
    model: "gugur",
    turns: "1x",
    resetPoints: true,
  },
  {
    id: "stage-semifinal",
    name: "Babak Semifinal",
    model: "gugur",
    turns: "1x",
    resetPoints: true,
  },
  {
    id: "stage-final",
    name: "Babak Final",
    model: "gugur",
    turns: "1x",
    resetPoints: true,
  },
];

/**
 * Returns true if the stage resets points to 0, or false if it carries over previous points.
 * Defaults to true if undefined, null, or any non-false value.
 */
export function isStageResetPoints(stage?: TournamentStage | null): boolean {
  if (!stage) return true;
  if (stage.resetPoints === false) return false;
  if ((stage as any).reset_points === false) return false;
  if ((stage as any).pointResetBehavior === "carry_over") return false;
  return true; // Default: reset ke 0
}

/**
 * Resolves the 0-based index of a stage given an activeRound identifier or name.
 */
export function resolveStageIndex(activeRound: string | undefined, stages: TournamentStage[]): number {
  if (!stages || stages.length === 0) return 0;
  if (!activeRound) return 0;

  // 1. Match by exact id
  const idxById = stages.findIndex((s) => s.id === activeRound);
  if (idxById >= 0) return idxById;

  // 2. Match by exact name
  const idxByName = stages.findIndex((s) => s.name.toLowerCase() === activeRound.toLowerCase());
  if (idxByName >= 0) return idxByName;

  // 3. Match legacy "babak1", "babak2", "babak3"
  if (activeRound === "babak1") return 0;
  if (activeRound === "babak2") return Math.min(1, stages.length - 1);
  if (activeRound === "babak3") return Math.min(2, stages.length - 1);

  // 4. Match partial name
  const lower = activeRound.toLowerCase();
  const partialIdx = stages.findIndex((s) => {
    const sName = s.name.toLowerCase();
    return sName.includes(lower) || lower.includes(sName);
  });
  if (partialIdx >= 0) return partialIdx;

  return 0;
}

/**
 * Resolves which score column key maps to a given stage index.
 */
export function getStageScoreColumnKey(stageIndex: number): "babak1" | "babak2" | "babak3" {
  if (stageIndex === 0) return "babak1";
  if (stageIndex === 1) return "babak2";
  return "babak3";
}

/**
 * Resolves the raw score earned specifically in a given stage index.
 * Stage index takes precedence over name heuristics to prevent multi-group
 * stages (e.g. "Penyisihan Grup B" at stageIndex 1) from reading incorrect rounds.
 */
export function getParticipantStageRawScore(
  scores: { babak1?: number; babak2?: number; babak3?: number },
  stageIndex: number,
  stage?: TournamentStage
): number {
  if (!scores) return 0;
  if (stageIndex === 0) return Number(scores.babak1 || 0);
  if (stageIndex === 1) return Number(scores.babak2 || 0);
  if (stageIndex === 2) return Number(scores.babak3 || 0);
  if (stageIndex >= 3) return Number(scores.babak3 || 0);

  const name = (stage?.name || "").toLowerCase();
  if (name.includes("penyisihan") || name.includes("kualifikasi")) {
    return Number(scores.babak1 || 0);
  }
  if (name.includes("8 besar") || name.includes("perempat")) {
    return Number(scores.babak2 || 0);
  }
  return Number(scores.babak3 || 0);
}

/**
 * Calculates a participant's effective score in a target stage, taking into account
 * the stage-level resetPoints configuration for all stages up to targetStageIndex.
 * - Stage 0: starts from 0 (effective score = raw score of stage 0).
 * - Stage k > 0:
 *   - If resetPoints !== false (default): score starts from 0 (effective score = raw score of stage k).
 *   - If resetPoints === false: score carries over (effective score = accumulated score up to stage k-1 + raw score of stage k).
 *   - In 4-stage tournaments where both Stage 2 (Semifinal) and Stage 3 (Final) share babak3:
 *     If Stage 3 is set to carry over from Stage 2 (resetPoints: false), avoid double-adding
 *     scores.babak3 if Stage 2 already mapped to scores.babak3.
 */
export function calculateParticipantScoreInStage(
  scores: { babak1?: number; babak2?: number; babak3?: number },
  targetStageIndex: number,
  stages: TournamentStage[]
): number {
  if (!stages || stages.length === 0 || targetStageIndex < 0) {
    return Number(scores.babak1 || 0) + Number(scores.babak2 || 0) + Number(scores.babak3 || 0);
  }

  const boundedIndex = Math.min(targetStageIndex, stages.length - 1);
  let accumulated = 0;
  const usedColumnsInRun = new Set<string>();

  for (let i = 0; i <= boundedIndex; i++) {
    const stage = stages[i];
    const raw = getParticipantStageRawScore(scores, i, stage);
    const colKey = getStageScoreColumnKey(i);

    if (i === 0 || isStageResetPoints(stage)) {
      // Resets to 0 for this stage, so effective points start fresh with this stage's score
      accumulated = raw;
      usedColumnsInRun.clear();
      usedColumnsInRun.add(colKey);
    } else {
      // Carries over previous accumulated points
      // If this stage shares the same raw column as an already accumulated stage in this run,
      // avoid double-adding the same static column value.
      if (!usedColumnsInRun.has(colKey)) {
        accumulated += raw;
        usedColumnsInRun.add(colKey);
      }
    }
  }

  return accumulated;
}

export const DEFAULT_POINT_RULES: CustomPointRule[] = [
  {
    id: "rule-bonus-cepat",
    label: "point",
    points: 5,
    type: "bonus",
    color: "emerald",
    description: "Poin standar rintangan / lintasan arena",
    enabled: true,
    hotkeyRed: "Q",
    hotkeyBlue: "U",
  },
  {
    id: "rule-penalti-koreksi",
    label: "Retry",
    points: -0.5,
    type: "penalty",
    color: "rose",
    description: "Pelanggaran jalur / sentuhan obstacle arena",
    enabled: true,
    hotkeyRed: "W",
    hotkeyBlue: "I",
  },
  {
    id: "rule-bonus-objektif",
    label: "Cekpoint",
    points: 10,
    type: "bonus",
    color: "emerald",
    description: "Melewati pos cekpoint arena",
    enabled: true,
    hotkeyRed: "E",
    hotkeyBlue: "O",
  },
  {
    id: "rule-lap-sempurna",
    label: "FINISH",
    points: 15,
    type: "bonus",
    color: "emerald",
    description: "Robot berhasil mencapai garis finish",
    enabled: true,
    hotkeyRed: "R",
    hotkeyBlue: "P",
  },
  {
    id: "rule-bonus-ekstra",
    label: "Bonus",
    points: 5,
    type: "bonus",
    color: "emerald",
    description: "Bonus tugas khusus",
    enabled: true,
    hotkeyRed: "T",
    hotkeyBlue: "[",
  },
];

export const POINT_COLOR_MAP: Record<
  CustomPointColor,
  {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    pillBg: string;
    glow: string;
    label: string;
    dotBg: string;
  }
> = {
  emerald: {
    bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
    border: "border-emerald-500/30 hover:border-emerald-500/50",
    text: "text-emerald-400",
    badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    pillBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    label: "Emerald (Hijau)",
    dotBg: "bg-emerald-400",
  },
  rose: {
    bg: "bg-rose-500/10 hover:bg-rose-500/20",
    border: "border-rose-500/30 hover:border-rose-500/50",
    text: "text-rose-400",
    badgeBg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    pillBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    glow: "shadow-[0_0_20px_rgba(244,63,94,0.15)]",
    label: "Rose (Merah)",
    dotBg: "bg-rose-400",
  },
  amber: {
    bg: "bg-amber-500/10 hover:bg-amber-500/20",
    border: "border-amber-500/30 hover:border-amber-500/50",
    text: "text-amber-400",
    badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    pillBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
    label: "Amber (Kuning Emas)",
    dotBg: "bg-amber-400",
  },
  blue: {
    bg: "bg-blue-500/10 hover:bg-blue-500/20",
    border: "border-blue-500/30 hover:border-blue-500/50",
    text: "text-blue-400",
    badgeBg: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    pillBg: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]",
    label: "Blue (Biru)",
    dotBg: "bg-blue-400",
  },
  purple: {
    bg: "bg-purple-500/10 hover:bg-purple-500/20",
    border: "border-purple-500/30 hover:border-purple-500/50",
    text: "text-purple-400",
    badgeBg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    pillBg: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.15)]",
    label: "Purple (Ungu)",
    dotBg: "bg-purple-400",
  },
  cyan: {
    bg: "bg-cyan-500/10 hover:bg-cyan-500/20",
    border: "border-cyan-500/30 hover:border-cyan-500/50",
    text: "text-cyan-400",
    badgeBg: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    pillBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    glow: "shadow-[0_0_20px_rgba(6,182,212,0.15)]",
    label: "Cyan (Toska)",
    dotBg: "bg-cyan-400",
  },
  orange: {
    bg: "bg-orange-500/10 hover:bg-orange-500/20",
    border: "border-orange-500/30 hover:border-orange-500/50",
    text: "text-orange-400",
    badgeBg: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    pillBg: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.15)]",
    label: "Orange (Oranye)",
    dotBg: "bg-orange-400",
  },
};

export interface BracketMatch {
  id: string;
  round: "Babak 16 Besar" | "Perempat Final" | "Semifinal" | "Grand Final" | string;
  matchLabel: string;
  category: string;
  teamA: string;
  teamACode: string;
  scoreA: number;
  teamB: string;
  teamBCode: string;
  scoreB: number;
  status: "Selesai" | "Berlangsung" | "Siap Tanding" | "Menunggu" | "Mendatang" | string;
  winner?: "A" | "B";
  currentLeg?: number;
  scoreALeg1?: number;
  scoreBLeg1?: number;
  scoreALeg2?: number;
  scoreBLeg2?: number;
}

export const CATEGORIES: CompetitionCategory[] = [
  "Cyber Security & CTF",
  "AI & Smart System",
  "UI/UX Digital Product",
  "E-Sports Tactical",
];

export const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: "nxt-01",
    code: "NXT-104",
    name: "Garuda Cyber Force",
    institution: "Institut Teknologi Bandung (ITB)",
    city: "Bandung",
    category: "Cyber Security & CTF",
    status: "Finalis",
    scores: { babak1: 920, babak2: 950, babak3: 890 },
    criteria: { teknis: 240, inovasi: 220, kecepatan: 225, presentasi: 205 },
    members: [
      { name: "Raka Mahendra", role: "Team Captain & Exploit Lead" },
      { name: "Nadia Putri S.", role: "Reverse Engineer" },
      { name: "Dimas Pratama", role: "Network Forensics" },
    ],
    totalPoints: 2760,
    previousRank: 2,
    lastUpdated: "Baru saja",
    avatarColor: "from-yellow-400 to-orange-500",
  },
  {
    id: "nxt-02",
    code: "NXT-112",
    name: "Aetherion Neural Lab",
    institution: "Universitas Indonesia (UI)",
    city: "Depok",
    category: "AI & Smart System",
    status: "Finalis",
    scores: { babak1: 940, babak2: 895, babak3: 880 },
    criteria: { teknis: 230, inovasi: 235, kecepatan: 205, presentasi: 210 },
    members: [
      { name: "Kevin Sanjaya W.", role: "AI Lead Architect" },
      { name: "Farah Azzahra", role: "ML Ops & Data Scientist" },
      { name: "Bagas Adi", role: "Embedded Systems" },
    ],
    totalPoints: 2715,
    previousRank: 1,
    lastUpdated: "3 menit lalu",
    avatarColor: "from-orange-500 to-red-500",
  },
  {
    id: "nxt-03",
    code: "NXT-108",
    name: "Nusantara Visionary",
    institution: "Universitas Gadjah Mada (UGM)",
    city: "Yogyakarta",
    category: "UI/UX Digital Product",
    status: "Finalis",
    scores: { babak1: 880, babak2: 910, babak3: 865 },
    criteria: { teknis: 205, inovasi: 230, kecepatan: 205, presentasi: 225 },
    members: [
      { name: "Alya Maharani", role: "Lead Product Designer" },
      { name: "Reza Kurniawan", role: "UX Researcher" },
      { name: "Shinta Dewi", role: "Interaction & Prototype" },
    ],
    totalPoints: 2655,
    previousRank: 4,
    lastUpdated: "5 menit lalu",
    avatarColor: "from-amber-400 to-red-500",
  },
  {
    id: "nxt-04",
    code: "NXT-119",
    name: "Valkyrie Syndicate",
    institution: "Institut Teknologi Sepuluh Nopember (ITS)",
    city: "Surabaya",
    category: "E-Sports Tactical",
    status: "Finalis",
    scores: { babak1: 890, babak2: 870, babak3: 840 },
    criteria: { teknis: 220, inovasi: 205, kecepatan: 220, presentasi: 195 },
    members: [
      { name: "Rizky Darmawan", role: "In-Game Leader (IGL)" },
      { name: "Fajar Nugroho", role: "Tactical Entry" },
      { name: "Daffa Ramadhan", role: "Support & Recon" },
    ],
    totalPoints: 2600,
    previousRank: 3,
    lastUpdated: "8 menit lalu",
    avatarColor: "from-red-500 to-rose-600",
  },
  {
    id: "nxt-05",
    code: "NXT-125",
    name: "ZeroDay Borneo",
    institution: "Universitas Mulawarman",
    city: "Samarinda",
    category: "Cyber Security & CTF",
    status: "Finalis",
    scores: { babak1: 845, babak2: 880, babak3: 790 },
    criteria: { teknis: 210, inovasi: 195, kecepatan: 200, presentasi: 185 },
    members: [
      { name: "Hendra Wijaya", role: "Cryptography Specialist" },
      { name: "Putri Lestari", role: "Web Exploitation" },
      { name: "Arif Rahman", role: "Binary Pwn" },
    ],
    totalPoints: 2515,
    previousRank: 6,
    lastUpdated: "11 menit lalu",
    avatarColor: "from-orange-400 to-amber-600",
  },
  {
    id: "nxt-06",
    code: "NXT-131",
    name: "Krakatau AI Collective",
    institution: "BINUS University",
    city: "Jakarta",
    category: "AI & Smart System",
    status: "Aktif",
    scores: { babak1: 860, babak2: 830, babak3: 755 },
    criteria: { teknis: 195, inovasi: 200, kecepatan: 180, presentasi: 180 },
    members: [
      { name: "Jason Alexander", role: "Computer Vision Lead" },
      { name: "Clarissa Tan", role: "NLP Engineer" },
      { name: "Samuel Putra", role: "Backend Integrator" },
    ],
    totalPoints: 2445,
    previousRank: 5,
    lastUpdated: "15 menit lalu",
    avatarColor: "from-yellow-500 to-orange-600",
  },
  {
    id: "nxt-07",
    code: "NXT-140",
    name: "PixelCraft Dewata",
    institution: "Universitas Udayana",
    city: "Denpasar",
    category: "UI/UX Digital Product",
    status: "Aktif",
    scores: { babak1: 820, babak2: 840, babak3: 710 },
    criteria: { teknis: 175, inovasi: 185, kecepatan: 170, presentasi: 180 },
    members: [
      { name: "Made Arya Wiguna", role: "Design System Lead" },
      { name: "Ni Luh Saraswati", role: "Product Strategist" },
      { name: "Komang Adi", role: "Motion UI" },
    ],
    totalPoints: 2370,
    previousRank: 7,
    lastUpdated: "18 menit lalu",
    avatarColor: "from-red-400 to-orange-500",
  },
  {
    id: "nxt-08",
    code: "NXT-144",
    name: "Phinisi Quantums",
    institution: "Universitas Hasanuddin (UNHAS)",
    city: "Makassar",
    category: "E-Sports Tactical",
    status: "Aktif",
    scores: { babak1: 795, babak2: 815, babak3: 690 },
    criteria: { teknis: 180, inovasi: 170, kecepatan: 175, presentasi: 165 },
    members: [
      { name: "Andi Makkasau", role: "Team Captain" },
      { name: "Fadli Hasan", role: "Strategist" },
      { name: "Ikhsan Nur", role: "Anchor" },
    ],
    totalPoints: 2300,
    previousRank: 9,
    lastUpdated: "22 menit lalu",
    avatarColor: "from-amber-500 to-yellow-500",
  },
  {
    id: "nxt-09",
    code: "NXT-152",
    name: "Telkom Sentinel X",
    institution: "Telkom University",
    city: "Bandung",
    category: "Cyber Security & CTF",
    status: "Aktif",
    scores: { babak1: 810, babak2: 780, babak3: 650 },
    criteria: { teknis: 175, inovasi: 160, kecepatan: 165, presentasi: 150 },
    members: [
      { name: "Gilang Ramadhan", role: "Red Team Lead" },
      { name: "Salsabila Nur", role: "SOC Analyst" },
      { name: "Taufik Hidayat", role: "Cloud Security" },
    ],
    totalPoints: 2240,
    previousRank: 8,
    lastUpdated: "27 menit lalu",
    avatarColor: "from-orange-500 to-red-600",
  },
  {
    id: "nxt-10",
    code: "NXT-160",
    name: "Sriwijaya Neural",
    institution: "Universitas Sriwijaya",
    city: "Palembang",
    category: "AI & Smart System",
    status: "Gugur",
    scores: { babak1: 740, babak2: 680, babak3: 0 },
    criteria: { teknis: 0, inovasi: 0, kecepatan: 0, presentasi: 0 },
    members: [
      { name: "M. Alfarizi", role: "Data Engineer" },
      { name: "Rina Oktarina", role: "Researcher" },
    ],
    totalPoints: 1420,
    previousRank: 10,
    lastUpdated: "1 jam lalu",
    avatarColor: "from-zinc-500 to-zinc-700",
  },
];

export const INITIAL_LOGS: PointLog[] = [
  {
    id: "log-1",
    participantId: "nxt-01",
    participantName: "Garuda Cyber Force",
    category: "Cyber Security & CTF",
    delta: 150,
    stageLabel: "Babak 3 (Grand Final Flag Capture)",
    timestamp: "Baru saja",
  },
  {
    id: "log-2",
    participantId: "nxt-03",
    participantName: "Nusantara Visionary",
    category: "UI/UX Digital Product",
    delta: 95,
    stageLabel: "Penilaian Juri Pitching",
    timestamp: "5 menit lalu",
  },
  {
    id: "log-3",
    participantId: "nxt-05",
    participantName: "ZeroDay Borneo",
    category: "Cyber Security & CTF",
    delta: 110,
    stageLabel: "Defense Bonus Point",
    timestamp: "11 menit lalu",
  },
];

export const INITIAL_BRACKET_MATCHES: BracketMatch[] = [
  {
    id: "m-qf1",
    round: "Perempat Final",
    matchLabel: "Match QF-01",
    category: "All-Star Arena",
    teamA: "Garuda Cyber Force",
    teamACode: "NXT-104",
    scoreA: 950,
    teamB: "Phinisi Quantums",
    teamBCode: "NXT-144",
    scoreB: 815,
    status: "Selesai",
    winner: "A",
  },
  {
    id: "m-qf2",
    round: "Perempat Final",
    matchLabel: "Match QF-02",
    category: "All-Star Arena",
    teamA: "Valkyrie Syndicate",
    teamACode: "NXT-119",
    scoreA: 870,
    teamB: "ZeroDay Borneo",
    teamBCode: "NXT-125",
    scoreB: 855,
    status: "Selesai",
    winner: "A",
  },
  {
    id: "m-qf3",
    round: "Perempat Final",
    matchLabel: "Match QF-03",
    category: "All-Star Arena",
    teamA: "Aetherion Neural Lab",
    teamACode: "NXT-112",
    scoreA: 895,
    teamB: "PixelCraft Dewata",
    teamBCode: "NXT-140",
    scoreB: 840,
    status: "Selesai",
    winner: "A",
  },
  {
    id: "m-qf4",
    round: "Perempat Final",
    matchLabel: "Match QF-04",
    category: "All-Star Arena",
    teamA: "Nusantara Visionary",
    teamACode: "NXT-108",
    scoreA: 910,
    teamB: "Krakatau AI Collective",
    teamBCode: "NXT-131",
    scoreB: 830,
    status: "Selesai",
    winner: "A",
  },
  {
    id: "m-sf1",
    round: "Semifinal",
    matchLabel: "Semifinal A",
    category: "Upper Bracket",
    teamA: "Garuda Cyber Force",
    teamACode: "NXT-104",
    scoreA: 945,
    teamB: "Valkyrie Syndicate",
    teamBCode: "NXT-119",
    scoreB: 880,
    status: "Selesai",
    winner: "A",
  },
  {
    id: "m-sf2",
    round: "Semifinal",
    matchLabel: "Semifinal B",
    category: "Lower Bracket",
    teamA: "Aetherion Neural Lab",
    teamACode: "NXT-112",
    scoreA: 920,
    teamB: "Nusantara Visionary",
    teamBCode: "NXT-108",
    scoreB: 895,
    status: "Selesai",
    winner: "A",
  },
  {
    id: "m-gf1",
    round: "Grand Final",
    matchLabel: "GRAND FINAL CHAMPIONSHIP",
    category: "Main Stage Arena",
    teamA: "Garuda Cyber Force",
    teamACode: "NXT-104",
    scoreA: 2760,
    teamB: "Aetherion Neural Lab",
    teamBCode: "NXT-112",
    scoreB: 2715,
    status: "Berlangsung",
    winner: "A",
  },
];

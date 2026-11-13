"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArenaShutterTransition } from "@/components/ArenaShutterTransition";
import {
  Trophy,
  Users,
  Flame,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit3,
  History,
  Building2,
  Zap,
  Download,
  Megaphone,
  GitBranch,
  ClipboardCheck,
  LayoutDashboard,
  Eye,
  Printer,
  Crown,
  Sliders,
  Trash2,
  FolderPlus,
  Plus,
  Settings,
  RefreshCw,
  Timer,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  StopCircle,
  Clock,
  Volume2,
  VolumeX,
  ChevronDown,
  ArrowLeftRight,
  ArrowRight,
  ScrollText,
  X,
  Swords,
} from "lucide-react";
import { ArenaLogo } from "@/components/ArenaLogo";
import { playSound, stopSound, stopAllSounds } from "@/lib/soundEffects";
import {
  BracketMatch,
  CATEGORIES as DEFAULT_CATEGORIES,
  CompetitionCategory,
  INITIAL_BRACKET_MATCHES,
  INITIAL_LOGS,
  INITIAL_PARTICIPANTS,
  JudgingCriteria,
  Participant,
  ParticipantStatus,
  PointLog,
  CustomPointRule,
  DEFAULT_POINT_RULES,
  POINT_COLOR_MAP,
  TournamentStage,
  DEFAULT_TOURNAMENT_STAGES,
  isStageResetPoints,
  resolveStageIndex,
  calculateParticipantScoreInStage,
  getParticipantStageRawScore,
} from "@/data/mockCompetition";
import {
  ParticipantDetailModal,
  ParticipantEditModal,
  SpotlightModal,
  ViewRankingModal,
  ConfirmModal,
} from "@/components/modals";

export default function NextArenaDashboard() {
  const router = useRouter();
  // Core Data State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categories, setCategories] = useState<CompetitionCategory[]>(DEFAULT_CATEGORIES);
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
  const [selectedBracketRound, setSelectedBracketRound] = useState<string>(() => DEFAULT_TOURNAMENT_STAGES[0]?.name || "Babak 1");
  const [shutterMatch, setShutterMatch] = useState<BracketMatch | null>(null);
  const [announcement, setAnnouncement] = useState<string>(
    "🔥 LIVE ARENA: Babak 3 Grand Final sedang berlangsung! Selamat bertanding seluruh tim finalis."
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<"leaderboard" | "bracket" | "judging">("bracket");

  // Filters & Sorting
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua Kategori");
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua Status");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"total" | "babak3" | "babak2" | "babak1" | "name">("total");
  const [selectedLeaderboardStage, setSelectedLeaderboardStage] = useState<number | "all">(0);
  const [showAllInStage, setShowAllInStage] = useState<boolean>(false);

  // Modals State (Modular)
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [detailParticipantId, setDetailParticipantId] = useState<string | null>(null);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState<boolean>(false);
  const [isViewRankingOpen, setIsViewRankingOpen] = useState<boolean>(false);
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null);
  const [isBigTimerOpen, setIsBigTimerOpen] = useState<boolean>(false);
  const [viewLogMatch, setViewLogMatch] = useState<BracketMatch | null>(null);
  const [resetMatchTarget, setResetMatchTarget] = useState<BracketMatch | null>(null);
  const [resetWithLogs, setResetWithLogs] = useState<boolean>(true);
  const [dashboardLogViewMode, setDashboardLogViewMode] = useState<"split" | "p1" | "p2" | "all">("split");

  // Babak, Model & Timer States
  const [tournamentStages, setTournamentStages] = useState<TournamentStage[]>(DEFAULT_TOURNAMENT_STAGES);
  const [roundTitle, setRoundTitle] = useState<string>("BABAK 1 • PENYISIHAN");
  const [stageModel, setStageModel] = useState<string>("klasemen");
  const [activeRound, setActiveRound] = useState<string>("babak1");
  const [matchTurns, setMatchTurns] = useState<"1x" | "2x">("2x");
  const [roundMatchTurns, setRoundMatchTurns] = useState<Record<string, "1x" | "2x">>({
    "Babak Penyisihan": "2x",
    "Babak 8 Besar": "1x",
    "Babak Semifinal": "1x",
    "Babak Final": "1x",
  });

  const activeStageIndex = useMemo(() => {
    return resolveStageIndex(activeRound, tournamentStages);
  }, [activeRound, tournamentStages]);

  const activeStage = useMemo(() => {
    return tournamentStages[activeStageIndex] || tournamentStages[0];
  }, [tournamentStages, activeStageIndex]);

  const isActiveStageReset = useMemo(() => {
    return isStageResetPoints(activeStage);
  }, [activeStage]);

  const getMatchTurnsForRound = (roundName?: string): "1x" | "2x" => {
    const target = roundName || selectedBracketRound;
    const stageObj = tournamentStages.find((st) => st.name === target);
    if (stageObj) return stageObj.turns;
    if (roundMatchTurns[target]) return roundMatchTurns[target];
    if (target.includes("Penyisihan") || target.includes("16 Besar")) return roundMatchTurns["Babak Penyisihan"] || "2x";
    if (target.includes("8 Besar")) return roundMatchTurns["Babak 8 Besar"] || "1x";
    if (target.includes("Semifinal")) return roundMatchTurns["Babak Semifinal"] || "1x";
    if (target.includes("Final")) return roundMatchTurns["Babak Final"] || roundMatchTurns["Babak Semifinal"] || "1x";
    return matchTurns || "1x";
  };

  const currentBracketStageIdx = useMemo(() => {
    const idx = tournamentStages.findIndex((s) => s.name === selectedBracketRound);
    return idx >= 0 ? idx : 0;
  }, [tournamentStages, selectedBracketRound]);

  const qualifiedBracketParticipants = useMemo(() => {
    if (currentBracketStageIdx === 0) {
      return participants.filter((p) => p.status !== "Gugur");
    }
    return participants.filter(
      (p) => (p.currentStageIdx ?? 0) >= currentBracketStageIdx && p.status !== "Gugur"
    );
  }, [participants, currentBracketStageIdx]);
  const [timerMode, setTimerMode] = useState<string>("stopwatch");
  const [timerPhase, setTimerPhase] = useState<"idle" | "preparation" | "prep_ended" | "countdown" | "match" | "paused" | "finished">("idle");
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerStartedAt, setTimerStartedAt] = useState<number>(0);
  const [timerBaseSeconds, setTimerBaseSeconds] = useState<number>(0);
  const [prepDuration, setPrepDuration] = useState<number>(60);
  const [matchLimit, setMatchLimit] = useState<number>(300);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [showTimerOnMonitor, setShowTimerOnMonitor] = useState<boolean>(true);

  // Audio Custom Sounds & Volumes on Monitor
  const [soundPrepUrl, setSoundPrepUrl] = useState<string>("");
  const [soundCountdownUrl, setSoundCountdownUrl] = useState<string>("");
  const [soundStartUrl, setSoundStartUrl] = useState<string>("");
  const [soundFinishUrl, setSoundFinishUrl] = useState<string>("");
  const [soundVolume, setSoundVolume] = useState<number>(0.8);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [soundPrepLoop, setSoundPrepLoop] = useState<boolean>(true);
  const [soundCountdownLoop, setSoundCountdownLoop] = useState<boolean>(false);
  const [soundStartLoop, setSoundStartLoop] = useState<boolean>(false);
  const [soundFinishLoop, setSoundFinishLoop] = useState<boolean>(false);

  // Custom Point Rules State (Menu Point Kustom)
  const [customPointRules, setCustomPointRules] = useState<CustomPointRule[]>(DEFAULT_POINT_RULES);
  const [activePointMenuId, setActivePointMenuId] = useState<string | null>(null);
  const [pointToast, setPointToast] = useState<{ message: string; isPositive: boolean } | null>(null);

  const showPointToast = (message: string, isPositive: boolean) => {
    setPointToast({ message, isPositive });
    setTimeout(() => setPointToast(null), 3500);
  };

  // Close point popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".point-action-menu")) {
        setActivePointMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Track last synced model to switch activeTab automatically based on chosen mode
  const lastSyncedModelRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  const formatTimerDisplay = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Helper function to broadcast synchronization messages
  const broadcastSync = (type: "SETTINGS_SYNC" | "DATA_REFRESH", payload?: any) => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const ch = new BroadcastChannel("next_arena_sync");
        ch.postMessage({ type, payload });
        ch.close();
      } catch (e) {}
    }
  };

  // Realtime tick effect for Timer & Stopwatch on Monitor with wall-clock precision & Audio Buzzers
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      if (timerStartedAt > 0) {
        const elapsed = Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000));
        if (timerPhase === "preparation") {
          const remaining = Math.max(0, prepDuration - elapsed);
          setTimerSeconds(remaining);
          if (remaining <= 0) {
            stopAllSounds();
            setIsTimerRunning(false);
            setTimerPhase("prep_ended");
            setTimerStartedAt(0);
          }
        } else if (timerPhase === "countdown") {
          const remaining = Math.max(0, 3 - elapsed);
          setTimerSeconds(remaining);
          if (remaining === 2) {
            if (!soundCountdownUrl && soundEnabled) {
              playSound("countdown", "", soundVolume, false);
            }
          } else if (remaining === 1) {
            if (!soundCountdownUrl && soundEnabled) {
              playSound("countdown", "", soundVolume, false);
            }
          } else if (remaining <= 0) {
            // Hitung mundur selesai! Masuk ke Match Stopwatch
            const now = Date.now();
            setTimerPhase("match");
            setTimerSeconds(0);
            setTimerStartedAt(now);
            setTimerBaseSeconds(0);
            setIsTimerRunning(true);
            if (soundEnabled) {
              playSound("start", soundStartUrl, soundVolume, soundStartLoop);
            }
          }
        } else if (timerPhase === "match") {
          const current = timerBaseSeconds + elapsed;
          setTimerSeconds(current);
          if (matchLimit > 0 && current >= matchLimit) {
            stopAllSounds();
            setIsTimerRunning(false);
            setTimerPhase("finished");
            setTimerStartedAt(0);
            if (soundEnabled) {
              playSound("finish", soundFinishUrl, soundVolume, soundFinishLoop);
            }
          }
        }
      } else {
        setTimerSeconds((prev) => {
          if (timerPhase === "preparation") {
            // Habiskan waktu preparation sepenuhnya hingga 00:00
            if (prev <= 1) {
              stopAllSounds();
              setIsTimerRunning(false);
              setTimerPhase("prep_ended");
              return 0;
            }
            return prev - 1;
          } else if (timerPhase === "countdown") {
            // Fase Hitung Mundur Start Terpisah: 3 -> 2 -> 1 -> START (Match)
            if (prev === 3) {
              if (!soundCountdownUrl && soundEnabled) {
                playSound("countdown", "", soundVolume, false);
              }
              return 2;
            } else if (prev === 2) {
              if (!soundCountdownUrl && soundEnabled) {
                playSound("countdown", "", soundVolume, false);
              }
              return 1;
            } else if (prev <= 1) {
              setTimerPhase("match");
              setTimerSeconds(0);
              setIsTimerRunning(true);
              if (soundEnabled) {
                playSound("start", soundStartUrl, soundVolume, soundStartLoop);
              }
              return 0;
            }
            return prev - 1;
          } else if (timerPhase === "match") {
            const next = prev + 1;
            if (matchLimit > 0 && next >= matchLimit) {
              stopAllSounds();
              setIsTimerRunning(false);
              setTimerPhase("finished");
              if (soundEnabled) {
                playSound("finish", soundFinishUrl, soundVolume, soundFinishLoop);
              }
              return next;
            }
            return next;
          }
          return prev;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [
    isTimerRunning,
    timerPhase,
    timerStartedAt,
    timerBaseSeconds,
    matchLimit,
    prepDuration,
    soundEnabled,
    soundCountdownUrl,
    soundStartUrl,
    soundFinishUrl,
    soundVolume,
    soundPrepUrl,
    soundPrepLoop,
    soundCountdownLoop,
    soundStartLoop,
    soundFinishLoop,
  ]);

  // Synchronize settings from API
  const applySettings = (s: any, allowTabSwitch: boolean = false) => {
    if (!s) return;
    if (s.round_title) setRoundTitle(s.round_title);
    if (s.tournament_stages) {
      try {
        const parsed = typeof s.tournament_stages === "string" ? JSON.parse(s.tournament_stages) : s.tournament_stages;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTournamentStages(parsed);
          setSelectedBracketRound((prev) => {
            if (prev && parsed.some((st: any) => st.name === prev)) {
              return prev;
            }
            return parsed[0]?.name || prev;
          });
        }
      } catch (e) {}
    }
    if (s.active_round) setActiveRound(s.active_round);
    if (s.match_turns) setMatchTurns(s.match_turns as any);
    if (s.round_match_turns) {
      try {
        const parsed = typeof s.round_match_turns === "string" ? JSON.parse(s.round_match_turns) : s.round_match_turns;
        setRoundMatchTurns(parsed);
      } catch (e) {}
    }
    if (s.timer_mode) setTimerMode(s.timer_mode);
    if (s.timer_phase) setTimerPhase(s.timer_phase);
    if (s.prep_duration) setPrepDuration(Number(s.prep_duration) || 60);
    if (s.match_limit) setMatchLimit(Number(s.match_limit) || 300);
    if (s.timer_started_at !== undefined) setTimerStartedAt(Number(s.timer_started_at) || 0);
    if (s.timer_base_seconds !== undefined) setTimerBaseSeconds(Number(s.timer_base_seconds) || 0);

    const isRunning = s.timer_running === "true";
    setIsTimerRunning(isRunning);

    const startedAt = Number(s.timer_started_at) || 0;
    if (isRunning && startedAt > 0) {
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      if (s.timer_phase === "preparation") {
        const prep = Number(s.prep_duration) || 60;
        setTimerSeconds(Math.max(0, prep - elapsed));
      } else if (s.timer_phase === "countdown") {
        setTimerSeconds(Math.max(0, 3 - elapsed));
      } else if (s.timer_phase === "match") {
        const baseSec = Number(s.timer_base_seconds) || 0;
        setTimerSeconds(baseSec + elapsed);
      } else {
        setTimerSeconds(Number(s.timer_seconds) || 0);
      }
    } else {
      if (s.timer_seconds !== undefined) {
        setTimerSeconds(Number(s.timer_seconds) || 0);
      }
    }

    if (s.show_timer_on_monitor !== undefined) setShowTimerOnMonitor(s.show_timer_on_monitor === "true");
    if (s.sound_prep_url !== undefined) setSoundPrepUrl(s.sound_prep_url);
    if (s.sound_countdown_url !== undefined) setSoundCountdownUrl(s.sound_countdown_url);
    if (s.sound_start_url !== undefined) setSoundStartUrl(s.sound_start_url);
    if (s.sound_finish_url !== undefined) setSoundFinishUrl(s.sound_finish_url);
    if (s.sound_volume !== undefined) setSoundVolume(Number(s.sound_volume) || 0.8);
    if (s.sound_enabled !== undefined) setSoundEnabled(s.sound_enabled === "true");
    if (s.sound_prep_loop !== undefined) setSoundPrepLoop(s.sound_prep_loop === "true");
    if (s.sound_countdown_loop !== undefined) setSoundCountdownLoop(s.sound_countdown_loop === "true");
    if (s.sound_start_loop !== undefined) setSoundStartLoop(s.sound_start_loop === "true");
    if (s.sound_finish_loop !== undefined) setSoundFinishLoop(s.sound_finish_loop === "true");
    if (s.announcement !== undefined) setAnnouncement(s.announcement);

    if (s.custom_point_rules) {
      try {
        const parsed = JSON.parse(s.custom_point_rules);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomPointRules(parsed);
        }
      } catch (e) {}
    }

    // Fokus Tampilan Monitor Utama otomatis mengikuti pilihan mode atau default view
    if (s.stage_model) {
      setStageModel(s.stage_model);
    }

    if (allowTabSwitch || isInitialLoadRef.current) {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTab = urlParams.get("tab");
        if (urlTab === "bracket" || urlTab === "leaderboard" || urlTab === "judging") {
          setActiveTab(urlTab);
          isInitialLoadRef.current = false;
          return;
        }
      }

      const targetTab =
        s.default_monitor_view === "bracket" || s.stage_model === "bracket"
          ? "bracket"
          : s.default_monitor_view === "judging" || s.stage_model === "judging"
          ? "judging"
          : "leaderboard";

      const syncKey = `${s.stage_model || ""}_${s.default_monitor_view || ""}`;
      if (lastSyncedModelRef.current !== syncKey || isInitialLoadRef.current) {
        lastSyncedModelRef.current = syncKey;
        setActiveTab(targetTab);
      }
      isInitialLoadRef.current = false;
    }
  };

  // Load arena data from SQLite Database on mount & auto-poll
  const fetchArenaData = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/arena");
      if (res.ok) {
        const json = await res.json();
        if (json.participants) setParticipants(json.participants);
        if (json.categories) setCategories(json.categories);
        if (json.pointLogs) setPointLogs(json.pointLogs);
        if (json.bracketMatches) setBracketMatches(json.bracketMatches);
        if (json.announcement) setAnnouncement(json.announcement);
        if (json.settings) {
          applySettings(json.settings, false);
        }
      }
    } catch (err) {
      console.error("Gagal memuat data dari database:", err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchArenaData();
    const interval = setInterval(() => {
      fetch("/api/arena")
        .then((res) => res.json())
        .then((json) => {
          if (json.participants) setParticipants(json.participants);
          if (json.categories) setCategories(json.categories);
          if (json.pointLogs) setPointLogs(json.pointLogs);
          if (json.bracketMatches) setBracketMatches(json.bracketMatches);
          if (json.announcement) setAnnouncement(json.announcement);
          if (json.settings) {
            applySettings(json.settings, false);
          }
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Real-time synchronization across browser tabs (Projector vs Operator Laptop)
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("next_arena_sync");
    channel.onmessage = (event) => {
      if (event.data?.type === "SETTINGS_SYNC" && event.data.payload) {
        applySettings(event.data.payload, true);
        if (event.data.payload.default_monitor_view) {
          setActiveTab(event.data.payload.default_monitor_view);
        }
      } else if (event.data?.type === "DATA_REFRESH") {
        fetchArenaData();
      }
    };
    return () => {
      channel.close();
    };
  }, []);

  // Subtle arcade chime for point scoring (independent of match background audio)
  const playPointChime = (points: number) => {
    if (typeof window === "undefined" || !soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      const now = ctx.currentTime;
      if (points > 0) {
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
        gain.gain.setValueAtTime(soundVolume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      } else {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.08);
        gain.gain.setValueAtTime(soundVolume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      }
      osc.start(now);
      osc.stop(now + 0.12);
      setTimeout(() => {
        try { ctx.close(); } catch {}
      }, 150);
    } catch {}
  };

  // Keyboard Hotkey Listener for Live Match Scoring on Monitor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input, textarea, or select
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const pressedKey = e.key.toUpperCase();

      // Hotkey penilaian HANYA aktif jika ada pertandingan yang sedang berstatus "Berlangsung"
      const activeMatch = bracketMatches.find((m) => m.status === "Berlangsung");
      if (!activeMatch) return;

      const is2x = getMatchTurnsForRound(activeMatch.round) === "2x";
      const isLeg2 = is2x && activeMatch.currentLeg === 2;

      // Check Sudut Merah rules
      const redRule = customPointRules.find(
        (r) => r.enabled && r.hotkeyRed && r.hotkeyRed.toUpperCase() === pressedKey
      );
      if (redRule) {
        e.preventDefault();
        if (is2x) {
          const targetTeam = isLeg2 ? "B" : "A";
          const teamName = isLeg2 ? activeMatch.teamB : activeMatch.teamA;
          const leg = (isLeg2 ? 2 : 1) as 1 | 2;
          handleBracketLegScoreChange(activeMatch.id, targetTeam, leg, redRule.points, `${redRule.points > 0 ? `+${redRule.points}` : redRule.points} ${redRule.label}`);
          showPointToast(
            `[Hotkey ${pressedKey}] Sudut Merah (P${leg} - ${teamName}): ${redRule.points > 0 ? "+" : ""}${redRule.points} ${redRule.label}`,
            redRule.points > 0
          );
        } else {
          handleBracketScoreChange(activeMatch.id, "A", redRule.points, `${redRule.points > 0 ? `+${redRule.points}` : redRule.points} ${redRule.label}`);
          showPointToast(
            `[Hotkey ${pressedKey}] ${activeMatch.teamA}: ${redRule.points > 0 ? "+" : ""}${redRule.points} ${redRule.label}`,
            redRule.points > 0
          );
        }
        playPointChime(redRule.points);
        return;
      }

      // Check Sudut Biru rules
      const blueRule = customPointRules.find(
        (r) => r.enabled && r.hotkeyBlue && r.hotkeyBlue.toUpperCase() === pressedKey
      );
      if (blueRule) {
        e.preventDefault();
        if (is2x) {
          const targetTeam = isLeg2 ? "A" : "B";
          const teamName = isLeg2 ? activeMatch.teamA : activeMatch.teamB;
          const leg = (isLeg2 ? 2 : 1) as 1 | 2;
          handleBracketLegScoreChange(activeMatch.id, targetTeam, leg, blueRule.points, `${blueRule.points > 0 ? `+${blueRule.points}` : blueRule.points} ${blueRule.label}`);
          showPointToast(
            `[Hotkey ${pressedKey}] Sudut Biru (P${leg} - ${teamName}): ${blueRule.points > 0 ? "+" : ""}${blueRule.points} ${blueRule.label}`,
            blueRule.points > 0
          );
        } else {
          handleBracketScoreChange(activeMatch.id, "B", blueRule.points, `${blueRule.points > 0 ? `+${blueRule.points}` : blueRule.points} ${blueRule.label}`);
          showPointToast(
            `[Hotkey ${pressedKey}] ${activeMatch.teamB}: ${blueRule.points > 0 ? "+" : ""}${blueRule.points} ${blueRule.label}`,
            blueRule.points > 0
          );
        }
        playPointChime(blueRule.points);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bracketMatches, customPointRules, selectedBracketRound, matchTurns, roundMatchTurns]);

  // Compute global rankings sorted by stage-effective points descending, respecting stage resetPoints
  const globallyRankedParticipants = useMemo(() => {
    const withEffective = participants.map((p) => {
      // Calculate effective stage score honoring stage resetPoints
      const stageScore = calculateParticipantScoreInStage(
        p.scores,
        activeStageIndex,
        tournamentStages
      );
      return {
        ...p,
        totalPoints: stageScore,
        rawTotalPoints: (p.scores?.babak1 || 0) + (p.scores?.babak2 || 0) + (p.scores?.babak3 || 0),
        stageResetPoints: isStageResetPoints(activeStage),
      };
    });

    const sorted = [...withEffective].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return (b.rawTotalPoints || 0) - (a.rawTotalPoints || 0);
    });

    return sorted.map((p, index) => ({
      ...p,
      currentRank: index + 1,
      rankDelta: p.previousRank - (index + 1),
    }));
  }, [participants, activeStageIndex, tournamentStages]);

  // Selected participant for Detail Modal
  const detailParticipant = useMemo(() => {
    if (!detailParticipantId) return null;
    return globallyRankedParticipants.find((p) => p.id === detailParticipantId) ?? null;
  }, [detailParticipantId, globallyRankedParticipants]);

  // Selected stage index for Leaderboard view
  const targetLeaderboardStageIdx = useMemo(() => {
    if (selectedLeaderboardStage === "all") return null;
    if (typeof selectedLeaderboardStage === "number") return selectedLeaderboardStage;
    return 0;
  }, [selectedLeaderboardStage]);

  const activeLeaderboardStageObj = useMemo(() => {
    if (targetLeaderboardStageIdx === null) return null;
    return tournamentStages[targetLeaderboardStageIdx] || tournamentStages[0] || null;
  }, [tournamentStages, targetLeaderboardStageIdx]);

  // Compute stage-specific rankings for the Leaderboard view
  const leaderboardRankedParticipants = useMemo(() => {
    const isAll = selectedLeaderboardStage === "all" || targetLeaderboardStageIdx === null;

    // Filter by stage qualification if viewing specific stage > 0 and !showAllInStage
    let pool = participants;
    if (!isAll && targetLeaderboardStageIdx > 0 && !showAllInStage) {
      const advanced = participants.filter((p) => {
        const hasAdvanced = (p.currentStageIdx ?? 0) >= targetLeaderboardStageIdx;
        const stageRaw = getParticipantStageRawScore(p.scores, targetLeaderboardStageIdx, activeLeaderboardStageObj || undefined);
        return hasAdvanced || stageRaw > 0;
      });
      pool = advanced;
    }

    const withStageData = pool.map((p) => {
      const stageRaw = isAll
        ? (p.scores?.babak1 || 0) + (p.scores?.babak2 || 0) + (p.scores?.babak3 || 0)
        : getParticipantStageRawScore(p.scores, targetLeaderboardStageIdx, activeLeaderboardStageObj || undefined);

      const stageScore = isAll
        ? calculateParticipantScoreInStage(p.scores, tournamentStages.length - 1, tournamentStages)
        : calculateParticipantScoreInStage(p.scores, targetLeaderboardStageIdx, tournamentStages);

      return {
        ...p,
        stageRawScore: stageRaw,
        totalPoints: stageScore,
        rawTotalPoints: (p.scores?.babak1 || 0) + (p.scores?.babak2 || 0) + (p.scores?.babak3 || 0),
      };
    });

    const sorted = [...withStageData].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return (b.stageRawScore || 0) - (a.stageRawScore || 0);
    });

    return sorted.map((p, index) => ({
      ...p,
      currentRank: index + 1,
      rankDelta: p.previousRank - (index + 1),
    }));
  }, [
    participants,
    selectedLeaderboardStage,
    targetLeaderboardStageIdx,
    activeLeaderboardStageObj,
    tournamentStages,
    showAllInStage,
  ]);

  // Filtered and custom-sorted participants for the table
  const filteredParticipants = useMemo(() => {
    return leaderboardRankedParticipants
      .filter((p) => {
        const matchesCategory =
          selectedCategory === "Semua Kategori" || p.category === selectedCategory;
        const matchesStatus =
          selectedStatus === "Semua Status" || p.status === selectedStatus;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.institution.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q);
        return matchesCategory && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "total") return b.totalPoints - a.totalPoints;
        if (sortBy === "babak3") return (b.scores?.babak3 || 0) - (a.scores?.babak3 || 0);
        if (sortBy === "babak2") return (b.scores?.babak2 || 0) - (a.scores?.babak2 || 0);
        if (sortBy === "babak1") return (b.scores?.babak1 || 0) - (a.scores?.babak1 || 0);
        return a.name.localeCompare(b.name);
      });
  }, [leaderboardRankedParticipants, selectedCategory, selectedStatus, searchQuery, sortBy]);

  // Top 3 for Podium
  const podiumParticipants = useMemo(() => {
    const pool =
      selectedCategory === "Semua Kategori"
        ? leaderboardRankedParticipants
        : leaderboardRankedParticipants.filter((p) => p.category === selectedCategory);
    return pool.slice(0, 3);
  }, [leaderboardRankedParticipants, selectedCategory]);

  // Summary Statistics
  const stats = useMemo(() => {
    const total = leaderboardRankedParticipants.length;
    const finalists = leaderboardRankedParticipants.filter((p) => p.status === "Finalis").length;
    const active = leaderboardRankedParticipants.filter((p) => p.status === "Aktif").length;
    const highest = leaderboardRankedParticipants[0];
    const totalPointsPool = leaderboardRankedParticipants.reduce((acc, p) => acc + p.totalPoints, 0);
    const avgScore = total > 0 ? Math.round(totalPointsPool / total) : 0;

    return { total, finalists, active, highest, totalPointsPool, avgScore };
  }, [leaderboardRankedParticipants]);

  // Quick point adjustment handler (Syncs directly with SQLite)
  const handleQuickAdjustPoint = async (participantId: string, delta: number, label: string) => {
    const isPositive = delta >= 0;
    const pTarget = participants.find((p) => p.id === participantId);
    const targetName = pTarget?.name || "Tim";

    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id !== participantId) return p;
        let b1 = p.scores.babak1;
        let b2 = p.scores.babak2;
        let b3 = p.scores.babak3;
        if (activeStageIndex === 0) {
          b1 = b1 + delta;
        } else if (activeStageIndex === 1) {
          b2 = b2 + delta;
        } else {
          b3 = b3 + delta;
        }
        const newScores = { babak1: b1, babak2: b2, babak3: b3 };
        const stageScore = calculateParticipantScoreInStage(newScores, activeStageIndex, tournamentStages);
        return {
          ...p,
          scores: newScores,
          totalPoints: stageScore,
          lastUpdated: "Baru saja",
        };
      })
    );

    showPointToast(`${targetName}: ${label}`, isPositive);

    try {
      const res = await fetch("/api/participants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "quick_adjust",
          participantId,
          delta,
          label,
          targetRound: activeRound,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.participants) setParticipants(json.data.participants);
        if (json.data?.pointLogs) setPointLogs(json.data.pointLogs);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal simpan poin ke SQLite:", err);
    }
  };

  // Handler Toggle Gugur / Pulihkan Status Peserta
  const handleToggleGugur = async (p: Participant) => {
    const isCurrentlyGugur = p.status === "Gugur";
    const currentIdx = p.currentStageIdx ?? 0;
    const isLast = tournamentStages.length > 1 && currentIdx >= tournamentStages.length - 1;
    const newStatus: ParticipantStatus = isCurrentlyGugur
      ? (isLast ? "Finalis" : "Aktif")
      : "Gugur";

    setParticipants((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, status: newStatus } : item))
    );

    showPointToast(
      `${p.name} ${newStatus === "Gugur" ? "dinyatakan Gugur" : "diaktifkan kembali"}`,
      newStatus !== "Gugur"
    );

    try {
      const res = await fetch("/api/participants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "toggle_status",
          participantId: p.id,
          status: newStatus,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.participants) setParticipants(json.data.participants);
        if (json.data?.pointLogs) setPointLogs(json.data.pointLogs);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal update status gugur:", err);
    }
  };

  // Handler Lanjut ke Babak Selanjutnya
  const handleAdvanceStage = async (p: Participant, customTargetIdx?: number) => {
    const currentIdx = p.currentStageIdx ?? 0;
    const nextIdx = customTargetIdx !== undefined ? customTargetIdx : currentIdx + 1;
    if (nextIdx >= tournamentStages.length) return;

    const nextStage = tournamentStages[nextIdx];
    const isLast = nextIdx >= tournamentStages.length - 1;
    const newStatus: ParticipantStatus = isLast ? "Finalis" : "Aktif";

    setParticipants((prev) =>
      prev.map((item) =>
        item.id === p.id ? { ...item, currentStageIdx: nextIdx, status: newStatus } : item
      )
    );

    showPointToast(`${p.name} Lolos ke ${nextStage?.name || "Babak Selanjutnya"}!`, true);

    try {
      const res = await fetch("/api/participants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "advance_stage",
          participantId: p.id,
          targetStageIdx: nextIdx,
          status: newStatus,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.participants) setParticipants(json.data.participants);
        if (json.data?.pointLogs) setPointLogs(json.data.pointLogs);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal advance babak:", err);
    }
  };

  // Handler Batal Lanjut (Kembali ke Babak Sebelumnya)
  const handleRevertStage = async (p: Participant, targetIdx: number) => {
    if (targetIdx < 0 || targetIdx >= tournamentStages.length) return;

    const targetStage = tournamentStages[targetIdx];
    const isLast = targetIdx >= tournamentStages.length - 1;
    const newStatus: ParticipantStatus = isLast ? "Finalis" : "Aktif";

    setParticipants((prev) =>
      prev.map((item) =>
        item.id === p.id ? { ...item, currentStageIdx: targetIdx, status: newStatus } : item
      )
    );

    showPointToast(`Batal Lanjut: ${p.name} kembali ke ${targetStage?.name || "Babak Sebelumnya"}`, true);

    try {
      const res = await fetch("/api/participants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "revert_stage",
          participantId: p.id,
          targetStageIdx: targetIdx,
          status: newStatus,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.participants) setParticipants(json.data.participants);
        if (json.data?.pointLogs) setPointLogs(json.data.pointLogs);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal revert babak:", err);
    }
  };

  // Update Judging Criteria (Syncs directly with SQLite)
  const handleUpdateCriteria = async (
    participantId: string,
    field: keyof JudgingCriteria,
    value: number
  ) => {
    const clamped = Math.max(0, Math.min(250, value));

    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id !== participantId) return p;
        const updatedCriteria = {
          ...(p.criteria || { teknis: 200, inovasi: 200, kecepatan: 200, presentasi: 200 }),
          [field]: clamped,
        };
        const newBabak3 =
          updatedCriteria.teknis +
          updatedCriteria.inovasi +
          updatedCriteria.kecepatan +
          updatedCriteria.presentasi;
        const newScores = { ...p.scores, babak3: newBabak3 };
        const stageScore = calculateParticipantScoreInStage(newScores, activeStageIndex, tournamentStages);
        return {
          ...p,
          criteria: updatedCriteria,
          scores: newScores,
          totalPoints: stageScore,
          lastUpdated: "Baru saja",
        };
      })
    );

    try {
      const res = await fetch("/api/participants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "update_criteria",
          participantId,
          field,
          value: clamped,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.participants) setParticipants(json.data.participants);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal update kriteria ke SQLite:", err);
    }
  };

  // Save Participant Full Profile/Score from Modal
  const handleSaveEditModal = async (updatedP: Participant, note?: string) => {
    setEditingParticipant(null);
    try {
      const res = await fetch("/api/participants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p: updatedP,
          note: note || "Update Profil & Skor",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.participants) setParticipants(json.data.participants);
        if (json.data?.pointLogs) setPointLogs(json.data.pointLogs);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal update data peserta:", err);
    }
  };

  // Delete Participant - Opens Custom Confirm Modal
  const promptDeleteParticipant = (participant: Participant) => {
    setDeletingParticipant(participant);
  };

  const handleConfirmDeleteParticipant = async () => {
    if (!deletingParticipant) return;
    const participant = deletingParticipant;
    setDeletingParticipant(null);

    setParticipants((prev) => prev.filter((p) => p.id !== participant.id));
    if (editingParticipant?.id === participant.id) setEditingParticipant(null);
    if (detailParticipantId === participant.id) setDetailParticipantId(null);

    try {
      const res = await fetch(`/api/participants?id=${participant.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.participants) setParticipants(json.data.participants);
        if (json.data?.pointLogs) setPointLogs(json.data.pointLogs);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal hapus peserta:", err);
    }
  };

  // Set Exact Bracket Score (Direct Input)
  const handleSetExactScore = async (matchId: string, team: "A" | "B", score: number) => {
    const match = bracketMatches.find((m) => m.id === matchId);
    if (!match) return;

    const newScoreA = team === "A" ? score : match.scoreA;
    const newScoreB = team === "B" ? score : match.scoreB;
    const isPlayed = newScoreA !== 0 || newScoreB !== 0;
    const autoWinner: "A" | "B" | null =
      newScoreA > newScoreB ? "A" : newScoreB > newScoreA ? "B" : null;
    const winner = match.winner || autoWinner;
    const status = isPlayed
      ? winner
        ? "Selesai"
        : "Berlangsung"
      : "Siap Tanding";

    setBracketMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              scoreA: newScoreA,
              scoreB: newScoreB,
              winner: winner || undefined,
              status: status as any,
            }
          : m
      )
    );

    try {
      const res = await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          scoreA: newScoreA,
          scoreB: newScoreB,
          winner,
          status,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) setBracketMatches(json.data.bracketMatches);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal update score bracket:", err);
    }
  };

  // Quick Delta Score Adjuster (Supports custom rules, decimals & negative)
  const handleBracketScoreChange = async (
    matchId: string,
    team: "A" | "B",
    delta: number,
    ruleLabel?: string
  ) => {
    const match = bracketMatches.find((m) => m.id === matchId);
    if (!match) return;

    const currentScore = team === "A" ? match.scoreA : match.scoreB;
    const updatedScore = Number((currentScore + delta).toFixed(2));
    const newScoreA = team === "A" ? updatedScore : match.scoreA;
    const newScoreB = team === "B" ? updatedScore : match.scoreB;
    const isPlayed = newScoreA !== 0 || newScoreB !== 0;
    const winner: "A" | "B" | null = isPlayed
      ? newScoreA > newScoreB
        ? "A"
        : newScoreB > newScoreA
        ? "B"
        : null
      : null;
    const status = isPlayed ? (match.status === "Selesai" ? "Selesai" : "Berlangsung") : "Siap Tanding";
    const teamName = team === "A" ? match.teamA : match.teamB;

    setBracketMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              scoreA: newScoreA,
              scoreB: newScoreB,
              winner: winner || undefined,
              status: status as any,
            }
          : m
      )
    );

    try {
      const res = await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          scoreA: newScoreA,
          scoreB: newScoreB,
          winner,
          status,
          logEntry: {
            teamName,
            delta,
            label: ruleLabel || `${delta > 0 ? "+" : ""}${delta} PTS`,
            leg: 1,
            swTime: timerPhase === "match" ? formatTimerDisplay(timerSeconds) : "00:00",
          },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) setBracketMatches(json.data.bracketMatches);
        if (json.data?.participants) setParticipants(json.data.participants);
        if (json.data?.pointLogs) setPointLogs(json.data.pointLogs);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal update score bracket:", err);
    }
  };

  const handleBracketLegScoreChange = async (
    matchId: string,
    team: "A" | "B",
    leg: 1 | 2,
    delta: number,
    ruleLabel?: string
  ) => {
    const match = bracketMatches.find((m) => m.id === matchId);
    if (!match) return;

    let scoreALeg1 = match.scoreALeg1 || 0;
    let scoreBLeg1 = match.scoreBLeg1 || 0;
    let scoreALeg2 = match.scoreALeg2 || 0;
    let scoreBLeg2 = match.scoreBLeg2 || 0;

    if (team === "A" && leg === 1) scoreALeg1 = Number((scoreALeg1 + delta).toFixed(1));
    if (team === "B" && leg === 1) scoreBLeg1 = Number((scoreBLeg1 + delta).toFixed(1));
    if (team === "A" && leg === 2) scoreALeg2 = Number((scoreALeg2 + delta).toFixed(1));
    if (team === "B" && leg === 2) scoreBLeg2 = Number((scoreBLeg2 + delta).toFixed(1));

    const newScoreA = Number(((scoreALeg1 + scoreALeg2) / 2).toFixed(2));
    const newScoreB = Number(((scoreBLeg1 + scoreBLeg2) / 2).toFixed(2));

    const isPlayed = newScoreA !== 0 || newScoreB !== 0;
    const winner: "A" | "B" | null = isPlayed
      ? newScoreA > newScoreB
        ? "A"
        : newScoreB > newScoreA
        ? "B"
        : null
      : null;
    const status = isPlayed ? (match.status === "Selesai" ? "Selesai" : "Berlangsung") : "Siap Tanding";
    const teamName = team === "A" ? match.teamA : match.teamB;

    setBracketMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              currentLeg: leg,
              scoreALeg1,
              scoreBLeg1,
              scoreALeg2,
              scoreBLeg2,
              scoreA: newScoreA,
              scoreB: newScoreB,
              winner: winner || undefined,
              status: status as any,
            }
          : m
      )
    );

    try {
      const res = await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          currentLeg: leg,
          scoreALeg1,
          scoreBLeg1,
          scoreALeg2,
          scoreBLeg2,
          scoreA: newScoreA,
          scoreB: newScoreB,
          winner,
          status,
          logEntry: {
            teamName,
            delta,
            label: ruleLabel || `${delta > 0 ? "+" : ""}${delta} PTS`,
            leg,
            swTime: timerPhase === "match" ? formatTimerDisplay(timerSeconds) : "00:00",
          },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) setBracketMatches(json.data.bracketMatches);
        if (json.data?.participants) setParticipants(json.data.participants);
        if (json.data?.pointLogs) setPointLogs(json.data.pointLogs);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal update skor leg match:", err);
    }
  };

  const handleSetExactLegScore = async (
    matchId: string,
    team: "A" | "B",
    leg: 1 | 2,
    score: number
  ) => {
    const match = bracketMatches.find((m) => m.id === matchId);
    if (!match) return;

    let scoreALeg1 = match.scoreALeg1 || 0;
    let scoreBLeg1 = match.scoreBLeg1 || 0;
    let scoreALeg2 = match.scoreALeg2 || 0;
    let scoreBLeg2 = match.scoreBLeg2 || 0;

    if (team === "A" && leg === 1) scoreALeg1 = score;
    if (team === "B" && leg === 1) scoreBLeg1 = score;
    if (team === "A" && leg === 2) scoreALeg2 = score;
    if (team === "B" && leg === 2) scoreBLeg2 = score;

    const newScoreA = Number(((scoreALeg1 + scoreALeg2) / 2).toFixed(2));
    const newScoreB = Number(((scoreBLeg1 + scoreBLeg2) / 2).toFixed(2));

    const isPlayed = newScoreA !== 0 || newScoreB !== 0;
    const winner: "A" | "B" | null = isPlayed
      ? newScoreA > newScoreB
        ? "A"
        : newScoreB > newScoreA
        ? "B"
        : null
      : null;
    const status = isPlayed ? (match.status === "Selesai" ? "Selesai" : "Berlangsung") : "Siap Tanding";

    setBracketMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              scoreALeg1,
              scoreBLeg1,
              scoreALeg2,
              scoreBLeg2,
              scoreA: newScoreA,
              scoreB: newScoreB,
              winner: winner || undefined,
              status: status as any,
            }
          : m
      )
    );

    try {
      const res = await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          scoreALeg1,
          scoreBLeg1,
          scoreALeg2,
          scoreBLeg2,
          scoreA: newScoreA,
          scoreB: newScoreB,
          winner,
          status,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) setBracketMatches(json.data.bracketMatches);
        if (json.data?.participants) setParticipants(json.data.participants);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal set exact score leg:", err);
    }
  };

  const handleSwitchLeg = async (matchId: string, nextLeg: 1 | 2) => {
    const match = bracketMatches.find((m) => m.id === matchId);
    if (!match) return;

    setBracketMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, currentLeg: nextLeg, status: "Berlangsung" } : m))
    );

    try {
      const res = await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          currentLeg: nextLeg,
          status: "Berlangsung",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) setBracketMatches(json.data.bracketMatches);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal ganti leg match:", err);
    }
  };

  // Set Manual Winner Override
  const handleSetWinner = async (matchId: string, winner: "A" | "B" | null) => {
    const match = bracketMatches.find((m) => m.id === matchId);
    if (!match) return;

    const status = winner ? "Selesai" : "Berlangsung";
    setBracketMatches((prev) =>
      prev.map((m) =>
        m.id === matchId ? { ...m, winner: winner || undefined, status: status as any } : m
      )
    );

    try {
      const res = await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          scoreA: match.scoreA,
          scoreB: match.scoreB,
          winner,
          status,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) setBracketMatches(json.data.bracketMatches);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal set pemenang match:", err);
    }
  };

  const handleSetMatchStatus = async (
    matchId: string,
    status: "Siap Tanding" | "Berlangsung" | "Selesai"
  ) => {
    const match = bracketMatches.find((m) => m.id === matchId);
    if (!match) return;

    setBracketMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status } : m))
    );

    try {
      const res = await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          scoreA: match.scoreA,
          scoreB: match.scoreB,
          status,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) setBracketMatches(json.data.bracketMatches);
        if (json.data?.participants) setParticipants(json.data.participants);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal update status match:", err);
    }
  };

  // Handler Mulai Pertandingan dengan Shutter Transition
  const handleStartMatchWithShutter = (match: BracketMatch) => {
    if (Boolean(shutterMatch)) return;
    try {
      router.prefetch(`/tanding/${match.id}`);
    } catch {}
    handleSetMatchStatus(match.id, "Berlangsung");
    setShutterMatch(match);
  };

  // Filter point logs for the selected match in Match Log Modal on Dashboard
  const matchLogs = useMemo(() => {
    if (!viewLogMatch) return [];
    const mLabel = (viewLogMatch.matchLabel || "").toLowerCase();
    const mId = (viewLogMatch.id || "").toLowerCase();
    const teamA = (viewLogMatch.teamA || "").toLowerCase();
    const teamB = (viewLogMatch.teamB || "").toLowerCase();

    return pointLogs.filter((log) => {
      const sl = (log.stageLabel || "").toLowerCase();
      const pn = (log.participantName || "").toLowerCase();
      if (sl.includes(mLabel) || sl.includes(mId)) return true;
      if ((pn === teamA || pn === teamB) && sl.includes("laga")) return true;
      return false;
    });
  }, [viewLogMatch, pointLogs]);

  // Deteksi apakah laga yang dilihat merupakan 2x Main
  const viewMatchIs2x = useMemo(() => {
    if (!viewLogMatch) return false;
    const r = viewLogMatch.round;
    if (roundMatchTurns[r]) return roundMatchTurns[r] === "2x";
    if (r.includes("Penyisihan") || r.includes("16 Besar")) return (roundMatchTurns["Babak Penyisihan"] || "2x") === "2x";
    return false;
  }, [viewLogMatch, roundMatchTurns]);

  // Log terpisah untuk Putaran 1 dan Putaran 2
  const p1MatchLogs = useMemo(() => {
    return matchLogs.filter((l) => /P1[\s@)]/i.test(l.stageLabel) || !/P2[\s@)]/i.test(l.stageLabel));
  }, [matchLogs]);

  const p2MatchLogs = useMemo(() => {
    return matchLogs.filter((l) => /P2[\s@)]/i.test(l.stageLabel));
  }, [matchLogs]);

  // Helper untuk mem-parsing waktu stopwatch (@MM:SS), jam riil (HH:mm:ss), sesi (P1/P2), dan nama aksi tanpa error Invalid Date
  const parsePointLogItem = (log: PointLog, match: BracketMatch, is2xMode: boolean) => {
    const rawStage = log.stageLabel || "";
    const swMatch = rawStage.match(/@(\d{2}:\d{2})/);
    const swTime = swMatch ? swMatch[1] : "00:00";

    const isLeg2 = /P2[\s@)]/i.test(rawStage);
    const leg: 1 | 2 = isLeg2 ? 2 : 1;

    let clockTime = "--:--:--";
    if (log.timestamp && log.timestamp !== "Baru saja") {
      const parsedDate = new Date(log.timestamp);
      if (!isNaN(parsedDate.getTime())) {
        clockTime = parsedDate.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      } else if (/^\d{2}[.:]\d{2}/.test(log.timestamp)) {
        clockTime = log.timestamp;
      }
    }
    if (clockTime === "--:--:--" && log.id) {
      const epochMatch = log.id.match(/log-(\d{10,13})/);
      if (epochMatch) {
        const d = new Date(Number(epochMatch[1]));
        if (!isNaN(d.getTime())) {
          clockTime = d.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
        }
      }
    }

    const cleanAction =
      rawStage.replace(/\s*\(Laga[^)]*\)/gi, "").trim() ||
      (log.delta > 0 ? `+${log.delta} PTS` : `${log.delta} PTS`);

    const isTeamA =
      (log.participantName || "").toLowerCase() === (match.teamA || "").toLowerCase();

    // Sudut di Sesi 1: Tim A = Merah, Tim B = Biru. Di Sesi 2 (Tukar Sisi): Tim B = Merah, Tim A = Biru
    const corner: "red" | "blue" = is2xMode
      ? leg === 1
        ? isTeamA
          ? "red"
          : "blue"
        : isTeamA
        ? "blue"
        : "red"
      : isTeamA
      ? "red"
      : "blue";

    return {
      swTime,
      clockTime,
      leg,
      cleanAction,
      isTeamA,
      corner,
    };
  };

  // Handler Reset Single Match (Per Laga)
  const handleResetSingleMatch = async (matchId: string, clearLogs: boolean) => {
    try {
      const res = await fetch(`/api/bracket?matchId=${matchId}&clearLogs=${clearLogs}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) setBracketMatches(json.data.bracketMatches);
        if (json.data?.participants) setParticipants(json.data.participants);
        if (json.data?.pointLogs) setPointLogs(json.data.pointLogs);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal reset laga:", err);
    } finally {
      setResetMatchTarget(null);
    }
  };

  // Handler Hapus Seluruh Log Laga Ini Saja
  const handleClearLogsOnly = async (matchId: string) => {
    try {
      const res = await fetch(`/api/bracket?matchId=${matchId}&logsOnly=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.pointLogs) setPointLogs(json.data.pointLogs);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal hapus log laga:", err);
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      "Rank",
      "Kode",
      "Nama Tim/Peserta",
      "Instansi",
      "Kota",
      "Kategori",
      "Status",
      "Babak 1",
      "Babak 2",
      "Babak 3",
      "Total Ranking Point",
    ];
    const rows = globallyRankedParticipants.map((p) => [
      p.currentRank,
      p.code,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.institution.replace(/"/g, '""')}"`,
      `"${p.city.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.status,
      p.scores.babak1,
      p.scores.babak2,
      p.scores.babak3,
      p.totalPoints,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "NEXT-Arena-Klasemen.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: ParticipantStatus) => {
    switch (status) {
      case "Finalis":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Finalis
          </span>
        );
      case "Aktif":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Aktif
          </span>
        );
      case "Gugur":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800/90 text-zinc-400 border border-zinc-700">
            <XCircle className="w-3 h-3 text-zinc-500" />
            Gugur
          </span>
        );
    }
  };

  const getCategoryBadge = (category: CompetitionCategory) => {
    const palette = [
      "bg-red-500/10 text-red-300 border-red-500/25",
      "bg-orange-500/10 text-orange-300 border-orange-500/25",
      "bg-yellow-500/10 text-yellow-300 border-yellow-500/25",
      "bg-rose-500/10 text-rose-300 border-rose-500/25",
      "bg-amber-500/10 text-amber-300 border-amber-500/25",
    ];
    const index = Math.abs(
      category.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % palette.length;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${palette[index]}`}
      >
        {category}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col text-zinc-100">
      {/* Top Neon Gradient Line */}
      <div className="h-1 w-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400" />

      {/* Live Broadcast Ticker / Pengumuman Monitor */}
      <div className="bg-[#0d0d12] border-b border-zinc-800/80 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-sm">
              <Megaphone className="w-3 h-3" />
              INFO ARENA
            </span>
            <div className="group relative flex-1 min-w-0 overflow-hidden flex items-center select-none py-0.5">
              {/* Fade Gradient Edges for Smooth Entry/Exit */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0d0d12] to-transparent z-10" />
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0d0d12] to-transparent z-10" />

              {/* Running Text / Marquee Elements */}
              <div className="flex shrink-0 items-center gap-8 pr-8 animate-marquee">
                <span className="text-xs text-zinc-300 font-medium whitespace-nowrap">
                  {announcement || "Selamat datang di NEXT ARENA Tournament!"}
                </span>
                <span className="text-orange-400 font-bold text-xs shrink-0 select-none">✦</span>
                <span className="text-xs text-zinc-300 font-medium whitespace-nowrap">
                  {announcement || "Selamat datang di NEXT ARENA Tournament!"}
                </span>
                <span className="text-orange-400 font-bold text-xs shrink-0 select-none">✦</span>
              </div>
              <div className="flex shrink-0 items-center gap-8 pr-8 animate-marquee" aria-hidden="true">
                <span className="text-xs text-zinc-300 font-medium whitespace-nowrap">
                  {announcement || "Selamat datang di NEXT ARENA Tournament!"}
                </span>
                <span className="text-orange-400 font-bold text-xs shrink-0 select-none">✦</span>
                <span className="text-xs text-zinc-300 font-medium whitespace-nowrap">
                  {announcement || "Selamat datang di NEXT ARENA Tournament!"}
                </span>
                <span className="text-orange-400 font-bold text-xs shrink-0 select-none">✦</span>
              </div>
            </div>
          </div>
          {showTimerOnMonitor && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsBigTimerOpen(true)}
                title="Buka Layar Penuh Stopwatch Arena"
                className={`flex items-center gap-2 px-3 py-1 rounded-xl font-mono text-xs font-bold transition-all shadow-sm ${
                  timerPhase === "preparation"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse"
                    : timerPhase === "prep_ended"
                    ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 animate-bounce"
                    : timerPhase === "match"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : timerPhase === "paused"
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : timerPhase === "countdown"
                    ? "bg-orange-500/25 text-orange-300 border border-orange-500/50 animate-pulse"
                    : timerPhase === "finished"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-300"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isTimerRunning
                      ? timerPhase === "preparation"
                        ? "bg-amber-400 animate-ping"
                        : timerPhase === "countdown"
                        ? "bg-orange-400 animate-ping"
                        : "bg-emerald-400 animate-ping"
                      : "bg-zinc-600"
                  }`}
                />
                <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-zinc-400 hidden sm:inline">
                  {timerPhase === "preparation"
                    ? "Persiapan"
                    : timerPhase === "prep_ended"
                    ? "Siap Start"
                    : timerPhase === "countdown"
                    ? "Hitung Mundur"
                    : timerPhase === "match"
                    ? "Stopwatch"
                    : timerPhase === "paused"
                    ? "Jeda"
                    : timerPhase === "finished"
                    ? "Selesai"
                    : "Timer"}
                  :
                </span>
                <span className="text-sm font-black text-white">
                  {timerPhase === "countdown" ? timerSeconds : formatTimerDisplay(timerSeconds)}
                </span>
                <Maximize2 className="w-3 h-3 text-zinc-400 hover:text-white ml-0.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#09090b]/90 border-b border-zinc-800/80">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <ArenaLogo size="md" />

          {/* Center Navigation Tabs */}
          <nav className="hidden lg:flex items-center bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "leaderboard"
                  ? "bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Klasemen & Peserta</span>
            </button>
            <button
              onClick={() => setActiveTab("bracket")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "bracket"
                  ? "bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Bagan Pertandingan</span>
            </button>
            <button
              onClick={() => setActiveTab("judging")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "judging"
                  ? "bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Matriks Kriteria Juri</span>
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => setIsSpotlightOpen(true)}
              title="Tampilkan Spotlight Juara"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all"
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Spotlight Juara</span>
            </button>

            <button
              type="button"
              onClick={() => setIsViewRankingOpen(true)}
              title="Tampilkan Layar Klasemen Lengkap (Break & Jeda Pertandingan)"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500/15 via-yellow-500/15 to-orange-500/15 hover:from-orange-500/25 hover:via-yellow-500/25 hover:to-orange-500/25 text-orange-300 hover:text-white border border-orange-500/30 hover:border-orange-500/50 shadow-sm transition-all cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span>View Ranking</span>
            </button>

            {/* PENGATURAN BUTTON (BUKA HALAMAN BARU /pengaturan) */}
            <Link
              href="/pengaturan"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-zinc-950 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 hover:brightness-110 transition-all shadow-[0_0_20px_rgba(249,115,22,0.35)] active:scale-95"
            >
              <Settings className="w-4 h-4 stroke-[2.2]" />
              <span>Pengaturan</span>
            </Link>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex lg:hidden items-center justify-around border-t border-zinc-800/80 bg-zinc-950/90 px-2 py-1.5">
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              activeTab === "leaderboard" ? "text-orange-400 bg-orange-500/10" : "text-zinc-400"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Klasemen</span>
          </button>
          <button
            onClick={() => setActiveTab("bracket")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              activeTab === "bracket" ? "text-orange-400 bg-orange-500/10" : "text-zinc-400"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Bracket</span>
          </button>
          <button
            onClick={() => setActiveTab("judging")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              activeTab === "judging" ? "text-orange-400 bg-orange-500/10" : "text-zinc-400"
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Kriteria Juri</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Hero Banner + Official Brand Showcase */}
        <section className="relative rounded-2xl overflow-hidden border border-zinc-800/90 bg-gradient-to-br from-[#121217] via-[#0d0d11] to-[#161012] p-6 sm:p-8 shadow-2xl">
          <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-orange-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-red-600/10 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Text Info */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-semibold tracking-wider uppercase">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  NUSANTARA NEXT Competition Management System
                </div>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                NEXT <span className="font-light tracking-[0.2em] text-zinc-200">ARENA</span>
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
                Sistem pusat pemantauan daftar peserta, perolehan ranking point tiap babak, matriks
                dewan juri, dan bagan turnamen Nusantara Next dengan sistem pencatatan terpadu.
              </p>
            </div>

            {/* Right: Official Brand Emblem */}
            <div className="lg:col-span-5 flex justify-start lg:justify-end">
              <div className="relative rounded-xl overflow-hidden border border-zinc-800/90 bg-black/90 p-2 shadow-[0_0_30px_rgba(239,68,68,0.15)] max-w-xs sm:max-w-sm w-full">
                <img
                  src="/arena-logo.jpg"
                  alt="NEXT Arena - The Place To Play"
                  className="w-full h-28 sm:h-32 object-cover rounded-lg opacity-95"
                />
                <div className="mt-2 px-2 py-0.5 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="font-medium text-zinc-300 tracking-wider uppercase">
                    NEXT ARENA MONITOR
                  </span>
                  <span className="text-orange-400 font-semibold">SEASON 2026</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 KPI Stat Cards */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 pt-6 border-t border-zinc-800/80">
            <div className="rounded-xl bg-zinc-900/70 border border-zinc-800/80 p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">Total Peserta / Tim</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl sm:text-2xl font-bold text-white">{stats.total}</p>
                  <span className="text-xs text-amber-400 font-medium">
                    ({stats.finalists} Finalis)
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-900/70 border border-zinc-800/80 p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-zinc-400 font-medium">Pimpinan Klasemen #1</p>
                <p className="text-base sm:text-lg font-bold text-white truncate">
                  {stats.highest?.name ?? "-"}
                </p>
                <p className="text-xs text-yellow-400 font-mono font-semibold">
                  {stats.highest ? `${stats.highest.totalPoints.toLocaleString("id-ID")} PTS` : "-"}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-900/70 border border-zinc-800/80 p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">Rata-Rata Ranking Point</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl sm:text-2xl font-bold text-white font-mono">
                    {stats.avgScore.toLocaleString("id-ID")}
                  </p>
                  <span className="text-xs text-zinc-400">PTS</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TAB 1: LEADERBOARD & DAFTAR PESERTA */}
        {activeTab === "leaderboard" && (
          <>
            {/* TOP 3 PODIUM SECTION (Hanya jika ada peserta) */}
            {podiumParticipants.length > 0 && (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-6 rounded-full bg-gradient-to-b from-yellow-400 via-orange-500 to-red-600" />
                  <h2 className="text-lg sm:text-xl font-bold tracking-wide text-white uppercase">
                    Top 3 Podium Klasemen
                  </h2>
                </div>
                <span className="text-xs text-zinc-400">
                  Klik nama tim untuk melihat profil anggota & rincian kriteria penilaian juri
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
                {podiumParticipants.map((item, idx) => {
                  const rankPosition = idx + 1;
                  const isFirst = rankPosition === 1;
                  const isSecond = rankPosition === 2;

                  const borderStyle = isFirst
                    ? "border-yellow-500/50 bg-gradient-to-b from-yellow-500/10 via-[#14141a] to-[#121216] shadow-[0_0_35px_rgba(250,204,21,0.12)]"
                    : isSecond
                    ? "border-orange-500/40 bg-gradient-to-b from-orange-500/10 via-[#14141a] to-[#121216]"
                    : "border-red-500/35 bg-gradient-to-b from-red-500/10 via-[#14141a] to-[#121216]";

                  const badgeStyle = isFirst
                    ? "bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 text-zinc-950 shadow-lg shadow-yellow-500/25"
                    : isSecond
                    ? "bg-gradient-to-r from-orange-400 to-red-500 text-white"
                    : "bg-gradient-to-r from-red-500 to-rose-700 text-white";

                  return (
                    <div
                      key={item.id}
                      className={`relative rounded-2xl border p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${borderStyle}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <span
                            className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-extrabold tracking-wider uppercase ${badgeStyle}`}
                          >
                            <Trophy className="w-3.5 h-3.5 mr-1.5" />
                            RANK #{rankPosition}
                          </span>
                          {getStatusBadge(item.status)}
                        </div>

                        <button
                          onClick={() => setDetailParticipantId(item.id)}
                          className="text-left group/title"
                        >
                          <h3 className="text-xl font-bold text-white group-hover/title:text-orange-400 transition-colors tracking-tight">
                            {item.name}
                          </h3>
                        </button>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                          <Building2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span className="truncate">{item.institution}</span>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          {getCategoryBadge(item.category)}
                          <button
                            onClick={() => setDetailParticipantId(item.id)}
                            className="text-xs text-zinc-400 hover:text-orange-300 inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Profil Tim</span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-zinc-800/80 space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-zinc-900/90 rounded-lg p-2 border border-zinc-800/70">
                            <span className="block text-[10px] uppercase tracking-wider text-zinc-400">
                              Babak 1
                            </span>
                            <span className="font-mono text-sm font-semibold text-zinc-200">
                              {item.scores.babak1}
                            </span>
                          </div>
                          <div className="bg-zinc-900/90 rounded-lg p-2 border border-zinc-800/70">
                            <span className="block text-[10px] uppercase tracking-wider text-zinc-400">
                              Babak 2
                            </span>
                            <span className="font-mono text-sm font-semibold text-zinc-200">
                              {item.scores.babak2}
                            </span>
                          </div>
                          <div className="bg-zinc-900/90 rounded-lg p-2 border border-orange-500/30">
                            <span className="block text-[10px] uppercase tracking-wider text-orange-400">
                              Babak 3
                            </span>
                            <span className="font-mono text-sm font-semibold text-orange-300">
                              {item.scores.babak3}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-end justify-between pt-1">
                          <div>
                            <span className="text-[11px] uppercase tracking-wider text-zinc-400 block">
                              Total Ranking Point
                            </span>
                            <span className="text-2xl sm:text-3xl font-black font-mono bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 bg-clip-text text-transparent">
                              {item.totalPoints.toLocaleString("id-ID")}
                            </span>
                            <span className="text-xs text-zinc-400 ml-1 font-mono">PTS</span>
                          </div>

                          {(() => {
                            const activeBonus = customPointRules.find(
                              (r) => r.enabled && r.points > 0
                            ) || {
                              label: "Bonus Cepat",
                              points: 50,
                            };
                            return (
                              <button
                                onClick={() =>
                                  handleQuickAdjustPoint(
                                    item.id,
                                    activeBonus.points,
                                    `${activeBonus.label} (+${activeBonus.points})`
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 transition-colors"
                              >
                                +{activeBonus.points} {activeBonus.label}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            )}

            {/* MAIN CONTAINER: DAFTAR PESERTA & RANKING TABLE */}
            <section className="w-full">
              {/* Full Width Main Column: Participant & Ranking Table */}
              <div className="w-full bg-[#121216]/95 border border-zinc-800/90 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-5 sm:p-6 border-b border-zinc-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                        <span>Daftar Peserta & Klasemen Poin</span>
                        <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                          {filteredParticipants.length} Peserta
                        </span>
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                        Klik nama peserta untuk detail anggota, atau ikon pensil untuk edit profil & skor.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                      {/* Search Input */}
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari tim, kode NXT, instansi..."
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500/70 transition-colors"
                        />
                      </div>

                      <button
                        onClick={() => window.print()}
                        title="Cetak Laporan Klasemen"
                        className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <Printer className="w-3.5 h-3.5 text-orange-400" />
                        <span className="hidden sm:inline">Cetak</span>
                      </button>

                      <button
                        onClick={fetchArenaData}
                        disabled={isSyncing}
                        title="Sinkron Ulang Data"
                        className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-orange-400" : ""}`} />
                        <span className="hidden sm:inline">Sinkron</span>
                      </button>
                    </div>
                  </div>

                  {/* TAB BABAK KLASEMEN (PILIHAN TAMPILAN BABAK: BABAK 1, BABAK 2, DST) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-orange-400 shrink-0">
                        TAMPILAN BABAK:
                      </span>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                      {tournamentStages.map((stage, sIdx) => {
                        const isSelected = selectedLeaderboardStage === sIdx;
                        const stageNumber = sIdx + 1;
                        const displayName = stage.name.toLowerCase().startsWith("babak")
                          ? stage.name
                          : `Babak ${stageNumber} • ${stage.name}`;
                        return (
                          <button
                            key={stage.id || sIdx}
                            type="button"
                            onClick={() => {
                              setSelectedLeaderboardStage(sIdx);
                              setShowAllInStage(false);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer whitespace-nowrap ${
                              isSelected
                                ? "bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white border-orange-500/50 shadow-md shadow-orange-500/20"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                            }`}
                          >
                            <span>{displayName}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                isSelected ? "bg-black/30 text-white" : "bg-zinc-800 text-zinc-400"
                              }`}
                            >
                              {stage.model === "ranking" ? "Ranking" : "Gugur"}
                            </span>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLeaderboardStage("all");
                          setShowAllInStage(true);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer whitespace-nowrap ${
                          selectedLeaderboardStage === "all"
                            ? "bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white border-orange-500/50 shadow-md shadow-orange-500/20"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                        }`}
                      >
                        <span>Semua Babak (Total)</span>
                      </button>
                    </div>
                  </div>

                  {/* Category Pills & Secondary Filters */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {["Semua Kategori", ...categories].map((cat) => {
                        const active = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                              active
                                ? "bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white font-semibold shadow-sm"
                                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                      <Link
                        href="/pengaturan"
                        title="Tambah / Kelola Kategori Lomba"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-zinc-900 hover:bg-zinc-800 text-orange-400 border border-orange-500/30 flex items-center gap-1 shrink-0"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>+ Kategori</span>
                      </Link>
                    </div>

                    <div className="flex items-center gap-2 self-end lg:self-auto">
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-orange-500"
                      >
                        <option value="Semua Status">Semua Status</option>
                        <option value="Finalis">Status: Finalis</option>
                        <option value="Aktif">Status: Aktif</option>
                        <option value="Gugur">Status: Gugur</option>
                      </select>

                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-orange-500"
                      >
                        <option value="total">Urutkan: Total Poin Tertinggi</option>
                        <option value="babak3">Urutkan: Skor Babak 3</option>
                        <option value="babak2">Urutkan: Skor Babak 2</option>
                        <option value="babak1">Urutkan: Skor Babak 1</option>
                        <option value="name">Urutkan: Nama Peserta (A-Z)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Responsive Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800/90 bg-zinc-900/60 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        <th className="py-3.5 pl-6 pr-3 w-24">Rank</th>
                        <th className="py-3.5 px-3">Peserta / Tim & Instansi</th>
                        <th className="py-3.5 px-3">Kategori Lomba</th>
                        <th className="py-3.5 px-3">Status</th>
                        <th className="py-3.5 px-3 text-center">Skor</th>
                        <th className="py-3.5 px-4 text-right">Ranking Point</th>
                        <th className="py-3.5 pl-3 pr-6 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-sm">
                      {filteredParticipants.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-zinc-400">
                            {selectedLeaderboardStage !== "all" && targetLeaderboardStageIdx !== null && targetLeaderboardStageIdx > 0 ? (
                              <div className="flex flex-col items-center justify-center gap-3">
                                <GitBranch className="w-10 h-10 text-orange-400/60" />
                                <p className="text-base font-bold text-white">
                                  Belum Ada Peserta di {activeLeaderboardStageObj?.name || `Babak ${(targetLeaderboardStageIdx || 0) + 1}`}
                                </p>
                                <p className="text-xs text-zinc-400 max-w-md">
                                  Peserta yang diloloskan dari babak sebelumnya akan otomatis tampil di babak ini. Silakan loloskan peserta dari Babak {targetLeaderboardStageIdx} dengan menekan tombol &apos;Lanjut ke {activeLeaderboardStageObj?.name}&apos;.
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedLeaderboardStage(targetLeaderboardStageIdx - 1);
                                      setShowAllInStage(false);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Buka Babak {targetLeaderboardStageIdx}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowAllInStage(true)}
                                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold hover:text-white transition-all cursor-pointer"
                                  >
                                    Tampilkan Semua Peserta
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-3">
                                <Users className="w-10 h-10 text-zinc-600" />
                                <p className="text-base font-semibold text-zinc-300">Belum ada peserta terdaftar</p>
                                <p className="text-xs text-zinc-500 max-w-sm">
                                  Silakan masuk ke halaman Pengaturan untuk mendaftarkan peserta baru atau import file CSV.
                                </p>
                                <Link
                                  href="/pengaturan"
                                  className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-zinc-950 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 hover:brightness-110 transition-all shadow"
                                >
                                  Tambah Peserta di Pengaturan
                                </Link>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredParticipants.map((p) => {
                          const isTop3 = p.currentRank <= 3;
                          const maxPossible = 3000;
                          const progressPercent = Math.min(
                            100,
                            Math.round((p.totalPoints / maxPossible) * 100)
                          );

                          return (
                            <tr
                              key={p.id}
                              className={`group transition-colors hover:bg-zinc-900/65 ${
                                p.status === "Gugur" ? "opacity-60" : ""
                              }`}
                            >
                              {/* RANK + DELTA */}
                              <td className="py-4 pl-6 pr-3 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`w-8 h-8 rounded-lg font-mono font-bold text-sm flex items-center justify-center ${
                                      p.currentRank === 1
                                        ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-zinc-950 shadow-md shadow-yellow-500/20"
                                        : p.currentRank === 2
                                        ? "bg-gradient-to-br from-orange-400 to-red-500 text-white"
                                        : p.currentRank === 3
                                        ? "bg-gradient-to-br from-red-500 to-rose-700 text-white"
                                        : "bg-zinc-900 text-zinc-300 border border-zinc-800"
                                    }`}
                                  >
                                    #{p.currentRank}
                                  </span>

                                  {p.rankDelta > 0 ? (
                                    <span
                                      title={`Naik ${p.rankDelta} peringkat`}
                                      className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded"
                                    >
                                      <TrendingUp className="w-3 h-3 mr-0.5" />+{p.rankDelta}
                                    </span>
                                  ) : p.rankDelta < 0 ? (
                                    <span
                                      title={`Turun ${Math.abs(p.rankDelta)} peringkat`}
                                      className="inline-flex items-center text-xs font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded"
                                    >
                                      <TrendingDown className="w-3 h-3 mr-0.5" />
                                      {p.rankDelta}
                                    </span>
                                  ) : (
                                    <span
                                      title="Peringkat stabil"
                                      className="inline-flex items-center text-xs text-zinc-500 px-1"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* PARTICIPANT INFO */}
                              <td className="py-4 px-3">
                                <div className="min-w-0">
                                  <button
                                    onClick={() => setDetailParticipantId(p.id)}
                                    className="font-bold text-white hover:text-orange-300 transition-colors truncate text-left block cursor-pointer"
                                  >
                                    {p.name}
                                  </button>
                                  <div className="text-xs text-zinc-400 mt-0.5 truncate">
                                    {p.institution}
                                  </div>
                                </div>
                              </td>

                              {/* CATEGORY */}
                              <td className="py-4 px-3 whitespace-nowrap">
                                {getCategoryBadge(p.category)}
                              </td>

                              {/* STATUS */}
                              <td className="py-4 px-3 whitespace-nowrap">
                                <div className="flex flex-col gap-1 items-start">
                                  {getStatusBadge(p.status)}
                                  {p.status !== "Gugur" && tournamentStages[p.currentStageIdx ?? 0] && tournamentStages.length > 1 && (
                                    <span className="text-[10px] font-mono text-zinc-400">
                                      {tournamentStages[p.currentStageIdx ?? 0]?.name}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* SKOR (BERDASARKAN BABAK YANG SEDANG DIPILIH) */}
                              <td className="py-4 px-3 whitespace-nowrap text-center">
                                {selectedLeaderboardStage === "all" ? (
                                  <div className="flex flex-col items-center">
                                    <span className="font-mono text-base sm:text-lg font-black text-white">
                                      {((p as any).rawTotalPoints || 0).toLocaleString("id-ID")}
                                    </span>
                                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                                      TOTAL RAW SKOR
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <span className="font-mono text-base sm:text-lg font-black text-white">
                                      {((p as any).stageRawScore || 0).toLocaleString("id-ID")}
                                    </span>
                                    <span className="text-[10px] font-mono text-orange-400 font-bold uppercase tracking-wider">
                                      SKOR {activeLeaderboardStageObj?.name?.replace(/^Babak\s+/i, "") || `B${(targetLeaderboardStageIdx || 0) + 1}`}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* TOTAL POINTS */}
                              <td className="py-4 px-4 text-right whitespace-nowrap">
                                <div className="flex flex-col items-end">
                                  <span
                                    className={`font-mono text-lg font-extrabold ${
                                      isTop3
                                        ? "bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 bg-clip-text text-transparent"
                                        : "text-white"
                                    }`}
                                  >
                                    {p.totalPoints.toLocaleString("id-ID")}
                                  </span>
                                  <span className="text-[11px] text-zinc-500">
                                    Update: {p.lastUpdated}
                                  </span>
                                </div>
                              </td>

                              {/* AKSI: GUGUR & LANJUT KE BABAK SELANJUTNYA */}
                              <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  {/* Tombol Gugur / Batal Gugur */}
                                  {p.status === "Gugur" ? (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleGugur(p)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-all cursor-pointer shadow-sm"
                                      title="Batalkan status Gugur (Pulihkan menjadi Aktif)"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                                      <span>Batal Gugur</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleGugur(p)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-500/50 transition-all cursor-pointer shadow-sm"
                                      title="Nyatakan peserta ini Gugur"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Gugur</span>
                                    </button>
                                  )}

                                   {/* Tombol Lanjut ke Babak Selanjutnya / Batal Lanjut */}
                                  {(() => {
                                    if (p.status === "Gugur") return null;
                                    if (tournamentStages.length <= 1) return null;

                                    const currentIdx = p.currentStageIdx ?? 0;
                                    const isSpecificTab = targetLeaderboardStageIdx !== null;
                                    const tabIdx = isSpecificTab ? targetLeaderboardStageIdx : currentIdx;

                                    // Jika sedang di tab babak tertentu (misal Babak 1, Babak 2, dst)
                                    if (isSpecificTab) {
                                      // Jika peserta sudah lolos melewati babak ini -> Tampilkan tombol BATAL LANJUT
                                      if (currentIdx > tabIdx) {
                                        return (
                                          <button
                                            type="button"
                                            onClick={() => handleRevertStage(p, tabIdx)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-500/60 shadow-sm transition-all cursor-pointer"
                                            title={`Batalkan kelolosan (Kembali ke ${tournamentStages[tabIdx]?.name || "Babak Ini"})`}
                                          >
                                            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                                            <span>Batal Lanjut</span>
                                          </button>
                                        );
                                      }

                                      // Jika peserta sedang di babak tab ini
                                      if (currentIdx === tabIdx) {
                                        const nextIdx = tabIdx + 1;
                                        const hasNextStage = nextIdx < tournamentStages.length;
                                        
                                        // Jika ada babak berikutnya -> Tampilkan tombol Lanjut ke Babak Selanjutnya
                                        if (hasNextStage) {
                                          const nextStage = tournamentStages[nextIdx];
                                          return (
                                            <button
                                              type="button"
                                              onClick={() => handleAdvanceStage(p, nextIdx)}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 hover:border-emerald-500/60 shadow-sm transition-all cursor-pointer"
                                              title={`Loloskan ke ${nextStage?.name || "Babak Selanjutnya"}`}
                                            >
                                              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                                              <span>
                                                Lanjut {nextStage?.name ? nextStage.name : "ke Babak Selanjutnya"}
                                              </span>
                                            </button>
                                          );
                                        }

                                        // Jika sudah di babak terakhir dan bukan babak pertama -> bisa Batal Lanjut ke babak sebelumnya
                                        if (tabIdx > 0) {
                                          return (
                                            <button
                                              type="button"
                                              onClick={() => handleRevertStage(p, tabIdx - 1)}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-500/60 shadow-sm transition-all cursor-pointer"
                                              title={`Batalkan kelolosan Final (Kembali ke ${tournamentStages[tabIdx - 1]?.name || "Babak Sebelumnya"})`}
                                            >
                                              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                                              <span>Batal Lanjut</span>
                                            </button>
                                          );
                                        }

                                        return null;
                                      }

                                      // Peserta belum sampai babak tab ini
                                      return null;
                                    }

                                    // Tab "Semua Babak":
                                    // Jika peserta sudah lolos ke babak > 0 -> Batal Lanjut (mundur 1 babak)
                                    // Untuk lanjut ke babak selanjutnya lagi, buka tab babak terkait
                                    if (currentIdx > 0) {
                                      const prevIdx = currentIdx - 1;
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => handleRevertStage(p, prevIdx)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-500/60 shadow-sm transition-all cursor-pointer"
                                          title={`Batalkan kelolosan ke ${tournamentStages[currentIdx]?.name} (Kembali ke ${tournamentStages[prevIdx]?.name || "Babak Sebelumnya"})`}
                                        >
                                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                                          <span>Batal Lanjut</span>
                                        </button>
                                      );
                                    }

                                    // Jika masih di Babak 1 (currentIdx === 0)
                                    const nextStage = tournamentStages[1];
                                    if (!nextStage) return null;
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => handleAdvanceStage(p, 1)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 hover:border-emerald-500/60 shadow-sm transition-all cursor-pointer"
                                        title={`Loloskan ke ${nextStage?.name || "Babak Selanjutnya"}`}
                                      >
                                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>
                                          Lanjut {nextStage?.name ? nextStage.name : "ke Babak Selanjutnya"}
                                        </span>
                                      </button>
                                    );
                                  })()}

                                  {/* Icon Utilities: View, Edit, Delete */}
                                  <div className="flex items-center gap-1 pl-1 border-l border-zinc-800">
                                    <button
                                      type="button"
                                      onClick={() => setDetailParticipantId(p.id)}
                                      title="Lihat Profil & Kriteria Tim"
                                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingParticipant(p)}
                                      title="Edit Profil, Anggota, Skor"
                                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-orange-400 hover:text-orange-300 border border-zinc-800 transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => promptDeleteParticipant(p)}
                                      title="Hapus Peserta"
                                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}

        {/* TAB 2: BAGAN PERTANDINGAN (LIST JADWAL LAGA 2 TIM) */}
        {activeTab === "bracket" && (
          <section className="space-y-6">
            {tournamentStages.length === 0 ? (
              <div className="py-16 text-center rounded-2xl bg-[#121216]/95 border-2 border-dashed border-zinc-800 p-8 space-y-4 shadow-xl">
                <GitBranch className="w-12 h-12 text-zinc-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-base font-bold text-white">Belum Ada Babak Perlombaan</p>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    Silakan buat babak perlombaan terlebih dahulu di menu <strong>Pengaturan &gt; Setting Babak &amp; Model</strong> sebelum mengatur jadwal laga.
                  </p>
                </div>
                <Link
                  href="/pengaturan"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buka Pengaturan Babak</span>
                </Link>
              </div>
            ) : (
              <>
                {/* Header & Controls Bar */}
                <div className="bg-[#121216]/95 border border-zinc-800/90 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-orange-400">
                          JADWAL LAGA DUEL (2 TIM SEKALI MAIN)
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 font-mono text-[10px] font-bold">
                          {participants.length} Tim Terdaftar
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2.5">
                        <GitBranch className="w-6 h-6 text-orange-400" />
                        <span>Jadwal Laga Pertandingan Arena</span>
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                        Sistem poin/ranking. Tim diacak untuk tanding 2 tim sekali main. Skor laga otomatis masuk ke klasemen babak aktif.
                      </p>
                    </div>
                  </div>

              {/* Round Navigation Pills & Format Main Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
                <div className="flex flex-wrap items-center gap-2">
                  {tournamentStages.map((stage) => {
                    const matchCount = bracketMatches.filter((m) => m.round === stage.name).length;
                    const isActive = selectedBracketRound === stage.name;
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => setSelectedBracketRound(stage.name)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                          isActive
                            ? "bg-orange-500/15 border-orange-500 text-orange-300 shadow-sm"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                        }`}
                      >
                        <span>{stage.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
                          {stage.model === "ranking" ? "Ranking" : "Gugur"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          {stage.turns || "1x"}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                            stage.resetPoints !== false
                              ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {stage.resetPoints !== false ? "Reset 0" : "Bawa Poin"}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                            isActive ? "bg-orange-500/30 text-orange-200" : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {matchCount} Laga
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* List Laga Display */}
            {(() => {
              const currentMatches = bracketMatches.filter((m) => m.round === selectedBracketRound);

              if (currentMatches.length === 0) {
                return (
                  <div className="py-12 text-center rounded-2xl bg-[#121216]/95 border border-zinc-800/90 p-6 sm:p-8 space-y-6 shadow-xl">
                    <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 mx-auto">
                      <GitBranch className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-white">Belum Ada Jadwal Laga ({selectedBracketRound})</p>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto">
                        Jadwal pertandingan diacak dan dikelola melalui menu Pengaturan Turnamen.
                      </p>
                    </div>

                    {/* Daftar Tim Lolos ke Babak Ini */}
                    {qualifiedBracketParticipants.length > 0 ? (
                      <div className="max-w-4xl mx-auto pt-2 text-left">
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs font-mono">
                          <span className="text-orange-400 font-bold uppercase tracking-wider">
                            Daftar Tim Lolos ke {selectedBracketRound} ({qualifiedBracketParticipants.length} Tim):
                          </span>
                          <span className="text-zinc-500 text-[11px]">
                            Menunggu Jadwal Diacak di Pengaturan
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                          {qualifiedBracketParticipants.map((p, idx) => (
                            <div
                              key={p.id}
                              className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between shadow-sm"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-6 h-6 rounded-lg bg-orange-500/15 text-orange-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="truncate">
                                  <p className="font-bold text-white text-xs truncate">{p.name}</p>
                                  <p className="text-[10px] text-zinc-400 truncate">{p.institution}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                                Lolos
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 max-w-md mx-auto">
                        <p className="text-xs text-zinc-400">
                          Belum ada peserta yang dinyatakan lolos ke {selectedBracketRound}. Buka tab <strong>Daftar Peserta &amp; Klasemen</strong> untuk meloloskan tim.
                        </p>
                      </div>
                    )}

                    <div>
                      <Link
                        href="/pengaturan"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-orange-400" />
                        <span>Buka Pengaturan Bagan</span>
                      </Link>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Summary Header Pill */}
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-white">
                        {selectedBracketRound}:
                      </span>
                      <span className="text-zinc-400">
                        {qualifiedBracketParticipants.length} Tim Lolos
                      </span>
                    </div>
                    <span className="font-mono text-orange-400 font-bold">
                      {currentMatches.length} Laga Terjadwal
                    </span>
                  </div>

                  {currentMatches.map((match) => {
                    const instA = participants.find((p) => p.name === match.teamA)?.institution;
                    const instB = participants.find((p) => p.name === match.teamB)?.institution;
                    const isSingle = match.teamB === "- (Tanding Tunggal)";

                    const is2x = getMatchTurnsForRound(match.round) === "2x";
                    const activeLeg = (match.currentLeg || 1) as 1 | 2;
                    const isSwapped = is2x && activeLeg === 2;

                    // Corner team mappings:
                    // In 1x mode: Red = Team A, Blue = Team B
                    // In 2x mode Leg 1: Red = Team A, Blue = Team B
                    // In 2x mode Leg 2: Red = Team B, Blue = Team A (TUKAR SISI!)
                    const redTeamKey: "A" | "B" = isSwapped ? "B" : "A";
                    const blueTeamKey: "A" | "B" = isSwapped ? "A" : "B";

                    const redTeamName = isSwapped ? match.teamB : match.teamA;
                    const redInst = isSwapped ? instB : instA;
                    const redScore = is2x
                      ? (isSwapped ? match.scoreBLeg2 ?? 0 : match.scoreALeg1 ?? 0)
                      : match.scoreA;

                    const blueTeamName = isSwapped ? match.teamA : match.teamB;
                    const blueInst = isSwapped ? instA : instB;
                    const blueScore = is2x
                      ? (isSwapped ? match.scoreALeg2 ?? 0 : match.scoreBLeg1 ?? 0)
                      : match.scoreB;

                    return (
                      <div
                        key={match.id}
                        className="bg-[#121216]/95 border border-zinc-800/90 hover:border-zinc-700/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 transition-all"
                      >
                        {/* Match Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                          <div className="flex items-center gap-2.5">
                            <span className="px-3 py-1 rounded-lg bg-orange-500/20 text-orange-300 font-mono font-extrabold text-xs tracking-wider border border-orange-500/40">
                              {match.matchLabel}
                            </span>
                            <span className="text-xs text-zinc-400 font-medium">
                              {match.category || "Transporter SMP"} • {isSingle ? "1 Tim (Tanding Tunggal)" : is2x ? "2x Main (Tukar Sisi)" : "1x Main (Langsung Data)"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Tombol Lihat Log Poin Laga */}
                            <button
                              type="button"
                              onClick={() => setViewLogMatch(match)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-mono text-xs font-bold transition-all shadow-sm cursor-pointer"
                              title="Lihat riwayat log poin untuk laga ini"
                            >
                              <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                              <span>Log Poin</span>
                            </button>

                            {/* Tombol Reset Laga & Hapus Log */}
                            <button
                              type="button"
                              onClick={() => {
                                setResetMatchTarget(match);
                                setResetWithLogs(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-500/50 text-zinc-400 hover:text-rose-300 font-mono text-xs font-semibold transition-all shadow-sm cursor-pointer"
                              title="Reset skor dan hapus log laga ini"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset</span>
                            </button>

                            {/* Tombol Mulai Pertandingan dengan Animasi Shutter */}
                            <button
                              type="button"
                              disabled={Boolean(shutterMatch)}
                              onMouseEnter={() => {
                                try {
                                  router.prefetch(`/tanding/${match.id}`);
                                } catch {}
                              }}
                              onClick={() => handleStartMatchWithShutter(match)}
                              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-zinc-950 font-black text-xs hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] animate-pulse hover:animate-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                              title="Buka Arena Tanding & Timer Stopwatch"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Mulai Tanding</span>
                            </button>

                            {/* Quick Status Pill */}
                            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-xs">
                              {(["Siap Tanding", "Berlangsung", "Selesai"] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleSetMatchStatus(match.id, st)}
                                  className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                                    match.status === st
                                      ? st === "Berlangsung"
                                        ? "bg-orange-500 text-zinc-950 font-bold shadow-md shadow-orange-500/20"
                                        : st === "Selesai"
                                        ? "bg-emerald-500 text-zinc-950 font-bold"
                                        : "bg-amber-500 text-zinc-950 font-bold"
                                      : "text-zinc-400 hover:text-white"
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* BODY TAMPILAN LAGA */}
                        {is2x ? (
                          /* TAMPILAN 2X MAIN: PUTARAN 1 & PUTARAN 2 DIMUNCULKAN BERTINGKAT SEKALIGUS (NO TAB) */
                          <div className="space-y-4">
                            {/* BLOK PUTARAN 1 */}
                            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-black uppercase flex items-center gap-1.5">
                                  <span>⚔️ Putaran 1</span>
                                </span>
                                <span className="text-xs font-mono text-zinc-400">
                                  {isSingle ? (
                                    <>Skor P1: <strong className="text-white">{match.teamA} ({match.scoreALeg1 || 0})</strong> (Sudut Merah)</>
                                  ) : (
                                    <>Skor P1: <strong className="text-white">{match.teamA} ({match.scoreALeg1 || 0})</strong> vs <strong className="text-white">{match.teamB} ({match.scoreBLeg1 || 0})</strong></>
                                  )}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Sudut Merah Putaran 1: Team A */}
                                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-rose-500/30 space-y-2.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                        <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">
                                          Sudut Merah
                                        </span>
                                      </div>
                                      <h5 className="text-sm font-black text-white truncate mt-0.5">{match.teamA}</h5>
                                      {instA && <span className="text-[11px] text-zinc-400 block truncate">{instA}</span>}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[10px] font-mono text-zinc-400">Skor:</span>
                                      <input
                                        type="number"
                                        step="0.5"
                                        value={match.scoreALeg1 || 0}
                                        onChange={(e) => handleSetExactLegScore(match.id, "A", 1, parseFloat(e.target.value) || 0)}
                                        className="w-16 px-1.5 py-1 text-center font-mono text-base font-black rounded-lg bg-zinc-950 text-amber-400 border border-zinc-700"
                                      />
                                    </div>
                                  </div>

                                  {/* Quick Score Delta Buttons */}
                                  <div className="flex flex-wrap gap-1 pt-1.5 border-t border-zinc-800/60">
                                    {customPointRules.filter((r) => r.enabled).slice(0, 4).map((rule) => (
                                      <button
                                        key={rule.id}
                                        type="button"
                                        onClick={() => handleBracketLegScoreChange(match.id, "A", 1, rule.points, `${rule.points > 0 ? `+${rule.points}` : rule.points} ${rule.label}`)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                                          rule.points > 0 ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                        }`}
                                      >
                                        {rule.points > 0 ? `+${rule.points}` : rule.points} {rule.label}
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => handleBracketLegScoreChange(match.id, "A", 1, 1)}
                                      className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[10px] font-mono font-bold"
                                    >+1</button>
                                    <button
                                      type="button"
                                      onClick={() => handleBracketLegScoreChange(match.id, "A", 1, -1)}
                                      className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono font-bold"
                                    >-1</button>
                                  </div>
                                </div>

                                {/* Sudut Biru Putaran 1: Team B atau Placeholder Tanding Tunggal */}
                                {isSingle ? (
                                  <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 space-y-1.5 opacity-60">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-blue-500/50 shrink-0" />
                                      <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">
                                        Sudut Biru • Sesi 1
                                      </span>
                                    </div>
                                    <h5 className="text-sm font-bold text-zinc-500 italic mt-0.5">- (Tanding Tunggal)</h5>
                                    <p className="text-[11px] text-zinc-500">Tanpa lawan di Putaran 1. Tim bermain di Sudut Merah.</p>
                                  </div>
                                ) : (
                                  <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-blue-500/30 space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">
                                            Sudut Biru
                                          </span>
                                        </div>
                                        <h5 className="text-sm font-black text-white truncate mt-0.5">{match.teamB}</h5>
                                        {instB && <span className="text-[11px] text-zinc-400 block truncate">{instB}</span>}
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] font-mono text-zinc-400">Skor:</span>
                                        <input
                                          type="number"
                                          step="0.5"
                                          value={match.scoreBLeg1 || 0}
                                          onChange={(e) => handleSetExactLegScore(match.id, "B", 1, parseFloat(e.target.value) || 0)}
                                          className="w-16 px-1.5 py-1 text-center font-mono text-base font-black rounded-lg bg-zinc-950 text-amber-400 border border-zinc-700"
                                        />
                                      </div>
                                    </div>

                                    {/* Quick Score Delta Buttons */}
                                    <div className="flex flex-wrap gap-1 pt-1.5 border-t border-zinc-800/60">
                                      {customPointRules.filter((r) => r.enabled).slice(0, 4).map((rule) => (
                                        <button
                                          key={rule.id}
                                          type="button"
                                          onClick={() => handleBracketLegScoreChange(match.id, "B", 1, rule.points, `${rule.points > 0 ? `+${rule.points}` : rule.points} ${rule.label}`)}
                                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                                            rule.points > 0 ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                          }`}
                                        >
                                          {rule.points > 0 ? `+${rule.points}` : rule.points} {rule.label}
                                        </button>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => handleBracketLegScoreChange(match.id, "B", 1, 1)}
                                        className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[10px] font-mono font-bold"
                                      >+1</button>
                                      <button
                                        type="button"
                                        onClick={() => handleBracketLegScoreChange(match.id, "B", 1, -1)}
                                        className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono font-bold"
                                      >-1</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* BLOK PUTARAN 2 (TUKAR SISI) */}
                            <div className="p-4 rounded-xl bg-zinc-950/60 border border-orange-500/30 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="px-2.5 py-0.5 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 font-mono text-xs font-black uppercase flex items-center gap-1.5">
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                  <span>Putaran 2 (Tukar Sisi Arena)</span>
                                </span>
                                <span className="text-xs font-mono text-zinc-400">
                                  {isSingle ? (
                                    <>Skor P2: <strong className="text-white">{match.teamA} ({match.scoreALeg2 || 0})</strong> (Sudut Biru • Tukar Sisi)</>
                                  ) : (
                                    <>Skor P2: <strong className="text-white">{match.teamB} ({match.scoreBLeg2 || 0})</strong> vs <strong className="text-white">{match.teamA} ({match.scoreALeg2 || 0})</strong></>
                                  )}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Sudut Merah Putaran 2: Team B (Sisi Ditukar) atau Placeholder Tanding Tunggal */}
                                {isSingle ? (
                                  <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 space-y-1.5 opacity-60">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-rose-500/50 shrink-0" />
                                      <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">
                                        Sudut Merah • Sesi 2
                                      </span>
                                    </div>
                                    <h5 className="text-sm font-bold text-zinc-500 italic mt-0.5">- (Tanding Tunggal)</h5>
                                    <p className="text-[11px] text-zinc-500">Tanpa lawan di Putaran 2. Tim bermain di Sudut Biru (Tukar Sisi).</p>
                                  </div>
                                ) : (
                                  <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-rose-500/30 space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                          <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">
                                            Sudut Merah • Tukar Sisi
                                          </span>
                                        </div>
                                        <h5 className="text-sm font-black text-white truncate mt-0.5">{match.teamB}</h5>
                                        {instB && <span className="text-[11px] text-zinc-400 block truncate">{instB}</span>}
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] font-mono text-zinc-400">Skor:</span>
                                        <input
                                          type="number"
                                          step="0.5"
                                          value={match.scoreBLeg2 || 0}
                                          onChange={(e) => handleSetExactLegScore(match.id, "B", 2, parseFloat(e.target.value) || 0)}
                                          className="w-16 px-1.5 py-1 text-center font-mono text-base font-black rounded-lg bg-zinc-950 text-amber-400 border border-zinc-700"
                                        />
                                      </div>
                                    </div>

                                    {/* Quick Score Delta Buttons */}
                                    <div className="flex flex-wrap gap-1 pt-1.5 border-t border-zinc-800/60">
                                      {customPointRules.filter((r) => r.enabled).slice(0, 4).map((rule) => (
                                        <button
                                          key={rule.id}
                                          type="button"
                                          onClick={() => handleBracketLegScoreChange(match.id, "B", 2, rule.points, `${rule.points > 0 ? `+${rule.points}` : rule.points} ${rule.label}`)}
                                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                                            rule.points > 0 ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                          }`}
                                        >
                                          {rule.points > 0 ? `+${rule.points}` : rule.points} {rule.label}
                                        </button>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => handleBracketLegScoreChange(match.id, "B", 2, 1)}
                                        className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[10px] font-mono font-bold"
                                      >+1</button>
                                      <button
                                        type="button"
                                        onClick={() => handleBracketLegScoreChange(match.id, "B", 2, -1)}
                                        className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono font-bold"
                                      >-1</button>
                                    </div>
                                  </div>
                                )}

                                {/* Sudut Biru Putaran 2: Team A (Sisi Ditukar) */}
                                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-blue-500/30 space-y-2.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                        <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">
                                          Sudut Biru • Tukar Sisi
                                        </span>
                                      </div>
                                      <h5 className="text-sm font-black text-white truncate mt-0.5">{match.teamA}</h5>
                                      {instA && <span className="text-[11px] text-zinc-400 block truncate">{instA}</span>}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[10px] font-mono text-zinc-400">Skor:</span>
                                      <input
                                        type="number"
                                        step="0.5"
                                        value={match.scoreALeg2 || 0}
                                        onChange={(e) => handleSetExactLegScore(match.id, "A", 2, parseFloat(e.target.value) || 0)}
                                        className="w-16 px-1.5 py-1 text-center font-mono text-base font-black rounded-lg bg-zinc-950 text-amber-400 border border-zinc-700"
                                      />
                                    </div>
                                  </div>

                                  {/* Quick Score Delta Buttons */}
                                  <div className="flex flex-wrap gap-1 pt-1.5 border-t border-zinc-800/60">
                                    {customPointRules.filter((r) => r.enabled).slice(0, 4).map((rule) => (
                                      <button
                                        key={rule.id}
                                        type="button"
                                        onClick={() => handleBracketLegScoreChange(match.id, "A", 2, rule.points, `${rule.points > 0 ? `+${rule.points}` : rule.points} ${rule.label}`)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                                          rule.points > 0 ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                        }`}
                                      >
                                        {rule.points > 0 ? `+${rule.points}` : rule.points} {rule.label}
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => handleBracketLegScoreChange(match.id, "A", 2, 1)}
                                      className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[10px] font-mono font-bold"
                                    >+1</button>
                                    <button
                                      type="button"
                                      onClick={() => handleBracketLegScoreChange(match.id, "A", 2, -1)}
                                      className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono font-bold"
                                    >-1</button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* REKAPITULASI RATA-RATA AKHIR RESMI */}
                            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                              <span className="text-zinc-400 font-bold">
                                Skor Akhir Resmi Laga (Rata-rata: (P1 + P2) / 2):
                              </span>
                              <div className="flex items-center gap-3">
                                <span className={`px-2.5 py-1 rounded-lg border font-bold ${
                                  match.winner === "A" ? "bg-rose-500/20 text-rose-300 border-rose-500/50" : "bg-zinc-950 text-white border-zinc-800"
                                }`}>
                                  {match.teamA}: <strong className="text-amber-400 text-sm">{match.scoreA} PTS</strong>
                                </span>
                                <span className="text-zinc-600 font-bold">VS</span>
                                <span className={`px-2.5 py-1 rounded-lg border font-bold ${
                                  match.winner === "B" ? "bg-blue-500/20 text-blue-300 border-blue-500/50" : "bg-zinc-950 text-white border-zinc-800"
                                }`}>
                                  {match.teamB}: <strong className="text-amber-400 text-sm">{match.scoreB} PTS</strong>
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* STANDARD 1X MAIN / SINGLE */
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                            {!isSingle && (
                              <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-zinc-900 border-2 border-zinc-700 items-center justify-center text-[11px] font-black text-orange-400 shadow-lg">
                                VS
                              </div>
                            )}

                            {/* Team Corner (Red) */}
                            <div
                              className={`p-4 rounded-xl border space-y-3 transition-all ${
                                match.status === "Selesai" &&
                                (isSwapped ? match.scoreB > match.scoreA : match.scoreA > match.scoreB)
                                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                                  : "bg-zinc-900/70 border-zinc-800"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                                    <span className="text-[10px] font-bold text-rose-400 tracking-wider uppercase font-mono">
                                      {isSwapped
                                        ? "SUDUT MERAH • PUTARAN 2 (TUKAR SISI)"
                                        : is2x
                                        ? "SUDUT MERAH • PUTARAN 1"
                                        : "SUDUT MERAH"}
                                    </span>
                                  </div>
                                  <h4 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                                    {redTeamName}
                                  </h4>
                                  {redInst && <p className="text-xs text-zinc-400 truncate">{redInst}</p>}
                                  {is2x && (
                                    <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                                      P1: {isSwapped ? (match.scoreBLeg1 || 0) : (match.scoreALeg1 || 0)} | P2: {isSwapped ? (match.scoreBLeg2 || 0) : (match.scoreALeg2 || 0)} | Total: <strong className="text-zinc-300">{isSwapped ? match.scoreB : match.scoreA}</strong>
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-col items-end shrink-0">
                                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                                    {is2x ? `Skor P${activeLeg}` : "Skor Laga"}
                                  </span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={redScore}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      if (is2x) {
                                        handleSetExactLegScore(match.id, redTeamKey, activeLeg, val);
                                      } else {
                                        handleSetExactScore(match.id, "A", val);
                                      }
                                    }}
                                    className="w-20 px-2 py-1 text-center font-mono text-lg font-black rounded-xl bg-zinc-950 text-amber-400 border border-zinc-700 focus:outline-none focus:border-orange-500 shadow-inner"
                                  />
                                </div>
                              </div>

                              {/* Point Rules Shortcuts */}
                              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800/60">
                                {customPointRules
                                  .filter((r) => r.enabled)
                                  .map((rule) => (
                                    <button
                                      key={rule.id}
                                      type="button"
                                      onClick={() => {
                                        if (is2x) {
                                          handleBracketLegScoreChange(match.id, redTeamKey, activeLeg, rule.points);
                                        } else {
                                          handleBracketScoreChange(match.id, "A", rule.points);
                                        }
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all flex items-center gap-1 ${
                                        rule.points > 0
                                          ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                          : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30"
                                      }`}
                                    >
                                      {rule.hotkeyRed && (
                                        <kbd className="px-1.5 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-500/40 text-[9px] font-black shadow-sm">
                                          {rule.hotkeyRed}
                                        </kbd>
                                      )}
                                      <span>
                                        {rule.points > 0 ? `+${rule.points}` : rule.points} {rule.label}
                                      </span>
                                    </button>
                                  ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (is2x) {
                                      handleBracketLegScoreChange(match.id, redTeamKey, activeLeg, 1);
                                    } else {
                                      handleBracketScoreChange(match.id, "A", 1);
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold"
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (is2x) {
                                      handleBracketLegScoreChange(match.id, redTeamKey, activeLeg, -1);
                                    } else {
                                      handleBracketScoreChange(match.id, "A", -1);
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-mono font-bold"
                                >
                                  -1
                                </button>
                              </div>
                            </div>

                            {/* Team Corner (Blue) */}
                            <div
                              className={`p-4 rounded-xl border space-y-3 transition-all ${
                                match.status === "Selesai" &&
                                (isSwapped ? match.scoreA > match.scoreB : match.scoreB > match.scoreA)
                                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                                  : isSingle
                                  ? "bg-zinc-950/40 border-zinc-800/50 border-dashed flex items-center justify-center text-zinc-500 text-xs italic"
                                  : "bg-zinc-900/70 border-zinc-800"
                              }`}
                            >
                              {isSingle ? (
                                <div className="py-6 text-center space-y-1">
                                  <span className="text-xs font-semibold text-zinc-400 block">- Tanding Tunggal (Solo) -</span>
                                  <span className="text-[11px] text-zinc-500">Jumlah tim ganjil, bertanding tanpa lawan langsung</span>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                                        <span className="text-[10px] font-bold text-blue-400 tracking-wider uppercase font-mono">
                                          {isSwapped
                                            ? "SUDUT BIRU • PUTARAN 2 (TUKAR SISI)"
                                            : is2x
                                            ? "SUDUT BIRU • PUTARAN 1"
                                            : "SUDUT BIRU"}
                                        </span>
                                      </div>
                                      <h4 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                                        {blueTeamName}
                                      </h4>
                                      {blueInst && <p className="text-xs text-zinc-400 truncate">{blueInst}</p>}
                                      {is2x && (
                                        <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                                          P1: {isSwapped ? (match.scoreALeg1 || 0) : (match.scoreBLeg1 || 0)} | P2: {isSwapped ? (match.scoreALeg2 || 0) : (match.scoreBLeg2 || 0)} | Total: <strong className="text-zinc-300">{isSwapped ? match.scoreA : match.scoreB}</strong>
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex flex-col items-end shrink-0">
                                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                                        {is2x ? `Skor P${activeLeg}` : "Skor Laga"}
                                      </span>
                                      <input
                                        type="number"
                                        step="0.5"
                                        value={blueScore}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          if (is2x) {
                                            handleSetExactLegScore(match.id, blueTeamKey, activeLeg, val);
                                          } else {
                                            handleSetExactScore(match.id, "B", val);
                                          }
                                        }}
                                        className="w-20 px-2 py-1 text-center font-mono text-lg font-black rounded-xl bg-zinc-950 text-amber-400 border border-zinc-700 focus:outline-none focus:border-orange-500 shadow-inner"
                                      />
                                    </div>
                                  </div>

                                  {/* Point Rules Shortcuts */}
                                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800/60">
                                    {customPointRules
                                      .filter((r) => r.enabled)
                                      .map((rule) => (
                                        <button
                                          key={rule.id}
                                          type="button"
                                          onClick={() => {
                                            if (is2x) {
                                              handleBracketLegScoreChange(match.id, blueTeamKey, activeLeg, rule.points);
                                            } else {
                                              handleBracketScoreChange(match.id, "B", rule.points);
                                            }
                                          }}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all flex items-center gap-1 ${
                                            rule.points > 0
                                              ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                              : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30"
                                          }`}
                                        >
                                          {rule.hotkeyBlue && (
                                            <kbd className="px-1.5 py-0.5 rounded bg-blue-950/90 text-blue-300 border border-blue-500/40 text-[9px] font-black shadow-sm">
                                              {rule.hotkeyBlue}
                                            </kbd>
                                          )}
                                          <span>
                                            {rule.points > 0 ? `+${rule.points}` : rule.points} {rule.label}
                                          </span>
                                        </button>
                                      ))}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (is2x) {
                                          handleBracketLegScoreChange(match.id, blueTeamKey, activeLeg, 1);
                                        } else {
                                          handleBracketScoreChange(match.id, "B", 1);
                                        }
                                      }}
                                      className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold"
                                    >
                                      +1
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (is2x) {
                                          handleBracketLegScoreChange(match.id, blueTeamKey, activeLeg, -1);
                                        } else {
                                          handleBracketScoreChange(match.id, "B", -1);
                                        }
                                      }}
                                      className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-mono font-bold"
                                    >
                                      -1
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
              </>
            )}
          </section>
        )}

        {/* TAB 3: MATRIKS PENILAIAN KRITERIA JURI */}
        {activeTab === "judging" && (
          <section className="bg-[#121216]/95 border border-zinc-800/90 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-orange-400" />
                  <span>Matriks Penilaian Kriteria Dewan Juri (Babak 3 Grand Final)</span>
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                  Setiap kriteria memiliki bobot maksimal{" "}
                  <span className="text-zinc-200 font-mono">250 Poin</span>. Nilai diperbarui
                  secara otomatis ke sistem.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    <th className="py-3.5 pl-6 pr-3">Rank & Peserta</th>
                    <th className="py-3.5 px-3 text-center">1. Eksekusi Teknis (0-250)</th>
                    <th className="py-3.5 px-3 text-center">2. Inovasi & Solusi (0-250)</th>
                    <th className="py-3.5 px-3 text-center">3. Kecepatan & Akurasi (0-250)</th>
                    <th className="py-3.5 px-3 text-center">4. Presentasi & Strategi (0-250)</th>
                    <th className="py-3.5 px-4 text-right">Skor Babak 3</th>
                    <th className="py-3.5 pl-3 pr-6 text-right">Total Poin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-sm">
                  {globallyRankedParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400">
                        Belum ada peserta terdaftar untuk penilaian juri.
                      </td>
                    </tr>
                  ) : (
                    globallyRankedParticipants.map((p) => {
                    const crit = p.criteria || {
                      teknis: 200,
                      inovasi: 200,
                      kecepatan: 200,
                      presentasi: 200,
                    };
                    return (
                      <tr key={p.id} className="hover:bg-zinc-900/50">
                        <td className="py-4 pl-6 pr-3">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs font-bold flex items-center justify-center text-orange-400">
                              #{p.currentRank}
                            </span>
                            <div>
                              <p className="font-bold text-white">{p.name}</p>
                              <p className="text-xs text-zinc-400">{p.institution}</p>
                            </div>
                          </div>
                        </td>

                        {(["teknis", "inovasi", "kecepatan", "presentasi"] as const).map(
                          (field) => (
                            <td key={field} className="py-4 px-3 text-center">
                              <div className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1">
                                <button
                                  onClick={() =>
                                    handleUpdateCriteria(p.id, field, crit[field] - 10)
                                  }
                                  className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300"
                                >
                                  -10
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={250}
                                  value={crit[field]}
                                  onChange={(e) =>
                                    handleUpdateCriteria(p.id, field, Number(e.target.value))
                                  }
                                  className="w-14 text-center bg-transparent font-mono text-sm font-bold text-white focus:outline-none"
                                />
                                <button
                                  onClick={() =>
                                    handleUpdateCriteria(p.id, field, crit[field] + 10)
                                  }
                                  className="px-1.5 py-0.5 rounded bg-orange-500/20 hover:bg-orange-500/30 text-xs font-mono text-orange-300"
                                >
                                  +10
                                </button>
                              </div>
                            </td>
                          )
                        )}

                        <td className="py-4 px-4 text-right font-mono font-bold text-orange-400">
                          {p.scores.babak3} PTS
                        </td>
                        <td className="py-4 pl-3 pr-6 text-right font-mono text-base font-extrabold text-yellow-400">
                          {p.totalPoints.toLocaleString("id-ID")} PTS
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* MODULAR MODAL 1: DETAIL PROFIL TIM & RINCIAN KRITERIA */}
      <ParticipantDetailModal
        isOpen={!!detailParticipant}
        participant={detailParticipant}
        onClose={() => setDetailParticipantId(null)}
        onEdit={(p) => setEditingParticipant(p)}
        onDelete={(p) => {
          setDetailParticipantId(null);
          promptDeleteParticipant(p);
        }}
      />

      {/* MODULAR MODAL 2: FULL CRUD EDIT PROFIL TIM, ANGGOTA & SKOR */}
      <ParticipantEditModal
        isOpen={!!editingParticipant}
        participant={editingParticipant}
        categories={categories}
        onClose={() => setEditingParticipant(null)}
        onSave={(updated, note) => handleSaveEditModal(updated, note)}
        onDelete={(p) => {
          setEditingParticipant(null);
          promptDeleteParticipant(p);
        }}
      />

      {/* MODULAR MODAL 3: SPOTLIGHT JUARA */}
      <SpotlightModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        topParticipants={globallyRankedParticipants}
      />

      {/* MODAL VIEW RANKING (LAYAR KLASEMEN SAAT JEDA / BREAK MATCH) */}
      <ViewRankingModal
        isOpen={isViewRankingOpen}
        onClose={() => setIsViewRankingOpen(false)}
        participants={globallyRankedParticipants}
        stages={tournamentStages}
        activeRound={activeRound}
        roundTitle={activeStage?.name || "Klasemen Poin"}
      />

      {/* MODULAR MODAL 4: KONFIRMASI HAPUS PESERTA */}
      <ConfirmModal
        isOpen={!!deletingParticipant}
        onClose={() => setDeletingParticipant(null)}
        onConfirm={handleConfirmDeleteParticipant}
        title="Hapus Peserta"
        message={`Apakah Anda yakin ingin menghapus peserta "${deletingParticipant?.name}"?`}
        subMessage="Data tim, riwayat skor, dan anggota akan dihapus secara permanen dari sistem."
        confirmText="Ya, Hapus Tim"
        cancelText="Batal"
        variant="danger"
      />

      {/* MODAL 5: FULLSCREEN ARENA STOPWATCH & MATCH CLOCK */}
      {isBigTimerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl p-6 sm:p-12 animate-in fade-in">
          <div className="absolute top-6 right-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Audio Arena Aktif (Klik untuk matikan)" : "Audio Arena Mati (Klik untuk aktifkan)"}
              className={`p-3 rounded-2xl border transition-all shadow-xl ${
                soundEnabled
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {soundEnabled ? <Volume2 className="w-6 h-6 text-amber-400" /> : <VolumeX className="w-6 h-6 text-zinc-500" />}
            </button>
            <button
              onClick={() => setIsBigTimerOpen(false)}
              title="Tutup Layar Penuh"
              className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all shadow-xl"
            >
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>

          <div className="max-w-4xl w-full text-center space-y-8">
            <div className="flex items-center justify-center gap-3">
              <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.3em] text-orange-400 font-bold">
                NUSANTARA NEXT ARENA • LIVE ARENA CLOCK
              </span>
            </div>

            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-zinc-800 bg-zinc-900/90 text-sm sm:text-base font-bold font-mono tracking-widest uppercase shadow-2xl">
              <span
                className={`w-3.5 h-3.5 rounded-full ${
                  isTimerRunning
                    ? timerPhase === "preparation"
                      ? "bg-amber-400 animate-ping"
                      : "bg-emerald-400 animate-ping"
                    : "bg-zinc-600"
                }`}
              />
              {timerPhase === "preparation" ? (
                <span className="text-amber-400">WAKTU PERSIAPAN (PREPARATION)</span>
              ) : timerPhase === "prep_ended" ? (
                <span className="text-yellow-400">PERSIAPAN SELESAI (00:00) • SIAP START!</span>
              ) : timerPhase === "countdown" ? (
                <span className="text-orange-400">HITUNG MUNDUR START (3-2-1)</span>
              ) : timerPhase === "match" ? (
                <span className="text-emerald-400">PERTANDINGAN BERJALAN (STOPWATCH LIVE)</span>
              ) : timerPhase === "paused" ? (
                <span className="text-amber-400">PERTANDINGAN DIJEDA</span>
              ) : timerPhase === "finished" ? (
                <span className="text-rose-400">PERTANDINGAN SELESAI (CATATAN WAKTU FINAL)</span>
              ) : (
                <span className="text-zinc-400">STANDBY ARENA</span>
              )}
            </div>

            {/* Giant Mega Digits */}
            {timerPhase === "countdown" ? (
              <div className="font-mono text-8xl sm:text-[11rem] md:text-[15rem] font-black text-amber-400 drop-shadow-[0_0_80px_rgba(245,158,11,0.7)] tracking-tight animate-bounce">
                {timerSeconds}
              </div>
            ) : (
              <div className="font-mono text-7xl sm:text-9xl md:text-[11rem] font-black bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_60px_rgba(249,115,22,0.4)] tracking-tight">
                {formatTimerDisplay(timerSeconds)}
              </div>
            )}

            {/* Sub-info / Progress */}
            <div className="max-w-xl mx-auto space-y-4">
              {timerPhase === "countdown" && (
                <p className="text-orange-400 font-mono text-xl sm:text-2xl font-bold animate-pulse">
                  Bersiap di arena... Pertandingan dimulai dalam {timerSeconds} detik!
                </p>
              )}
              {timerPhase === "prep_ended" && (
                <p className="text-yellow-300 font-mono text-lg font-bold">
                  Waktu persiapan telah selesai. Bersiap untuk hitung mundur start!
                </p>
              )}
              {timerPhase === "match" && matchLimit > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-mono text-zinc-400">
                    <span>Start: 00:00</span>
                    <span className="text-orange-400 font-bold">
                      Batas Maksimal: {formatTimerDisplay(matchLimit)}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-3.5 overflow-hidden border border-zinc-800 p-0.5">
                    <div
                      className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round((timerSeconds / matchLimit) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {timerPhase === "preparation" && (
                <p className="text-amber-300/90 font-mono text-base font-semibold">
                  Hitung mundur waktu persiapan tim di arena (Sisa {timerSeconds} detik)
                </p>
              )}
              {timerPhase === "finished" && (
                <p className="text-emerald-400 font-mono text-xl font-bold">
                  Catatan Waktu Resmi: {formatTimerDisplay(timerSeconds)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Point Notification Toast */}
      {pointToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div
            className={`px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 backdrop-blur-md ${
              pointToast.isPositive
                ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-900/30"
                : "bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-rose-900/30"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-black font-mono text-sm shrink-0 ${
                pointToast.isPositive ? "bg-emerald-500 text-zinc-950" : "bg-rose-500 text-white"
              }`}
            >
              {pointToast.isPositive ? "+" : "-"}
            </div>
            <div>
              <p className="text-xs font-bold text-white">Poin Berhasil Diperbarui</p>
              <p className="text-[11px] font-mono text-zinc-300">{pointToast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIHAT LOG POIN LAGA */}
      {viewLogMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#121216] border border-zinc-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header Modal */}
            <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between gap-4 bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ScrollText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white font-mono">
                      Log Poin {viewLogMatch.matchLabel}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono font-bold">
                      {viewLogMatch.round}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/40 text-orange-300 text-xs font-mono font-bold">
                      {viewMatchIs2x ? "2x Main (Tukar Sisi)" : "1x Main"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    {viewLogMatch.teamA} vs {viewLogMatch.teamB}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewLogMatch(null)}
                className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ringkasan Skor 2 Sesi (Jika 2x Main) */}
            {viewMatchIs2x && (
              <div className="px-5 py-2.5 bg-zinc-900/90 border-b border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
                <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <span className="text-amber-300 font-bold">🟡 SESI 1 (P1):</span>
                  <span className="text-white font-black">
                    {viewLogMatch.teamA} ({viewLogMatch.scoreALeg1 || 0}) vs {viewLogMatch.teamB} ({viewLogMatch.scoreBLeg1 || 0})
                  </span>
                </div>
                <div className="px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between">
                  <span className="text-orange-300 font-bold">🟠 SESI 2 (P2 Tukar Sisi):</span>
                  <span className="text-white font-black">
                    {viewLogMatch.teamB} ({viewLogMatch.scoreBLeg2 || 0}) vs {viewLogMatch.teamA} ({viewLogMatch.scoreALeg2 || 0})
                  </span>
                </div>
                <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <span className="text-emerald-300 font-bold">🏆 Rata-Rata Akhir:</span>
                  <span className="text-white font-black">
                    {viewLogMatch.teamA}: {viewLogMatch.scoreA} | {viewLogMatch.teamB}: {viewLogMatch.scoreB}
                  </span>
                </div>
              </div>
            )}

            {/* Sub-toolbar: Pilihan View Mode Terpisah & Tombol Hapus Log */}
            <div className="px-5 py-3 bg-zinc-950/60 border-b border-zinc-800/60 flex flex-wrap items-center justify-between gap-3">
              {/* Tab Selector Mode Terpisah */}
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setDashboardLogViewMode("split")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    dashboardLogViewMode === "split"
                      ? "bg-amber-400 text-zinc-950 shadow"
                      : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  Dua Sesi Terpisah {viewMatchIs2x ? "(Sesi 1 & Sesi 2)" : "(Tim A & B)"}
                </button>

                {viewMatchIs2x ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setDashboardLogViewMode("p1")}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        dashboardLogViewMode === "p1"
                          ? "bg-amber-500 text-zinc-950 shadow"
                          : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      🟡 Sesi 1 / Putaran 1 ({p1MatchLogs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDashboardLogViewMode("p2")}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        dashboardLogViewMode === "p2"
                          ? "bg-orange-500 text-zinc-950 shadow"
                          : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      🟠 Sesi 2 / Putaran 2 ({p2MatchLogs.length})
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setDashboardLogViewMode("p1")}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        dashboardLogViewMode === "p1"
                          ? "bg-rose-500 text-white shadow"
                          : "bg-zinc-900 text-rose-300 hover:text-white border border-zinc-800"
                      }`}
                    >
                      🔴 {viewLogMatch.teamA} ({matchLogs.filter(l => l.participantName?.toLowerCase() === viewLogMatch.teamA?.toLowerCase()).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDashboardLogViewMode("p2")}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        dashboardLogViewMode === "p2"
                          ? "bg-blue-500 text-white shadow"
                          : "bg-zinc-900 text-blue-300 hover:text-white border border-zinc-800"
                      }`}
                    >
                      🔵 {viewLogMatch.teamB} ({matchLogs.filter(l => l.participantName?.toLowerCase() === viewLogMatch.teamB?.toLowerCase()).length})
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setDashboardLogViewMode("all")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    dashboardLogViewMode === "all"
                      ? "bg-zinc-700 text-white shadow"
                      : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  Semua ({matchLogs.length})
                </button>
              </div>

              {matchLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleClearLogsOnly(viewLogMatch.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ml-auto"
                  title="Hapus semua rekaman log poin untuk laga ini dari database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Seluruh Log Laga Ini</span>
                </button>
              )}
            </div>

            {/* List Logs Content: Terpisah Dua Sesi atau Mode Tunggal */}
            <div className="p-5 overflow-y-auto flex-1 font-mono text-xs">
              {matchLogs.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 font-mono space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-zinc-600 mb-1" />
                  <p className="text-sm font-bold text-zinc-400">Belum Ada Catatan Log Poin</p>
                  <p className="text-xs text-zinc-600">
                    Log otomatis tercatat saat pertandingan dimainkan di arena tanding atau bagan.
                  </p>
                </div>
              ) : dashboardLogViewMode === "split" ? (
                /* DUA KOLOM TERPISAH (SESI 1 & SESI 2) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Kolom 1 (Sesi 1 / Putaran 1 atau Tim A) */}
                  <div className="bg-zinc-950/60 border border-amber-500/30 rounded-2xl p-4 flex flex-col space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                      <div>
                        <span className="font-bold text-amber-300 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          {viewMatchIs2x ? "SESI 1 • PUTARAN 1" : `TIM A • ${viewLogMatch.teamA}`}
                        </span>
                        {viewMatchIs2x && (
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            🔴 {viewLogMatch.teamA} ({viewLogMatch.scoreALeg1 || 0}) vs 🔵 {viewLogMatch.teamB} ({viewLogMatch.scoreBLeg1 || 0})
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {viewMatchIs2x
                          ? `${p1MatchLogs.length} Log`
                          : `${matchLogs.filter(l => l.participantName?.toLowerCase() === viewLogMatch.teamA?.toLowerCase()).length} Log`}
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-zinc-800/40">
                      {(viewMatchIs2x
                        ? p1MatchLogs
                        : matchLogs.filter(l => l.participantName?.toLowerCase() === viewLogMatch.teamA?.toLowerCase())
                      ).length === 0 ? (
                        <p className="text-zinc-600 py-6 text-center text-[11px]">Belum ada catatan log di Sesi 1.</p>
                      ) : (
                        (viewMatchIs2x
                          ? p1MatchLogs
                          : matchLogs.filter(l => l.participantName?.toLowerCase() === viewLogMatch.teamA?.toLowerCase())
                        ).map((log) => {
                          const parsed = parsePointLogItem(log, viewLogMatch, viewMatchIs2x);
                          return (
                            <div
                              key={log.id}
                              className="pt-2 first:pt-0 flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-zinc-800/20"
                            >
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-black text-[10px] flex items-center gap-1"
                                  title="Waktu Stopwatch Pertandingan"
                                >
                                  <Clock className="w-2.5 h-2.5 text-amber-400" />
                                  {parsed.swTime}
                                </span>
                                <span
                                  className="text-[10px] text-zinc-500"
                                  title="Jam Riil Aktivitas"
                                >
                                  {parsed.clockTime}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    parsed.corner === "red"
                                      ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                                      : "bg-blue-500/15 border-blue-500/40 text-blue-300"
                                  }`}
                                >
                                  {log.participantName}
                                </span>
                                <span className="text-zinc-200 font-sans text-[11px] font-medium">
                                  {parsed.cleanAction}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[11px] border shrink-0 ${
                                  log.delta > 0
                                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                                    : "bg-rose-500/15 border-rose-500/40 text-rose-300"
                                }`}
                              >
                                {log.delta > 0 ? `+${log.delta}` : log.delta}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Kolom 2 (Sesi 2 / Putaran 2 Tukar Sisi atau Tim B) */}
                  <div className="bg-zinc-950/60 border border-orange-500/30 rounded-2xl p-4 flex flex-col space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                      <div>
                        <span className="font-bold text-orange-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                          {viewMatchIs2x ? "SESI 2 • PUTARAN 2 (TUKAR SISI)" : `TIM B • ${viewLogMatch.teamB}`}
                        </span>
                        {viewMatchIs2x && (
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            🔴 {viewLogMatch.teamB} ({viewLogMatch.scoreBLeg2 || 0}) vs 🔵 {viewLogMatch.teamA} ({viewLogMatch.scoreALeg2 || 0})
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-300 border border-orange-500/30">
                        {viewMatchIs2x
                          ? `${p2MatchLogs.length} Log`
                          : `${matchLogs.filter(l => l.participantName?.toLowerCase() === viewLogMatch.teamB?.toLowerCase()).length} Log`}
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-zinc-800/40">
                      {(viewMatchIs2x
                        ? p2MatchLogs
                        : matchLogs.filter(l => l.participantName?.toLowerCase() === viewLogMatch.teamB?.toLowerCase())
                      ).length === 0 ? (
                        <p className="text-zinc-600 py-6 text-center text-[11px]">Belum ada catatan log di Sesi 2.</p>
                      ) : (
                        (viewMatchIs2x
                          ? p2MatchLogs
                          : matchLogs.filter(l => l.participantName?.toLowerCase() === viewLogMatch.teamB?.toLowerCase())
                        ).map((log) => {
                          const parsed = parsePointLogItem(log, viewLogMatch, viewMatchIs2x);
                          return (
                            <div
                              key={log.id}
                              className="pt-2 first:pt-0 flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-zinc-800/20"
                            >
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-black text-[10px] flex items-center gap-1"
                                  title="Waktu Stopwatch Pertandingan"
                                >
                                  <Clock className="w-2.5 h-2.5 text-amber-400" />
                                  {parsed.swTime}
                                </span>
                                <span
                                  className="text-[10px] text-zinc-500"
                                  title="Jam Riil Aktivitas"
                                >
                                  {parsed.clockTime}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    parsed.corner === "red"
                                      ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                                      : "bg-blue-500/15 border-blue-500/40 text-blue-300"
                                  }`}
                                >
                                  {log.participantName}
                                </span>
                                <span className="text-zinc-200 font-sans text-[11px] font-medium">
                                  {parsed.cleanAction}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[11px] border shrink-0 ${
                                  log.delta > 0
                                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                                    : "bg-rose-500/15 border-rose-500/40 text-rose-300"
                                }`}
                              >
                                {log.delta > 0 ? `+${log.delta}` : log.delta}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* DAFTAR LOG SESUAI TAB YANG DIPILIH */
                <div className="space-y-2 divide-y divide-zinc-800/40 max-h-80 overflow-y-auto pr-1">
                  {(dashboardLogViewMode === "p1"
                    ? viewMatchIs2x
                      ? p1MatchLogs
                      : matchLogs.filter(l => l.participantName?.toLowerCase() === viewLogMatch.teamA?.toLowerCase())
                    : dashboardLogViewMode === "p2"
                    ? viewMatchIs2x
                      ? p2MatchLogs
                      : matchLogs.filter(l => l.participantName?.toLowerCase() === viewLogMatch.teamB?.toLowerCase())
                    : matchLogs
                  ).map((log) => {
                    const parsed = parsePointLogItem(log, viewLogMatch, viewMatchIs2x);
                    return (
                      <div
                        key={log.id}
                        className="pt-2.5 first:pt-0 flex flex-wrap items-center justify-between gap-3 hover:bg-zinc-800/20 p-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            {parsed.swTime}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {parsed.clockTime}
                          </span>
                          {viewMatchIs2x && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                parsed.leg === 1
                                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                                  : "bg-orange-500/15 border-orange-500/40 text-orange-300"
                              }`}
                            >
                              SESI {parsed.leg} (P{parsed.leg})
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                              parsed.corner === "red"
                                ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                                : "bg-blue-500/15 border-blue-500/40 text-blue-300"
                            }`}
                          >
                            {log.participantName}
                          </span>
                          <span className="text-zinc-200 font-sans text-xs font-medium">
                            {parsed.cleanAction}
                          </span>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs border ${
                            log.delta > 0
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                              : "bg-rose-500/15 border-rose-500/40 text-rose-300"
                          }`}
                        >
                          {log.delta > 0 ? `+${log.delta}` : log.delta} PTS
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/30 flex justify-end">
              <button
                type="button"
                onClick={() => setViewLogMatch(null)}
                className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESET LAGA TERTENTU */}
      {resetMatchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#121216] border border-rose-500/40 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-mono">
                  Reset Laga {resetMatchTarget.matchLabel}?
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  {resetMatchTarget.teamA} vs {resetMatchTarget.teamB} ({resetMatchTarget.round})
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 text-xs font-mono text-zinc-300 space-y-2">
              <p>
                ⚠️ Skor laga akan direset kembali menjadi <strong className="text-amber-400">0</strong>, status pertandingan diubah ke <strong className="text-white">Siap Tanding</strong>, dan pemenang dikosongkan.
              </p>
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={resetWithLogs}
                onChange={(e) => setResetWithLogs(e.target.checked)}
                className="w-4 h-4 rounded text-rose-500 bg-zinc-950 border-zinc-700 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-mono text-zinc-300 font-medium">
                Hapus juga seluruh riwayat Log Poin untuk laga ini
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetMatchTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-mono text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleResetSingleMatch(resetMatchTarget.id, resetWithLogs)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-black shadow-lg shadow-rose-900/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ya, Reset Laga</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ANIMASI SHUTTER TRANSISI MULAI PERTANDINGAN */}
      <ArenaShutterTransition
        isActive={Boolean(shutterMatch)}
        matchLabel={shutterMatch?.matchLabel}
        category={shutterMatch?.category}
        teamA={shutterMatch?.teamA}
        teamB={shutterMatch?.teamB}
        round={shutterMatch?.round}
        onComplete={() => {
          if (shutterMatch) {
            router.push(`/tanding/${shutterMatch.id}`);
          }
        }}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-[#070709] py-4 px-6 text-center text-xs text-zinc-500">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 <strong className="text-zinc-300">NEXT ARENA</strong> — NUSANTARA NEXT
            Competition Management System
          </span>
          <span className="tracking-[0.2em] uppercase text-[11px] bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent font-semibold">
            THE PLACE TO PLAY
          </span>
        </div>
      </footer>
    </div>
  );
}

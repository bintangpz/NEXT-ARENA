"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArenaShutterTransition } from "@/components/ArenaShutterTransition";
import {
  ArrowLeft,
  UserPlus,
  Timer,
  Sliders,
  Megaphone,
  Tag,
  FileSpreadsheet,
  RotateCcw,
  Plus,
  Trash2,
  Save,
  Check,
  Building2,
  MapPin,
  Sparkles,
  Download,
  Upload,
  Play,
  Pause,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Layers,
  Trophy,
  GitBranch,
  Award,
  StopCircle,
  Monitor,
  Volume2,
  VolumeX,
  Zap,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  FastForward,
  Music,
  Square,
  Repeat,
  Pencil,
  PlusCircle,
  MinusCircle,
  Flag,
  Keyboard,
  ArrowLeftRight,
  ArrowUp,
  ArrowDown,
  Swords,
  ScrollText,
  X,
  Shuffle,
  Users,
  UserCheck,
  Edit3,
} from "lucide-react";
import { ArenaLogo } from "@/components/ArenaLogo";
import { ConfirmModal } from "@/components/modals";
import { playSound, stopSound, stopAllSounds, SoundEventType } from "@/lib/soundEffects";
import { filterLogsForBracketMatch } from "@/lib/scoreBreakdown";
import { resolveMatchWinner } from "@/lib/tieBreaker";
import {
  CATEGORIES as DEFAULT_CATEGORIES,
  CompetitionCategory,
  Participant,
  ParticipantStatus,
  TeamMember,
  BracketMatch,
  PointLog,
  CustomPointRule,
  CustomPointType,
  CustomPointColor,
  DEFAULT_POINT_RULES,
  POINT_COLOR_MAP,
  TournamentStage,
  DEFAULT_TOURNAMENT_STAGES,
  isStageResetPoints,
} from "@/data/mockCompetition";

export default function PengaturanPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"peserta" | "babak" | "bracket" | "timer" | "point" | "ticker_kategori" | "backup">("peserta");
  const [categories, setCategories] = useState<CompetitionCategory[]>(DEFAULT_CATEGORIES);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);
  const [resetMatchTarget, setResetMatchTarget] = useState<BracketMatch | null>(null);
  const [resetWithLogs, setResetWithLogs] = useState<boolean>(true);
  const [selectedBracketRound, setSelectedBracketRound] = useState<string>(() => DEFAULT_TOURNAMENT_STAGES[0]?.name || "Babak 1");
  const [isGeneratingBracket, setIsGeneratingBracket] = useState<boolean>(false);
  const [showResetBracketModal, setShowResetBracketModal] = useState<boolean>(false);
  const [showResetRoundModal, setShowResetRoundModal] = useState<boolean>(false);

  // Manual Bracket Matchmaking & Quick Editing State
  const [showManualBracketModal, setShowManualBracketModal] = useState<boolean>(false);
  const [manualMatchPairs, setManualMatchPairs] = useState<
    Array<{ id: string; teamA: string; teamB: string; label?: string }>
  >([]);
  const [isSavingManualBracket, setIsSavingManualBracket] = useState<boolean>(false);

  const [editingMatchCardId, setEditingMatchCardId] = useState<string | null>(null);
  const [editTeamA, setEditTeamA] = useState<string>("");
  const [editTeamB, setEditTeamB] = useState<string>("");
  const [isSavingMatchCard, setIsSavingMatchCard] = useState<boolean>(false);
  const [shutterMatch, setShutterMatch] = useState<BracketMatch | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>("");

  // Custom Confirm Modals State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  // Babak & Model States
  const [tournamentStages, setTournamentStages] = useState<TournamentStage[]>(DEFAULT_TOURNAMENT_STAGES);
  const [isAddStageModalOpen, setIsAddStageModalOpen] = useState<boolean>(false);
  const [editingStage, setEditingStage] = useState<TournamentStage | null>(null);
  const [newStageName, setNewStageName] = useState<string>("");
  const [newStageModel, setNewStageModel] = useState<"ranking" | "gugur">("ranking");
  const [newStageTurns, setNewStageTurns] = useState<"1x" | "2x">("1x");
  const [newStageResetPoints, setNewStageResetPoints] = useState<boolean>(true);
  const [stageDeleteTarget, setStageDeleteTarget] = useState<TournamentStage | null>(null);

  const [stageModel, setStageModel] = useState<"klasemen" | "ranking" | "bracket" | "judging">("klasemen");
  const [activeRound, setActiveRound] = useState<string>("babak1");
  const [roundTitle, setRoundTitle] = useState<string>("BABAK 1 • PENYISIHAN");
  const [defaultMonitorView, setDefaultMonitorView] = useState<"leaderboard" | "bracket" | "judging">("leaderboard");
  const [matchTurns, setMatchTurns] = useState<"1x" | "2x">("2x");
  const [roundMatchTurns, setRoundMatchTurns] = useState<Record<string, "1x" | "2x">>({
    "Babak Penyisihan": "2x",
    "Babak 8 Besar": "1x",
    "Babak Semifinal": "1x",
    "Babak Final": "1x",
  });

  const getMatchTurnsForRound = (roundName?: string): "1x" | "2x" => {
    const target = roundName || selectedBracketRound;
    const stage = tournamentStages.find((s) => s.name === target);
    if (stage) return stage.turns;
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

  const handleSetRoundMatchTurns = (roundName: string, format: "1x" | "2x") => {
    const updated = { ...roundMatchTurns, [roundName]: format };
    setRoundMatchTurns(updated);
    if (roundName === selectedBracketRound) {
      setMatchTurns(format);
    }
    const updatedStages = tournamentStages.map((s) =>
      s.name === roundName ? { ...s, turns: format } : s
    );
    setTournamentStages(updatedStages);

    saveSettings({
      tournament_stages: JSON.stringify(updatedStages),
      round_match_turns: JSON.stringify(updated),
      match_turns: roundName === selectedBracketRound ? format : matchTurns,
    });
    showNotification(`Format ${roundName} diatur ke: ${format === "2x" ? "2x Main (Tukar Sisi)" : "1x Main (Langsung Data)"}`);
  };

  const handleAddStage = (name: string, model: "ranking" | "gugur", turns: "1x" | "2x", resetPoints: boolean = true) => {
    const trimmed = name.trim();
    if (!trimmed) {
      showNotification("Nama babak tidak boleh kosong!");
      return;
    }
    if (tournamentStages.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      showNotification(`Babak dengan nama "${trimmed}" sudah ada!`);
      return;
    }
    const newStage: TournamentStage = {
      id: `stage-${Date.now()}`,
      name: trimmed,
      model,
      turns,
      resetPoints,
    };
    const updatedStages = [...tournamentStages, newStage];
    setTournamentStages(updatedStages);

    const updatedTurns = { ...roundMatchTurns, [trimmed]: turns };
    setRoundMatchTurns(updatedTurns);

    saveSettings({
      tournament_stages: JSON.stringify(updatedStages),
      round_match_turns: JSON.stringify(updatedTurns),
    });
    broadcastSync("SETTINGS_SYNC", {
      tournament_stages: JSON.stringify(updatedStages),
      round_match_turns: JSON.stringify(updatedTurns),
    });
    showNotification(`Babak "${trimmed}" berhasil ditambahkan!`);
    setIsAddStageModalOpen(false);
    setEditingStage(null);
    setNewStageName("");
    setNewStageResetPoints(true);
  };

  const handleUpdateStage = (id: string, updates: Partial<TournamentStage>) => {
    const oldStage = tournamentStages.find((s) => s.id === id);
    const updatedStages = tournamentStages.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setTournamentStages(updatedStages);

    const updatedTurns: Record<string, "1x" | "2x"> = {};
    updatedStages.forEach((s) => {
      updatedTurns[s.name] = s.turns;
    });
    setRoundMatchTurns(updatedTurns);

    let extraSettings: Record<string, any> = {};
    if (oldStage && updates.name && (activeRound === oldStage.name || activeRound === oldStage.id)) {
      setActiveRound(updates.name);
      setRoundTitle(updates.name.toUpperCase());
      extraSettings.active_round = updates.name;
      extraSettings.round_title = updates.name.toUpperCase();
    }

    if (oldStage && updates.model && (activeRound === oldStage.name || activeRound === oldStage.id)) {
      const newStageModel = updates.model === "ranking" ? "ranking" : "bracket";
      const newMonitorView = updates.model === "ranking" ? "leaderboard" : "bracket";
      setStageModel(newStageModel as any);
      setDefaultMonitorView(newMonitorView as any);
      extraSettings.stage_model = newStageModel;
      extraSettings.default_monitor_view = newMonitorView;
    }

    saveSettings({
      tournament_stages: JSON.stringify(updatedStages),
      round_match_turns: JSON.stringify(updatedTurns),
      ...extraSettings,
    });
    broadcastSync("SETTINGS_SYNC", {
      tournament_stages: JSON.stringify(updatedStages),
      round_match_turns: JSON.stringify(updatedTurns),
      ...extraSettings,
    });
    if (updates.resetPoints !== undefined) {
      showNotification(`Hitungan poin babak diatur ke: ${updates.resetPoints ? "Reset ke 0" : "Bawa Poin (Carry Over)"}`);
    }
  };

  const handleDeleteStage = (id: string) => {
    const target = tournamentStages.find((s) => s.id === id);
    const updatedStages = tournamentStages.filter((s) => s.id !== id);
    setTournamentStages(updatedStages);

    const updatedTurns: Record<string, "1x" | "2x"> = {};
    updatedStages.forEach((s) => {
      updatedTurns[s.name] = s.turns;
    });
    setRoundMatchTurns(updatedTurns);

    const extraSettings: Record<string, any> = {};
    if (selectedBracketRound === target?.name) {
      const nextRound = updatedStages[0]?.name || "";
      setSelectedBracketRound(nextRound);
    }
    if (activeRound === target?.name) {
      const nextActive = updatedStages[0]?.name || "";
      setActiveRound(nextActive);
      extraSettings.active_round = nextActive;
    }

    saveSettings({
      tournament_stages: JSON.stringify(updatedStages),
      round_match_turns: JSON.stringify(updatedTurns),
      ...extraSettings,
    });
    broadcastSync("SETTINGS_SYNC", {
      tournament_stages: JSON.stringify(updatedStages),
      round_match_turns: JSON.stringify(updatedTurns),
      ...extraSettings,
    });
    if (target?.name) {
      setBracketMatches((prev) => prev.filter((m) => m.round !== target.name));
      fetch(`/api/bracket?deleteRound=${encodeURIComponent(target.name)}`, { method: "DELETE" })
        .then(() => broadcastSync("DATA_REFRESH"))
        .catch(() => {});
    }
    showNotification(`Babak "${target?.name || ""}" berhasil dihapus.`);
    setStageDeleteTarget(null);
  };

  const handleMoveStage = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tournamentStages.length) return;

    const updatedStages = [...tournamentStages];
    const [moved] = updatedStages.splice(index, 1);
    updatedStages.splice(targetIndex, 0, moved);
    setTournamentStages(updatedStages);

    saveSettings({
      tournament_stages: JSON.stringify(updatedStages),
    });
    broadcastSync("SETTINGS_SYNC", {
      tournament_stages: JSON.stringify(updatedStages),
    });
  };

  const handleSetActiveStage = (stage: TournamentStage) => {
    const newStageModel = stage.model === "ranking" ? "ranking" : "bracket";
    const newMonitorView = stage.model === "ranking" ? "leaderboard" : "bracket";
    setActiveRound(stage.name);
    setRoundTitle(stage.name.toUpperCase());
    setStageModel(newStageModel as any);
    setDefaultMonitorView(newMonitorView as any);

    saveSettings({
      active_round: stage.name,
      round_title: stage.name.toUpperCase(),
      stage_model: newStageModel,
      default_monitor_view: newMonitorView,
    });
    broadcastSync("SETTINGS_SYNC", {
      active_round: stage.name,
      round_title: stage.name.toUpperCase(),
      stage_model: newStageModel,
      default_monitor_view: newMonitorView,
    });
    showNotification(`Babak aktif arena diubah ke: ${stage.name}`);
  };

  // Setting States
  const [announcement, setAnnouncement] = useState<string>("");

  // Timer & Stopwatch States (Mode Stopwatch + Fitur Persiapan)
  const [timerMode, setTimerMode] = useState<"stopwatch" | "countdown">("stopwatch");
  const [timerPhase, setTimerPhase] = useState<"idle" | "preparation" | "prep_ended" | "countdown" | "match" | "paused" | "finished">("idle");
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerElapsedMs, setTimerElapsedMs] = useState<number>(0);
  const [timerStartedAt, setTimerStartedAt] = useState<number>(0);
  const [timerBaseSeconds, setTimerBaseSeconds] = useState<number>(0);
  const [prepDuration, setPrepDuration] = useState<number>(60); // 60 detik default
  const [matchLimit, setMatchLimit] = useState<number>(300); // 300 detik = 5m default (0 = tanpa batas)
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [showTimerOnMonitor, setShowTimerOnMonitor] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Audio Custom Sounds & Volumes
  const [soundPrepUrl, setSoundPrepUrl] = useState<string>("");
  const [soundPrepName, setSoundPrepName] = useState<string>("");
  const [soundCountdownUrl, setSoundCountdownUrl] = useState<string>("");
  const [soundCountdownName, setSoundCountdownName] = useState<string>("");
  const [soundStartUrl, setSoundStartUrl] = useState<string>("");
  const [soundStartName, setSoundStartName] = useState<string>("");
  const [soundFinishUrl, setSoundFinishUrl] = useState<string>("");
  const [soundFinishName, setSoundFinishName] = useState<string>("");
  const [soundVolume, setSoundVolume] = useState<number>(0.8);
  const [isUploadingSound, setIsUploadingSound] = useState<boolean>(false);

  // Sound loop states ("kalo habis putar ulang lagi")
  const [soundPrepLoop, setSoundPrepLoop] = useState<boolean>(true); // default true for preparation
  const [soundCountdownLoop, setSoundCountdownLoop] = useState<boolean>(false);
  const [soundStartLoop, setSoundStartLoop] = useState<boolean>(false);
  const [soundFinishLoop, setSoundFinishLoop] = useState<boolean>(false);

  // Currently playing test key (untuk fitur stop)
  const [activePlayingKey, setActivePlayingKey] = useState<SoundEventType | null>(null);

  // Sound input file refs
  const prepFileInputRef = useRef<HTMLInputElement>(null);
  const countdownFileInputRef = useRef<HTMLInputElement>(null);
  const startFileInputRef = useRef<HTMLInputElement>(null);
  const finishFileInputRef = useRef<HTMLInputElement>(null);

  // Point Rules Settings
  const [pointBonus, setPointBonus] = useState<number>(50);
  const [pointPenalty, setPointPenalty] = useState<number>(25);
  const [pointFlag, setPointFlag] = useState<number>(100);
  const [maxCriteria, setMaxCriteria] = useState<number>(250);

  // Custom Point Rules State (Menu Point Kustom)
  const [customPointRules, setCustomPointRules] = useState<CustomPointRule[]>(DEFAULT_POINT_RULES);
  const [isPointRuleModalOpen, setIsPointRuleModalOpen] = useState<boolean>(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<CustomPointRule | null>(null);
  const [isResetRulesConfirmOpen, setIsResetRulesConfirmOpen] = useState<boolean>(false);

  // Point Rule Form State
  const [ruleForm, setRuleForm] = useState<{
    label: string;
    points: number;
    type: CustomPointType;
    color: CustomPointColor;
    description: string;
    hotkeyRed: string;
    hotkeyBlue: string;
  }>({
    label: "",
    points: 50,
    type: "bonus",
    color: "emerald",
    description: "",
    hotkeyRed: "",
    hotkeyBlue: "",
  });

  // New Category & CSV input
  const [newCatName, setNewCatName] = useState<string>("");
  const [csvText, setCsvText] = useState<string>("");

  // New Participant Form (Tanpa Kode NXT, Tanpa Kota, Tanpa Poin Babak 1-3)
  const [newParticipant, setNewParticipant] = useState({
    name: "",
    institution: "",
    category: DEFAULT_CATEGORIES[0] || "Cyber Security & CTF",
    status: "Aktif" as ParticipantStatus,
    members: [
      { name: "", role: "Team Captain" },
      { name: "", role: "Anggota" },
    ] as TeamMember[],
  });

  const showNotification = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(""), 3500);
  };

  const formatTimerDisplay = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getStopwatchParts = (totalMs: number) => {
    const validMs = Math.max(0, Math.floor(totalMs || 0));
    const totalSec = Math.floor(validMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const cs = Math.floor((validMs % 1000) / 10);
    return {
      minutes: String(m).padStart(2, "0"),
      seconds: String(s).padStart(2, "0"),
      centiseconds: String(cs).padStart(2, "0"),
      formatted: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`,
    };
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

  // Realtime tick effect for Timer & Stopwatch with wall-clock accuracy and audio trigger
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
            saveSettings({
              timer_running: "false",
              timer_phase: "prep_ended",
              timer_seconds: "0",
              timer_started_at: "0",
              timer_base_seconds: "0",
            });
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
            // Hitung mundur selesai! Masuk ke Pertandingan (Match Stopwatch)
            const now = Date.now();
            setTimerPhase("match");
            setTimerSeconds(0);
            setTimerStartedAt(now);
            setTimerBaseSeconds(0);
            setIsTimerRunning(true);
            if (soundEnabled) {
              playSound("start", soundStartUrl, soundVolume, soundStartLoop);
            }
            saveSettings({
              timer_running: "true",
              timer_phase: "match",
              timer_seconds: "0",
              timer_started_at: String(now),
              timer_base_seconds: "0",
            });
          }
        } else if (timerPhase === "match") {
          const elapsedMs = Math.max(0, (Date.now() - timerStartedAt) + (timerBaseSeconds * 1000));
          setTimerElapsedMs(elapsedMs);
          const current = Math.floor(elapsedMs / 1000);
          setTimerSeconds(current);
          if (matchLimit > 0 && current >= matchLimit) {
            // Waktu habis / batas limit tercapai!
            stopAllSounds();
            setIsTimerRunning(false);
            setTimerPhase("finished");
            setTimerStartedAt(0);
            setTimerBaseSeconds(current);
            if (soundEnabled) {
              playSound("finish", soundFinishUrl, soundVolume, soundFinishLoop);
            }
            saveSettings({
              timer_running: "false",
              timer_phase: "finished",
              timer_seconds: String(current),
              timer_started_at: "0",
              timer_base_seconds: String(current),
            });
          }
        }
      } else {
        // Fallback tick
        setTimerSeconds((prev) => {
          if (timerPhase === "preparation") {
            if (prev <= 1) {
              stopAllSounds();
              setIsTimerRunning(false);
              setTimerPhase("prep_ended");
              saveSettings({
                timer_running: "false",
                timer_phase: "prep_ended",
                timer_seconds: "0",
                timer_started_at: "0",
              });
              return 0;
            }
            return prev - 1;
          } else if (timerPhase === "countdown") {
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
              const now = Date.now();
              setTimerPhase("match");
              setTimerSeconds(0);
              setTimerStartedAt(now);
              setTimerBaseSeconds(0);
              setIsTimerRunning(true);
              if (soundEnabled) {
                playSound("start", soundStartUrl, soundVolume, soundStartLoop);
              }
              saveSettings({
                timer_running: "true",
                timer_phase: "match",
                timer_seconds: "0",
                timer_started_at: String(now),
                timer_base_seconds: "0",
              });
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
              saveSettings({
                timer_running: "false",
                timer_phase: "finished",
                timer_seconds: String(next),
                timer_started_at: "0",
                timer_base_seconds: String(next),
              });
              return next;
            }
            return next;
          }
          return prev;
        });
      }
    }, timerPhase === "match" ? 30 : 1000);
    return () => clearInterval(interval);
  }, [
    isTimerRunning,
    timerPhase,
    timerStartedAt,
    timerBaseSeconds,
    prepDuration,
    matchLimit,
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

  // Fetch initial data from SQLite
  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/arena");
      if (res.ok) {
        const json = await res.json();
        if (json.categories) setCategories(json.categories);
        if (json.participants) setParticipants(json.participants);
        if (json.bracketMatches) setBracketMatches(json.bracketMatches);
        if (json.pointLogs) setPointLogs(json.pointLogs);
        if (json.settings) {
          const s = json.settings;
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
          if (s.announcement) setAnnouncement(s.announcement);
          if (s.stage_model) setStageModel(s.stage_model as any);
          if (s.active_round) setActiveRound(s.active_round);
          if (s.round_title) setRoundTitle(s.round_title);
          if (s.default_monitor_view) setDefaultMonitorView(s.default_monitor_view as any);
          if (s.match_turns) setMatchTurns(s.match_turns as any);
          if (s.round_match_turns) {
            try {
              const parsed = typeof s.round_match_turns === "string" ? JSON.parse(s.round_match_turns) : s.round_match_turns;
              setRoundMatchTurns(parsed);
            } catch (e) {}
          }
          if (s.timer_mode) setTimerMode(s.timer_mode as any);
          if (s.timer_phase) setTimerPhase(s.timer_phase as any);
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
            if (s.timer_seconds !== undefined) setTimerSeconds(Number(s.timer_seconds) || 0);
          }

          if (s.show_timer_on_monitor !== undefined) setShowTimerOnMonitor(s.show_timer_on_monitor === "true");
          if (s.point_bonus) setPointBonus(Number(s.point_bonus));
          if (s.point_penalty) setPointPenalty(Number(s.point_penalty));
          if (s.point_flag) setPointFlag(Number(s.point_flag));
          if (s.max_criteria) setMaxCriteria(Number(s.max_criteria));
          if (s.sound_prep_url !== undefined) setSoundPrepUrl(s.sound_prep_url);
          if (s.sound_prep_name !== undefined) setSoundPrepName(s.sound_prep_name);
          if (s.sound_countdown_url !== undefined) setSoundCountdownUrl(s.sound_countdown_url);
          if (s.sound_countdown_name !== undefined) setSoundCountdownName(s.sound_countdown_name);
          if (s.sound_start_url !== undefined) setSoundStartUrl(s.sound_start_url);
          if (s.sound_start_name !== undefined) setSoundStartName(s.sound_start_name);
          if (s.sound_finish_url !== undefined) setSoundFinishUrl(s.sound_finish_url);
          if (s.sound_finish_name !== undefined) setSoundFinishName(s.sound_finish_name);
          if (s.sound_volume !== undefined) setSoundVolume(Number(s.sound_volume) || 0.8);
          if (s.sound_enabled !== undefined) setSoundEnabled(s.sound_enabled === "true");
          if (s.sound_prep_loop !== undefined) setSoundPrepLoop(s.sound_prep_loop === "true");
          if (s.sound_countdown_loop !== undefined) setSoundCountdownLoop(s.sound_countdown_loop === "true");
          if (s.sound_start_loop !== undefined) setSoundStartLoop(s.sound_start_loop === "true");
          if (s.sound_finish_loop !== undefined) setSoundFinishLoop(s.sound_finish_loop === "true");
          if (s.custom_point_rules) {
            try {
              const parsed = JSON.parse(s.custom_point_rules);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setCustomPointRules(parsed);
              }
            } catch (e) {
              console.error("Gagal parse custom_point_rules:", e);
            }
          }
        }
      }
    } catch (err) {
      console.error("Gagal load pengaturan dari database:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen to cross-tab updates (e.g. from Monitoring screen)
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("next_arena_sync");
    channel.onmessage = (event) => {
      if (event.data?.type === "DATA_REFRESH") {
        loadData();
      } else if (event.data?.type === "SETTINGS_SYNC" && event.data.payload) {
        const p = event.data.payload;
        if (p.announcement !== undefined) setAnnouncement(p.announcement);
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

  // Keyboard Hotkey Listener for Live Match Scoring
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input, textarea or select
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

      // Check if modal is open
      if (isPointRuleModalOpen || showResetBracketModal || showResetRoundModal || showManualBracketModal) return;

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
          // Putaran 1: Merah = Tim A | Putaran 2 (Tukar Sisi): Merah = Tim B!
          const targetTeam = isLeg2 ? "B" : "A";
          const teamName = isLeg2 ? activeMatch.teamB : activeMatch.teamA;
          const leg = (isLeg2 ? 2 : 1) as 1 | 2;
          handleBracketLegScoreChange(activeMatch.id, targetTeam, leg, redRule.points);
          showNotification(
            `[Hotkey ${pressedKey}] Sudut Merah (Putaran ${leg} - ${teamName}): ${redRule.points > 0 ? "+" : ""}${redRule.points} ${redRule.label}`
          );
        } else {
          handleBracketScoreChange(activeMatch.id, "A", redRule.points);
          showNotification(
            `[Hotkey ${pressedKey}] Sudut Merah (${activeMatch.teamA}): ${redRule.points > 0 ? "+" : ""}${redRule.points} ${redRule.label}`
          );
        }
        playSound("start", "", 0.35, false);
        return;
      }

      // Check Sudut Biru rules
      const blueRule = customPointRules.find(
        (r) => r.enabled && r.hotkeyBlue && r.hotkeyBlue.toUpperCase() === pressedKey
      );
      if (blueRule) {
        e.preventDefault();
        if (is2x) {
          // Putaran 1: Biru = Tim B | Putaran 2 (Tukar Sisi): Biru = Tim A!
          const targetTeam = isLeg2 ? "A" : "B";
          const teamName = isLeg2 ? activeMatch.teamA : activeMatch.teamB;
          const leg = (isLeg2 ? 2 : 1) as 1 | 2;
          handleBracketLegScoreChange(activeMatch.id, targetTeam, leg, blueRule.points);
          showNotification(
            `[Hotkey ${pressedKey}] Sudut Biru (Putaran ${leg} - ${teamName}): ${blueRule.points > 0 ? "+" : ""}${blueRule.points} ${blueRule.label}`
          );
        } else {
          handleBracketScoreChange(activeMatch.id, "B", blueRule.points);
          showNotification(
            `[Hotkey ${pressedKey}] Sudut Biru (${activeMatch.teamB}): ${blueRule.points > 0 ? "+" : ""}${blueRule.points} ${blueRule.label}`
          );
        }
        playSound("start", "", 0.35, false);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bracketMatches, customPointRules, selectedBracketRound, isPointRuleModalOpen, showResetBracketModal, showResetRoundModal, showManualBracketModal, matchTurns, roundMatchTurns]);

  // Save Settings to SQLite
  const saveSettings = async (customPayload?: Record<string, any>) => {
    try {
      const basePayload = {
        tournament_stages: JSON.stringify(tournamentStages),
        announcement,
        stage_model: stageModel,
        active_round: activeRound,
        round_title: roundTitle,
        default_monitor_view: defaultMonitorView,
        match_turns: matchTurns,
        round_match_turns: JSON.stringify(roundMatchTurns),
        timer_mode: timerMode,
        timer_phase: timerPhase,
        timer_seconds: String(timerSeconds),
        timer_running: String(isTimerRunning),
        timer_started_at: String(timerStartedAt),
        timer_base_seconds: String(timerBaseSeconds),
        prep_duration: String(prepDuration),
        match_limit: String(matchLimit),
        show_timer_on_monitor: String(showTimerOnMonitor),
        point_bonus: String(pointBonus),
        point_penalty: String(pointPenalty),
        point_flag: String(pointFlag),
        max_criteria: String(maxCriteria),
        sound_volume: String(soundVolume),
        sound_enabled: String(soundEnabled),
        sound_prep_url: soundPrepUrl,
        sound_prep_name: soundPrepName,
        sound_countdown_url: soundCountdownUrl,
        sound_countdown_name: soundCountdownName,
        sound_start_url: soundStartUrl,
        sound_start_name: soundStartName,
        sound_finish_url: soundFinishUrl,
        sound_finish_name: soundFinishName,
        sound_prep_loop: String(soundPrepLoop),
        sound_countdown_loop: String(soundCountdownLoop),
        sound_start_loop: String(soundStartLoop),
        sound_finish_loop: String(soundFinishLoop),
        custom_point_rules: JSON.stringify(customPointRules),
      };

      const payload = { ...basePayload, ...(customPayload || {}) };

      broadcastSync("SETTINGS_SYNC", payload);

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showNotification("Pengaturan berhasil disimpan!");
      }
    } catch (err) {
      console.error("Gagal simpan pengaturan:", err);
    }
  };

  // Bracket Score Handlers for Operator
  const handleBracketScoreChange = async (matchId: string, team: "A" | "B", delta: number) => {
    const match = bracketMatches.find((m) => m.id === matchId);
    if (!match) return;

    const newScoreA = team === "A" ? Number((match.scoreA + delta).toFixed(1)) : match.scoreA;
    const newScoreB = team === "B" ? Number((match.scoreB + delta).toFixed(1)) : match.scoreB;
    const isPlayed = newScoreA !== 0 || newScoreB !== 0;
    const winner = isPlayed
      ? resolveMatchWinner({
          scoreA: newScoreA,
          scoreB: newScoreB,
          is2xMode: false,
          matchLogs: filterLogsForBracketMatch(pointLogs, match),
          teamA: match.teamA,
          teamB: match.teamB,
        }).winner
      : null;
    const status = isPlayed ? (winner ? "Selesai" : "Berlangsung") : "Siap Tanding";

    setBracketMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, scoreA: newScoreA, scoreB: newScoreB, winner: winner || undefined, status: status as any } : m))
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

  const handleSetExactScore = async (matchId: string, team: "A" | "B", score: number) => {
    const match = bracketMatches.find((m) => m.id === matchId);
    if (!match) return;

    const newScoreA = team === "A" ? score : match.scoreA;
    const newScoreB = team === "B" ? score : match.scoreB;
    const isPlayed = newScoreA !== 0 || newScoreB !== 0;
    const winner = isPlayed
      ? resolveMatchWinner({
          scoreA: newScoreA,
          scoreB: newScoreB,
          is2xMode: false,
          matchLogs: filterLogsForBracketMatch(pointLogs, match),
          teamA: match.teamA,
          teamB: match.teamB,
        }).winner
      : null;
    const status = isPlayed ? (winner ? "Selesai" : "Berlangsung") : "Siap Tanding";

    setBracketMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, scoreA: newScoreA, scoreB: newScoreB, winner: winner || undefined, status: status as any } : m))
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
      console.error("Gagal set exact score bracket:", err);
    }
  };

  const handleBracketLegScoreChange = async (
    matchId: string,
    team: "A" | "B",
    leg: 1 | 2,
    delta: number
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
    const winner = isPlayed
      ? resolveMatchWinner({
          scoreA: newScoreA,
          scoreB: newScoreB,
          is2xMode: true,
          matchLogs: filterLogsForBracketMatch(pointLogs, match),
          teamA: match.teamA,
          teamB: match.teamB,
        }).winner
      : null;
    const status = isPlayed ? (match.status === "Selesai" ? "Selesai" : "Berlangsung") : "Siap Tanding";

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
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) setBracketMatches(json.data.bracketMatches);
        if (json.data?.participants) setParticipants(json.data.participants);
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
    const winner = isPlayed
      ? resolveMatchWinner({
          scoreA: newScoreA,
          scoreB: newScoreB,
          is2xMode: true,
          matchLogs: filterLogsForBracketMatch(pointLogs, match),
          teamA: match.teamA,
          teamB: match.teamB,
        }).winner
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

  const handleSetWinner = async (matchId: string, winner: "A" | "B" | null) => {
    const match = bracketMatches.find((m) => m.id === matchId);
    if (!match) return;

    setBracketMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, winner: winner || undefined, status: winner ? "Selesai" : "Siap Tanding" } : m))
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
          status: winner ? "Selesai" : "Siap Tanding",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) setBracketMatches(json.data.bracketMatches);
        broadcastSync("DATA_REFRESH");
      }
    } catch (err) {
      console.error("Gagal set winner bracket:", err);
    }
  };

  // Generate or Reset Bracket from registered teams (Acak 2 Tim Sekali Main)
  const handleGenerateBracket = async (roundName: string = selectedBracketRound) => {
    setIsGeneratingBracket(true);
    try {
      const res = await fetch("/api/bracket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round: roundName }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) {
          setBracketMatches(json.data.bracketMatches);
        }
        if (json.data?.participants) {
          setParticipants(json.data.participants);
        }
        broadcastSync("DATA_REFRESH");
        showNotification(`Jadwal laga ${roundName} berhasil diacak & dibuat!`);
      } else {
        const errJson = await res.json();
        showNotification(errJson.error || "Gagal membuat jadwal tanding");
      }
    } catch (err) {
      console.error("Gagal generate bracket:", err);
      showNotification("Terjadi kesalahan saat mengacak jadwal laga");
    } finally {
      setIsGeneratingBracket(false);
      setShowResetBracketModal(false);
    }
  };

  // Manual Bracket Matchmaking & Editing Handlers
  const handleOpenManualBracketModal = () => {
    const currentRoundMatches = bracketMatches.filter((m) => m.round === selectedBracketRound);
    if (currentRoundMatches.length > 0) {
      setManualMatchPairs(
        currentRoundMatches.map((m, idx) => ({
          id: m.id || `manual-${idx}-${Date.now()}`,
          teamA: m.teamA || "",
          teamB: m.teamB || "",
          label: m.matchLabel || `Laga ${String(idx + 1).padStart(2, "0")}`,
        }))
      );
    } else {
      const pairs: Array<{ id: string; teamA: string; teamB: string; label?: string }> = [];
      const qTeams = [...qualifiedBracketParticipants];
      if (qTeams.length >= 2) {
        for (let i = 0; i < qTeams.length; i += 2) {
          const matchNum = Math.floor(i / 2) + 1;
          pairs.push({
            id: `manual-new-${matchNum}-${Date.now()}-${i}`,
            teamA: qTeams[i]?.name || "",
            teamB: qTeams[i + 1]?.name || "- (Tanding Tunggal)",
            label: `Laga ${String(matchNum).padStart(2, "0")}`,
          });
        }
      } else if (qTeams.length === 1) {
        pairs.push({
          id: `manual-new-1-${Date.now()}`,
          teamA: qTeams[0]?.name || "",
          teamB: "- (Tanding Tunggal)",
          label: "Laga 01",
        });
      } else {
        pairs.push({
          id: `manual-new-1-${Date.now()}`,
          teamA: "",
          teamB: "",
          label: "Laga 01",
        });
      }
      setManualMatchPairs(pairs);
    }
    setShowManualBracketModal(true);
  };

  const handleAddManualPairRow = () => {
    const nextNum = manualMatchPairs.length + 1;
    setManualMatchPairs((prev) => [
      ...prev,
      {
        id: `manual-${nextNum}-${Date.now()}`,
        teamA: "",
        teamB: "",
        label: `Laga ${String(nextNum).padStart(2, "0")}`,
      },
    ]);
  };

  const handleRemoveManualPairRow = (index: number) => {
    setManualMatchPairs((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((item, i) => ({
        ...item,
        label: item.label || `Laga ${String(i + 1).padStart(2, "0")}`,
      }));
    });
  };

  const handleUpdateManualPair = (
    index: number,
    field: "teamA" | "teamB" | "label",
    value: string
  ) => {
    setManualMatchPairs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveManualBracket = async () => {
    const validMatches = manualMatchPairs.filter((p) => p.teamA && p.teamA.trim() !== "");
    if (validMatches.length === 0) {
      alert("Harap tentukan minimal satu laga dengan Tim Sudut Merah.");
      return;
    }

    setIsSavingManualBracket(true);
    try {
      const res = await fetch("/api/bracket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round: selectedBracketRound,
          matches: validMatches.map((m, idx) => ({
            teamA: m.teamA,
            teamB: m.teamB || "- (Tanding Tunggal)",
            matchLabel: m.label || `Laga ${String(idx + 1).padStart(2, "0")}`,
          })),
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) {
          setBracketMatches(json.data.bracketMatches);
        }
        if (json.data?.participants) {
          setParticipants(json.data.participants);
        }
        broadcastSync("DATA_REFRESH");
        setShowManualBracketModal(false);
        showNotification(`Jadwal susunan manual untuk ${selectedBracketRound} berhasil disimpan!`);
      } else {
        const errJson = await res.json();
        alert(errJson.error || "Gagal menyimpan susunan laga manual.");
      }
    } catch (err) {
      console.error("Gagal simpan susunan manual:", err);
      alert("Terjadi kesalahan jaringan saat menyimpan susunan manual.");
    } finally {
      setIsSavingManualBracket(false);
    }
  };

  const handleStartEditMatchCard = (match: BracketMatch) => {
    setEditingMatchCardId(match.id);
    setEditTeamA(match.teamA || "");
    setEditTeamB(match.teamB || "");
  };

  const handleCancelEditMatchCard = () => {
    setEditingMatchCardId(null);
    setEditTeamA("");
    setEditTeamB("");
  };

  const handleSaveMatchCard = async (matchId: string) => {
    if (!editTeamA.trim()) {
      alert("Tim Sudut Merah tidak boleh kosong!");
      return;
    }
    setIsSavingMatchCard(true);
    try {
      const res = await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          teamA: editTeamA.trim(),
          teamB: editTeamB.trim() || "- (Tanding Tunggal)",
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) {
          setBracketMatches(json.data.bracketMatches);
        }
        broadcastSync("DATA_REFRESH");
        setEditingMatchCardId(null);
        showNotification("Pasangan laga berhasil diperbarui!");
      } else {
        const errJson = await res.json();
        alert(errJson.error || "Gagal memperbarui pasangan laga.");
      }
    } catch (err) {
      console.error("Gagal edit pasangan laga:", err);
      alert("Terjadi kesalahan saat memperbarui pasangan laga.");
    } finally {
      setIsSavingMatchCard(false);
    }
  };

  const handleResetPoints = async () => {
    try {
      const res = await fetch("/api/bracket?action=reset_points", { method: "DELETE" });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) setBracketMatches(json.data.bracketMatches);
        if (json.data?.participants) setParticipants(json.data.participants);
        if (json.data?.pointLogs) setPointLogs(json.data.pointLogs);
        broadcastSync("DATA_REFRESH");
        showNotification("Seluruh skor laga, poin peserta, dan log aktivitas berhasil di-reset ke 0!");
      }
    } catch (err) {
      console.error("Gagal reset poin:", err);
      showNotification("Gagal me-reset poin");
    } finally {
      setShowResetBracketModal(false);
    }
  };

  const handleResetRound = async () => {
    try {
      const res = await fetch("/api/bracket?action=reset_babak", { method: "DELETE" });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.bracketMatches) setBracketMatches(json.data.bracketMatches);
        if (json.data?.participants) setParticipants(json.data.participants);
        if (json.data?.pointLogs) setPointLogs(json.data.pointLogs);
        if (tournamentStages.length > 0) {
          setSelectedBracketRound(tournamentStages[0].name);
        }
        broadcastSync("DATA_REFRESH");
        showNotification("Seluruh peserta telah dikembalikan ke babak pertama dan laga babak lanjutan telah dikosongkan!");
      } else {
        const errJson = await res.json().catch(() => ({}));
        showNotification(errJson.error || "Gagal me-reset babak");
      }
    } catch (err) {
      console.error("Gagal reset babak:", err);
      showNotification("Gagal me-reset babak");
    } finally {
      setShowResetRoundModal(false);
    }
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
        showNotification(
          `Laga ${resetMatchTarget?.matchLabel} ${clearLogs ? "dan log poinnya " : ""}berhasil di-reset ke Siap Tanding!`
        );
      }
    } catch (err) {
      console.error("Gagal reset laga:", err);
      showNotification("Terjadi kesalahan saat me-reset laga");
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
        showNotification("Seluruh catatan log poin untuk laga ini berhasil dibersihkan!");
      }
    } catch (err) {
      console.error("Gagal hapus log laga:", err);
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

  // Timer Control Handlers (Stopwatch + Preparation)
  const handleStartPrep = () => {
    stopAllSounds();
    const now = Date.now();
    const sec = prepDuration;
    setTimerPhase("preparation");
    setTimerSeconds(sec);
    setTimerStartedAt(now);
    setTimerBaseSeconds(0);
    setIsTimerRunning(true);
    if (soundEnabled) {
      playSound("prep", soundPrepUrl, soundVolume, soundPrepLoop);
    }
    saveSettings({
      timer_phase: "preparation",
      timer_seconds: String(sec),
      timer_running: "true",
      timer_started_at: String(now),
      timer_base_seconds: "0",
    });
  };

  const handleStartCountdown = () => {
    stopAllSounds();
    const now = Date.now();
    setTimerPhase("countdown");
    setTimerSeconds(3);
    setTimerStartedAt(now);
    setTimerBaseSeconds(0);
    setIsTimerRunning(true);
    if (soundCountdownUrl && soundEnabled) {
      playSound("countdown", soundCountdownUrl, soundVolume, false);
    } else if (soundEnabled) {
      playSound("countdown", "", soundVolume, false);
    }
    saveSettings({
      timer_phase: "countdown",
      timer_seconds: "3",
      timer_running: "true",
      timer_started_at: String(now),
      timer_base_seconds: "0",
    });
  };

  const handleStartMatch = (fromZero: boolean = true) => {
    if (fromZero) {
      handleStartCountdown();
      return;
    }
    stopAllSounds();
    const now = Date.now();
    setTimerPhase("match");
    setTimerSeconds(timerSeconds);
    setTimerStartedAt(now);
    setTimerBaseSeconds(timerSeconds);
    setIsTimerRunning(true);
    if (soundEnabled) {
      playSound("start", soundStartUrl, soundVolume, soundStartLoop);
    }
    saveSettings({
      timer_phase: "match",
      timer_seconds: String(timerSeconds),
      timer_running: "true",
      timer_started_at: String(now),
      timer_base_seconds: String(timerSeconds),
    });
  };

  const handleTogglePause = () => {
    const nextRunning = !isTimerRunning;
    setIsTimerRunning(nextRunning);
    const now = Date.now();
    if (!nextRunning) {
      stopAllSounds();
      const elapsed = timerStartedAt > 0 ? Math.max(0, Math.floor((now - timerStartedAt) / 1000)) : 0;
      const curSec = timerPhase === "preparation" ? Math.max(0, prepDuration - elapsed) : (timerBaseSeconds + elapsed);
      setTimerSeconds(curSec);
      setTimerStartedAt(0);
      setTimerBaseSeconds(curSec);
      setTimerPhase("paused");
      saveSettings({
        timer_running: "false",
        timer_phase: "paused",
        timer_seconds: String(curSec),
        timer_started_at: "0",
        timer_base_seconds: String(curSec),
      });
    } else {
      const newPhase = timerPhase === "countdown" ? "countdown" : "match";
      setTimerPhase(newPhase);
      setTimerStartedAt(now);
      setTimerBaseSeconds(timerSeconds);
      saveSettings({
        timer_running: "true",
        timer_phase: newPhase,
        timer_seconds: String(timerSeconds),
        timer_started_at: String(now),
        timer_base_seconds: String(timerSeconds),
      });
    }
  };

  const handleFinishMatch = () => {
    stopAllSounds();
    const now = Date.now();
    const elapsed = timerStartedAt > 0 ? Math.max(0, Math.floor((now - timerStartedAt) / 1000)) : 0;
    const curSec = timerBaseSeconds + elapsed;
    setTimerSeconds(curSec);
    setTimerStartedAt(0);
    setTimerBaseSeconds(curSec);
    setIsTimerRunning(false);
    setTimerPhase("finished");
    if (soundEnabled) {
      playSound("finish", soundFinishUrl, soundVolume, soundFinishLoop);
    }
    saveSettings({
      timer_running: "false",
      timer_phase: "finished",
      timer_seconds: String(curSec),
      timer_started_at: "0",
      timer_base_seconds: String(curSec),
    });
  };

  const handleResetStopwatch = () => {
    stopAllSounds();
    setIsTimerRunning(false);
    setTimerPhase("idle");
    setTimerSeconds(0);
    setTimerStartedAt(0);
    setTimerBaseSeconds(0);
    saveSettings({
      timer_running: "false",
      timer_phase: "idle",
      timer_seconds: "0",
      timer_started_at: "0",
      timer_base_seconds: "0",
    });
  };

  const handleResetToPrep = () => {
    stopAllSounds();
    setIsTimerRunning(false);
    setTimerPhase("preparation");
    setTimerSeconds(prepDuration);
    setTimerStartedAt(0);
    setTimerBaseSeconds(0);
    saveSettings({
      timer_running: "false",
      timer_phase: "preparation",
      timer_seconds: String(prepDuration),
      timer_started_at: "0",
      timer_base_seconds: "0",
    });
  };

  // Sound Test & Stop Handlers
  const handlePlayTest = (key: SoundEventType) => {
    if (activePlayingKey === key) {
      stopAllSounds();
      setActivePlayingKey(null);
      return;
    }

    stopAllSounds();
    setActivePlayingKey(key);

    let url = "";
    let loop = false;
    if (key === "prep") {
      url = soundPrepUrl;
      loop = soundPrepLoop;
    } else if (key === "countdown") {
      url = soundCountdownUrl;
      loop = soundCountdownLoop;
    } else if (key === "start") {
      url = soundStartUrl;
      loop = soundStartLoop;
    } else if (key === "finish") {
      url = soundFinishUrl;
      loop = soundFinishLoop;
    }

    playSound(key, url, soundVolume, loop, () => {
      setActivePlayingKey(null);
    });
  };

  const handleStopAll = () => {
    stopAllSounds();
    setActivePlayingKey(null);
  };

  // Upload & Reset Sound Handlers (Tidak langsung memutar suara saat upload)
  const handleUploadSound = async (key: SoundEventType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("soundKey", key);
    formData.append("file", file);

    try {
      setIsUploadingSound(true);
      const res = await fetch("/api/sounds", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const json = await res.json();
        if (key === "prep") {
          setSoundPrepUrl(json.url);
          setSoundPrepName(json.name);
        } else if (key === "countdown") {
          setSoundCountdownUrl(json.url);
          setSoundCountdownName(json.name);
        } else if (key === "start") {
          setSoundStartUrl(json.url);
          setSoundStartName(json.name);
        } else if (key === "finish") {
          setSoundFinishUrl(json.url);
          setSoundFinishName(json.name);
        }
        broadcastSync("SETTINGS_SYNC", {
          [`sound_${key}_url`]: json.url,
          [`sound_${key}_name`]: json.name,
        });
        showNotification(`Suara "${json.name}" berhasil diunggah! Tekan tombol "Putar / Tes" jika ingin mendengarkan.`);
      }
    } catch (err) {
      console.error("Gagal mengunggah suara:", err);
    } finally {
      setIsUploadingSound(false);
      e.target.value = "";
    }
  };

  const handleResetSound = async (key: SoundEventType) => {
    stopAllSounds();
    setActivePlayingKey(null);
    try {
      const res = await fetch(`/api/sounds?soundKey=${key}`, { method: "DELETE" });
      if (res.ok) {
        if (key === "prep") {
          setSoundPrepUrl("");
          setSoundPrepName("");
        } else if (key === "countdown") {
          setSoundCountdownUrl("");
          setSoundCountdownName("");
        } else if (key === "start") {
          setSoundStartUrl("");
          setSoundStartName("");
        } else if (key === "finish") {
          setSoundFinishUrl("");
          setSoundFinishName("");
        }
        broadcastSync("SETTINGS_SYNC", {
          [`sound_${key}_url`]: "",
          [`sound_${key}_name`]: "",
        });
        showNotification("Suara dikembalikan ke preset bawaan sistem.");
      }
    } catch (err) {
      console.error("Gagal mereset suara:", err);
    }
  };

  // Handlers untuk Menu Point Kustom (Bisa Tambah Sendiri)
  const handleOpenAddPointRule = () => {
    setEditingRuleId(null);
    setRuleForm({
      label: "",
      points: 5,
      type: "bonus",
      color: "emerald",
      description: "",
      hotkeyRed: "",
      hotkeyBlue: "",
    });
    setIsPointRuleModalOpen(true);
  };

  const handleOpenEditPointRule = (rule: CustomPointRule) => {
    setEditingRuleId(rule.id);
    setRuleForm({
      label: rule.label,
      points: rule.points,
      type: rule.type,
      color: rule.color,
      description: rule.description || "",
      hotkeyRed: rule.hotkeyRed || "",
      hotkeyBlue: rule.hotkeyBlue || "",
    });
    setIsPointRuleModalOpen(true);
  };

  const handleSavePointRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.label.trim()) {
      showNotification("Nama aturan poin tidak boleh kosong.");
      return;
    }

    let updated: CustomPointRule[];
    if (editingRuleId) {
      updated = customPointRules.map((r) =>
        r.id === editingRuleId
          ? {
              ...r,
              label: ruleForm.label.trim(),
              points: Number(ruleForm.points) || 0,
              type: ruleForm.type,
              color: ruleForm.color,
              description: ruleForm.description.trim(),
              hotkeyRed: ruleForm.hotkeyRed?.toUpperCase().trim() || undefined,
              hotkeyBlue: ruleForm.hotkeyBlue?.toUpperCase().trim() || undefined,
            }
          : r
      );
      showNotification(`Aturan poin "${ruleForm.label}" berhasil diperbarui!`);
    } else {
      const newRule: CustomPointRule = {
        id: `rule-${Date.now()}`,
        label: ruleForm.label.trim(),
        points: Number(ruleForm.points) || 0,
        type: ruleForm.type,
        color: ruleForm.color,
        description: ruleForm.description.trim(),
        enabled: true,
        hotkeyRed: ruleForm.hotkeyRed?.toUpperCase().trim() || undefined,
        hotkeyBlue: ruleForm.hotkeyBlue?.toUpperCase().trim() || undefined,
      };
      updated = [...customPointRules, newRule];
      showNotification(`Aturan poin "${ruleForm.label}" berhasil ditambahkan!`);
    }

    setCustomPointRules(updated);
    setIsPointRuleModalOpen(false);
    saveSettings({ custom_point_rules: JSON.stringify(updated) });
  };

  const handleToggleRuleStatus = (id: string) => {
    const updated = customPointRules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    setCustomPointRules(updated);
    saveSettings({ custom_point_rules: JSON.stringify(updated) });
    showNotification("Status visibilitas tombol poin berhasil diubah.");
  };

  const handleConfirmDeleteRule = () => {
    if (!ruleToDelete) return;
    const updated = customPointRules.filter((r) => r.id !== ruleToDelete.id);
    setCustomPointRules(updated);
    setRuleToDelete(null);
    saveSettings({ custom_point_rules: JSON.stringify(updated) });
    showNotification("Aturan poin berhasil dihapus.");
  };

  const handleResetPointRules = () => {
    setCustomPointRules(DEFAULT_POINT_RULES);
    setIsResetRulesConfirmOpen(false);
    saveSettings({ custom_point_rules: JSON.stringify(DEFAULT_POINT_RULES) });
    showNotification("Aturan poin dikembalikan ke preset bawaan.");
  };

  // Add Participant (Tanpa input Kode NXT, Kota, ataupun Poin Babak 1-3)
  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipant.name.trim() || !newParticipant.institution.trim()) return;

    const cleanedMembers = newParticipant.members.filter((m) => m.name.trim() !== "");
    const code = `NXT-${100 + participants.length + 1}`;

    const created: Participant = {
      id: `nxt-${Date.now()}`,
      code,
      name: newParticipant.name.trim(),
      institution: newParticipant.institution.trim(),
      city: "-",
      category: newParticipant.category || categories[0],
      status: newParticipant.status,
      scores: { babak1: 0, babak2: 0, babak3: 0 },
      criteria: {
        teknis: 0,
        inovasi: 0,
        kecepatan: 0,
        presentasi: 0,
      },
      members: cleanedMembers.length > 0 ? cleanedMembers : [{ name: "Ketua Tim", role: "Team Captain" }],
      totalPoints: 0,
      previousRank: participants.length + 1,
      lastUpdated: "Baru saja",
      avatarColor: "from-cyan-500 to-blue-600",
    };

    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(created),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.participants) setParticipants(json.data.participants);
        broadcastSync("DATA_REFRESH");
        showNotification(`Peserta "${created.name}" berhasil didaftarkan!`);
        setNewParticipant({
          name: "",
          institution: "",
          category: categories[0] || "Cyber Security & CTF",
          status: "Aktif",
          members: [
            { name: "", role: "Team Captain" },
            { name: "", role: "Anggota" },
          ],
        });
      }
    } catch (err) {
      console.error("Gagal menambah peserta:", err);
    }
  };

  // Delete participant prompt (Custom Modal)
  const promptDeleteParticipant = (id: string, name: string) => {
    setDeleteConfirmTarget({ id, name });
  };

  const handleConfirmDeleteParticipant = async () => {
    if (!deleteConfirmTarget) return;
    const { id, name } = deleteConfirmTarget;
    setDeleteConfirmTarget(null);

    try {
      const res = await fetch(`/api/participants?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.participants) setParticipants(json.data.participants);
        broadcastSync("DATA_REFRESH");
        showNotification(`Peserta "${name}" berhasil dihapus!`);
      }
    } catch (err) {
      console.error("Gagal hapus peserta:", err);
    }
  };

  // Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.categories) setCategories(json.data.categories);
        broadcastSync("DATA_REFRESH");
        showNotification(`Kategori "${newCatName.trim()}" ditambahkan!`);
        setNewCatName("");
      }
    } catch (err) {
      console.error("Gagal tambah kategori:", err);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (catName: string) => {
    if (categories.length <= 1) return;
    try {
      const res = await fetch(`/api/categories?name=${encodeURIComponent(catName)}`, { method: "DELETE" });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.categories) setCategories(json.data.categories);
        broadcastSync("DATA_REFRESH");
        showNotification(`Kategori "${catName}" dihapus!`);
      }
    } catch (err) {
      console.error("Gagal hapus kategori:", err);
    }
  };

  // Import CSV
  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.participants) setParticipants(json.data.participants);
        if (json.data?.categories) setCategories(json.data.categories);
        broadcastSync("DATA_REFRESH");
        showNotification(`Berhasil mengimpor ${json.importedCount || 0} peserta!`);
        setCsvText("");
      }
    } catch (err) {
      console.error("Gagal import CSV:", err);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Rank", "Kode", "Nama Tim", "Instansi", "Kota", "Kategori", "Status", "B1", "B2", "B3", "Total Poin"];
    const rows = participants.map((p, i) => [
      i + 1,
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
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", "NEXT-Arena-Database.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset Database (Custom Modal)
  const handleConfirmResetDB = async () => {
    setIsResetConfirmOpen(false);
    try {
      const res = await fetch("/api/arena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setParticipants(json.data.participants);
          setCategories(json.data.categories);
          if (json.data.announcement) setAnnouncement(json.data.announcement);
        }
        broadcastSync("DATA_REFRESH");
        showNotification("Semua peserta berhasil dikosongkan!");
      }
    } catch (err) {
      console.error("Gagal mengosongkan data:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-zinc-100 bg-low-poly">
      {/* Top Gradient Accent */}
      <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-sky-400 to-amber-400" />

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#060e1c]/90 border-b border-cyan-900/40">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>Kembali ke Monitor Arena</span>
            </Link>
            <div className="h-6 w-[1px] bg-zinc-800 hidden sm:block" />
            <ArenaLogo size="sm" showTagline={false} />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Title & Toast Notification */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Halaman Pengaturan & Konfigurasi NEXT Arena</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Pusat kendali pendaftaran peserta, setting timer perlombaan, aturan pembobotan poin, dan manajemen sistem perlombaan.
            </p>
          </div>

          {saveSuccessMsg && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-lg animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 overflow-x-auto pb-1">
          {[
            { id: "peserta", label: "Input & Kelola Peserta", icon: UserPlus },
            { id: "babak", label: "Setting Babak & Model", icon: Layers },
            { id: "bracket", label: "Bagan Turnamen", icon: GitBranch },
            { id: "timer", label: "Setting Match Timer", icon: Timer },
            { id: "point", label: "Setting Point", icon: Sliders },
            { id: "ticker_kategori", label: "Ticker & Kategori Lomba", icon: Megaphone },
            { id: "backup", label: "Import, Export & Database", icon: FileSpreadsheet },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border-b-2 ${
                  active
                    ? "bg-zinc-900/80 text-cyan-400 border-cyan-500"
                    : "text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900/40"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: INPUT & KELOLA PESERTA */}
        {activeTab === "peserta" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Input Peserta Baru */}
            <div className="lg:col-span-5 bg-[#0a172c]/90 border border-cyan-900/40 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="border-b border-zinc-800 pb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                  REGISTRASI PESERTA / TIM
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Tambah Peserta Baru</h3>
                <p className="text-xs text-zinc-400">Data langsung tersimpan permanen di database lokal.</p>
              </div>

              <form onSubmit={handleAddParticipant} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Nama Peserta / Tim *</label>
                  <input
                    type="text"
                    required
                    value={newParticipant.name}
                    onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                    placeholder="Contoh: Garuda Cyber Team"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Asal Instansi / Kampus / Sekolah *</label>
                  <input
                    type="text"
                    required
                    value={newParticipant.institution}
                    onChange={(e) => setNewParticipant({ ...newParticipant, institution: e.target.value })}
                    placeholder="Contoh: Universitas Indonesia"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Kategori Lomba</label>
                    <select
                      value={newParticipant.category}
                      onChange={(e) => setNewParticipant({ ...newParticipant, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Status Awal</label>
                    <select
                      value={newParticipant.status}
                      onChange={(e) => setNewParticipant({ ...newParticipant, status: e.target.value as ParticipantStatus })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Finalis">Finalis</option>
                      <option value="Gugur">Gugur</option>
                    </select>
                  </div>
                </div>

                {/* Anggota Tim Form */}
                <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300">Daftar Anggota Tim</label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewParticipant({
                          ...newParticipant,
                          members: [...newParticipant.members, { name: "", role: "Anggota" }],
                        })
                      }
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                      + Tambah Anggota
                    </button>
                  </div>
                  {newParticipant.members.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => {
                          const updated = [...newParticipant.members];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setNewParticipant({ ...newParticipant, members: updated });
                        }}
                        placeholder={`Nama Anggota #${idx + 1}`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={m.role}
                        onChange={(e) => {
                          const updated = [...newParticipant.members];
                          updated[idx] = { ...updated[idx], role: e.target.value };
                          setNewParticipant({ ...newParticipant, members: updated });
                        }}
                        placeholder="Peran"
                        className="w-32 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white text-xs font-bold hover:brightness-110 transition-all shadow-md"
                >
                  Daftarkan Peserta
                </button>
              </form>
            </div>

            {/* List Peserta yang Terdaftar */}
            <div className="lg:col-span-7 bg-[#0a172c]/90 border border-cyan-900/40 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">Peserta Terdaftar ({participants.length})</h3>
                  <p className="text-xs text-zinc-400">Daftar tim aktif yang terdaftar dalam kompetisi.</p>
                </div>
                <div className="flex items-center gap-2">
                  {participants.length > 0 && (
                    <button
                      onClick={() => setIsResetConfirmOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Kosongkan Semua</span>
                    </button>
                  )}
                  <button
                    onClick={loadData}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs border border-zinc-800"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {participants.length === 0 ? (
                  <div className="py-16 text-center text-zinc-500 space-y-2">
                    <p className="text-sm font-semibold text-zinc-400">Belum ada peserta yang didaftarkan</p>
                    <p className="text-xs text-zinc-600">Gunakan form di sebelah kiri untuk menambah tim baru.</p>
                  </div>
                ) : (
                  participants.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 font-mono text-xs font-bold flex items-center justify-center text-cyan-400 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-sm truncate">{p.name}</p>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            {p.code}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate">
                          {p.institution} • {p.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span className="font-mono text-sm font-bold text-yellow-400 block">
                          {p.totalPoints.toLocaleString("id-ID")} PTS
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          B1:{p.scores.babak1} B2:{p.scores.babak2} B3:{p.scores.babak3}
                        </span>
                      </div>
                      <button
                        onClick={() => promptDeleteParticipant(p.id, p.name)}
                        title="Hapus Peserta"
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SETTING BABAK & MODEL DINAMIS */}
        {activeTab === "babak" && (
          <div className="space-y-6 w-full">
            {/* Bagian 1: Manajemen Babak Turnamen (Manual Add, Model Ranking vs Gugur, Format 1x vs 2x) */}
            <div className="bg-[#0a172c]/90 border border-cyan-900/40 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="border-b border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                      STRUKTUR TURNAMEN DINAMIS
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
                      {tournamentStages.length} Babak Dikonfigurasi
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1">Daftar Babak Pertandingan</h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                    Tambahkan babak secara manual. Tentukan model (Ranking / Gugur) dan format main (1x / 2x Tukar Sisi) pada masing-masing babak.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingStage(null);
                    setNewStageName("");
                    setNewStageModel("ranking");
                    setNewStageTurns("1x");
                    setNewStageResetPoints(true);
                    setIsAddStageModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-amber-400 text-zinc-950 font-bold text-xs sm:text-sm hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Tambah Babak Baru</span>
                </button>
              </div>

              {/* List Kartu Babak */}
              <div className="space-y-4">
                {tournamentStages.length === 0 ? (
                  <div className="py-12 px-6 text-center rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-950/40 space-y-3">
                    <GitBranch className="w-10 h-10 mx-auto text-zinc-600" />
                    <div>
                      <p className="text-base font-bold text-white">Belum Ada Babak Perlombaan</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Semua babak telah dihapus. Klik tombol di bawah atau di atas untuk menambahkan babak baru.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStage(null);
                        setNewStageName("");
                        setNewStageModel("ranking");
                        setNewStageTurns("1x");
                        setNewStageResetPoints(true);
                        setIsAddStageModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-amber-400 text-zinc-950 font-bold text-xs hover:brightness-110 shadow-md transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Tambah Babak Baru</span>
                    </button>
                  </div>
                ) : (
                  tournamentStages.map((stage, index) => {
                    const matchCount = bracketMatches.filter((m) => m.round === stage.name).length;

                    return (
                      <div
                        key={stage.id}
                        className="p-5 sm:p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700/80 hover:bg-zinc-900/80 transition-all space-y-4 shadow-sm"
                      >
                        {/* Baris Atas: Nomor, Nama Babak & Tombol Aksi */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/80 text-cyan-400 font-mono text-xs font-black flex items-center justify-center shrink-0">
                              #{index + 1}
                            </span>

                            <div className="flex-1 min-w-[200px] max-w-md">
                              <input
                                type="text"
                                value={stage.name}
                                onChange={(e) => handleUpdateStage(stage.id, { name: e.target.value })}
                                placeholder="Ketik Nama Babak..."
                                className="w-full px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 text-sm font-black text-white focus:outline-none focus:border-cyan-500 transition-colors"
                              />
                            </div>

                            <span className="text-[11px] font-mono text-zinc-500">
                              ({matchCount} laga terdaftar)
                            </span>
                          </div>

                        {/* Tombol Urutan, Edit & Hapus */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStage(stage);
                              setNewStageName(stage.name);
                              setNewStageModel(stage.model);
                              setNewStageTurns(stage.turns);
                              setNewStageResetPoints(stage.resetPoints !== false);
                              setIsAddStageModalOpen(true);
                            }}
                            title="Edit Pengaturan Babak"
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700/60 transition-all cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveStage(index, "up")}
                            title="Geser Babak ke Atas"
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700/60 transition-all cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={index === tournamentStages.length - 1}
                            onClick={() => handleMoveStage(index, "down")}
                            title="Geser Babak ke Bawah"
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700/60 transition-all cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setStageDeleteTarget(stage)}
                            title="Hapus Babak Ini"
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/60 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Baris Kontrol: 3 Kolom (Model Babak, Format Main, Hitungan Poin) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Kolom 1: Pilihan Model (Ranking vs Gugur) */}
                        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                              <span>Model Babak:</span>
                              <strong className="text-white">
                                {stage.model === "ranking" ? "Ranking (Poin)" : "Gugur (Knockout)"}
                              </strong>
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {/* Pilihan: Ranking */}
                            <button
                              type="button"
                              onClick={() => handleUpdateStage(stage.id, { model: "ranking" })}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1 cursor-pointer ${
                                stage.model === "ranking"
                                  ? "bg-gradient-to-b from-amber-500/20 to-zinc-900 border-amber-500/80 shadow-sm ring-1 ring-amber-500/50"
                                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Ranking</span>
                                </span>
                                {stage.model === "ranking" && (
                                  <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">
                                Klasemen & Akumulasi skor per ronde
                              </span>
                            </button>

                            {/* Pilihan: Gugur */}
                            <button
                              type="button"
                              onClick={() => handleUpdateStage(stage.id, { model: "gugur" })}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1 cursor-pointer ${
                                stage.model === "gugur"
                                  ? "bg-gradient-to-b from-rose-500/20 to-zinc-900 border-rose-500/80 shadow-sm ring-1 ring-rose-500/50"
                                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                                  <Swords className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Gugur</span>
                                </span>
                                {stage.model === "gugur" && (
                                  <Check className="w-3.5 h-3.5 text-rose-400 stroke-[3]" />
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">
                                Sistem gugur duel eliminasi 1 vs 1
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Kolom 2: Pilihan Format Laga (1x vs 2x Tukar Sisi) */}
                        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                              <span>Format Main:</span>
                              <strong className="text-white">
                                {stage.turns === "2x" ? "2x Main (Tukar Sisi)" : "1x Main (Langsung)"}
                              </strong>
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {/* Pilihan: 1x Main */}
                            <button
                              type="button"
                              onClick={() => handleUpdateStage(stage.id, { turns: "1x" })}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1 cursor-pointer ${
                                stage.turns === "1x"
                                  ? "bg-gradient-to-b from-yellow-500/20 to-zinc-900 border-yellow-500/80 shadow-sm ring-1 ring-yellow-500/50"
                                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                                  <Zap className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                                  <span>1x Main</span>
                                </span>
                                {stage.turns === "1x" && (
                                  <Check className="w-3.5 h-3.5 text-yellow-400 stroke-[3]" />
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">
                                1 Ronde langsung rekap data final
                              </span>
                            </button>

                            {/* Pilihan: 2x Main */}
                            <button
                              type="button"
                              onClick={() => handleUpdateStage(stage.id, { turns: "2x" })}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1 cursor-pointer ${
                                stage.turns === "2x"
                                  ? "bg-gradient-to-b from-cyan-500/20 to-zinc-900 border-cyan-500/80 shadow-sm ring-1 ring-cyan-500/50"
                                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                                  <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>2x Main</span>
                                </span>
                                {stage.turns === "2x" && (
                                  <Check className="w-3.5 h-3.5 text-cyan-400 stroke-[3]" />
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">
                                P1 & P2: Tukar Sudut (Rata-rata Skor)
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Kolom 3: Pilihan Hitungan Poin (Reset ke 0 vs Bawa Poin) */}
                        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                              <span>Hitungan Poin:</span>
                              <strong className={stage.resetPoints !== false ? "text-amber-400" : "text-emerald-400"}>
                                {stage.resetPoints !== false ? "Reset ke 0" : "Bawa Poin"}
                              </strong>
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {/* Pilihan: Reset ke 0 */}
                            <button
                              type="button"
                              onClick={() => handleUpdateStage(stage.id, { resetPoints: true })}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1 cursor-pointer ${
                                stage.resetPoints !== false
                                  ? "bg-gradient-to-b from-amber-500/20 to-zinc-900 border-amber-500/80 shadow-sm ring-1 ring-amber-500/50"
                                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Reset ke 0</span>
                                </span>
                                {stage.resetPoints !== false && (
                                  <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">
                                Skor babak dimulai segar dari 0
                              </span>
                            </button>

                            {/* Pilihan: Bawa Poin (Carry Over) */}
                            <button
                              type="button"
                              onClick={() => handleUpdateStage(stage.id, { resetPoints: false })}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1 cursor-pointer ${
                                stage.resetPoints === false
                                  ? "bg-gradient-to-b from-emerald-500/20 to-zinc-900 border-emerald-500/80 shadow-sm ring-1 ring-emerald-500/50"
                                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Bawa Poin</span>
                                </span>
                                {stage.resetPoints === false && (
                                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">
                                Akumulasi carry over dari babak lalu
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Footer Aksi Babak */}
                      <div className="flex items-center justify-end pt-3 border-t border-zinc-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBracketRound(stage.name);
                            setActiveTab("bracket");
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Kelola Bagan & Jadwal Laga ➔</span>
                        </button>
                      </div>
                    </div>
                  );
                }))}
              </div>
            </div>

            {/* Link Menuju Tab Bagan Turnamen */}
            <div className="bg-[#0a172c]/90 border border-cyan-900/40 rounded-2xl p-6 sm:p-7 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Konsol Khusus Bagan Turnamen (Jadwal Laga)</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Kelola seluruh laga duel 1 vs 1, input skor manual, tombol aturan poin kustom, dan penentuan pemenang di tab terpisah.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("bracket")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                <span>Buka Tab Bagan Turnamen</span>
                <GitBranch className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB KHUSUS: BAGAN TURNAMEN (LIST JADWAL LAGA 2 TIM) */}
        {activeTab === "bracket" && (
          <div className="space-y-6 w-full">
            {/* Header & Quick Actions */}
            <div className="bg-[#0a172c]/90 border border-cyan-900/40 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
              <div className="border-b border-zinc-800 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                      JADWAL LAGA DUEL (2 TIM SEKALI MAIN)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
                      {participants.length} Tim Terdaftar
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2.5">
                    <GitBranch className="w-6 h-6 text-cyan-400" />
                    <span>Konsol Kontrol Bagan & Jadwal Laga</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                    Sistem poin/ranking. Tim diacak untuk tanding 2 tim sekali main. Skor laga otomatis masuk ke klasemen babak aktif.
                  </p>
                </div>

                {/* Right Action: Reset Babak & Reset Poin */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowResetRoundModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                    title="Kembalikan semua peserta ke babak pertama dan kosongkan laga babak 2 dan seterusnya"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reset Babak</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowResetBracketModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                    title="Kembalikan seluruh skor pertandingan dan poin peserta ke 0"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                    <span>Reset Poin</span>
                  </button>
                </div>
              </div>

              {tournamentStages.length === 0 ? (
                <div className="py-16 text-center rounded-2xl bg-zinc-950/40 border-2 border-dashed border-zinc-800 p-8 space-y-4">
                  <GitBranch className="w-12 h-12 text-zinc-600 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-base font-bold text-white">Belum Ada Babak Perlombaan</p>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto">
                      Bagan turnamen tersinkronisasi langsung dengan babak yang Anda buat. Silakan tambahkan babak terlebih dahulu di menu Setting Babak & Model.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("babak")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-amber-400 text-zinc-950 font-bold text-xs hover:brightness-110 shadow-md transition-all cursor-pointer"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Buka Setting Babak & Model</span>
                  </button>
                </div>
              ) : (
                /* Tournament Generation & Babak Selector Bar */
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-white block">Pilih Babak Pertandingan:</span>
                      <span className="text-[11px] text-zinc-400">
                        Pilih babak di bawah untuk melihat dan mengacak atau menyusun manual jadwal laga pertandingan.
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenManualBracketModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs sm:text-sm font-bold border border-zinc-700 hover:border-zinc-600 transition-all shadow-md shrink-0 cursor-pointer"
                        title="Tentukan pasangan tanding secara manual"
                      >
                        <Users className="w-4 h-4 text-cyan-400" />
                        <span>Input / Susun Manual ({selectedBracketRound})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGenerateBracket(selectedBracketRound)}
                        disabled={isGeneratingBracket}
                        className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all shadow-md shrink-0 cursor-pointer"
                      >
                        <span>Acak & Generate Jadwal ({selectedBracketRound})</span>
                      </button>
                    </div>
                  </div>

                  {/* Round Navigation Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
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
                              ? "bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-sm"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                          }`}
                        >
                          <span>{stage.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                            {stage.model === "ranking" ? "Ranking" : "Gugur"} • {stage.turns}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                              isActive ? "bg-cyan-500/30 text-cyan-200" : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {matchCount} Laga
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* List Laga Display */}
            {(() => {
              const currentMatches = bracketMatches.filter((m) => m.round === selectedBracketRound);

              if (currentMatches.length === 0) {
                return (
                  <div className="py-12 text-center rounded-2xl bg-[#0a172c]/90 border border-cyan-900/40 p-6 sm:p-8 space-y-6 shadow-xl">
                    <GitBranch className="w-12 h-12 text-cyan-400 mx-auto" />
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-white">Belum Ada Jadwal Laga ({selectedBracketRound})</p>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto">
                        {qualifiedBracketParticipants.length >= 2
                          ? `Tersedia ${qualifiedBracketParticipants.length} tim yang lolos ke ${selectedBracketRound}. Klik tombol di bawah untuk mengacak pasangan tanding.`
                          : `Belum cukup tim untuk mengacak jadwal. Silakan loloskan tim terlebih dahulu melalui tab Daftar Peserta & Klasemen.`}
                      </p>
                    </div>

                    {/* Daftar Tim Lolos ke Babak Ini */}
                    {qualifiedBracketParticipants.length > 0 ? (
                      <div className="max-w-4xl mx-auto pt-2 text-left">
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs font-mono">
                          <span className="text-cyan-400 font-bold uppercase tracking-wider">
                            Daftar Tim Lolos ke {selectedBracketRound} ({qualifiedBracketParticipants.length} Tim):
                          </span>
                          <span className="text-emerald-400 text-[11px] font-bold">
                            {qualifiedBracketParticipants.length >= 2
                              ? "Siap Diacak & Dibuat Jadwal"
                              : "Perlu minimal 2 tim"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                          {qualifiedBracketParticipants.map((p, idx) => (
                            <div
                              key={p.id}
                              className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between shadow-sm"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
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
                          Belum ada peserta yang dinyatakan lolos ke <strong>{selectedBracketRound}</strong>. Buka tab <strong>Peserta</strong> lalu klik tombol <em>Lanjut ke {selectedBracketRound}</em> pada tim yang berhak lolos.
                        </p>
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleOpenManualBracketModal}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs sm:text-sm font-bold border border-zinc-700 hover:border-zinc-600 shadow-lg transition-all cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-cyan-400" />
                        <span>Input / Susun Manual ({selectedBracketRound})</span>
                      </button>

                      {qualifiedBracketParticipants.length >= 2 ? (
                        <button
                          type="button"
                          onClick={() => handleGenerateBracket(selectedBracketRound)}
                          disabled={isGeneratingBracket}
                          className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-bold hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                        >
                          <span>Acak &amp; Buat Jadwal ({selectedBracketRound})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveTab("peserta")}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all cursor-pointer"
                        >
                          <span>Buka Tab Peserta &amp; Klasemen ➔</span>
                        </button>
                      )}
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
                    <span className="font-mono text-cyan-400 font-bold">
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
                    const redInst = instA;
                    const blueInst = instB;

                    return (
                      <div
                        key={match.id}
                        className="bg-[#0a172c]/90 border border-cyan-900/40 hover:border-zinc-700/80 rounded-2xl p-5 shadow-xl space-y-4 transition-all"
                      >
                        {/* Match Card Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                          <div className="flex items-center gap-2.5">
                            <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-extrabold text-xs tracking-wider border border-cyan-500/40">
                              {match.matchLabel}
                            </span>
                            <span className="text-xs text-zinc-400 font-medium">
                              {match.category || "Transporter SMP"} • {isSingle ? "1 Tim (Tanding Tunggal)" : is2x ? "2x Main (Tukar Sisi)" : "1x Main (Langsung Data)"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Tombol Edit Pasangan Laga */}
                            <button
                              type="button"
                              onClick={() => {
                                if (editingMatchCardId === match.id) {
                                  handleCancelEditMatchCard();
                                } else {
                                  handleStartEditMatchCard(match);
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm cursor-pointer ${
                                editingMatchCardId === match.id
                                  ? "bg-amber-500/20 border-amber-500 text-amber-300"
                                  : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
                              }`}
                              title="Ganti tim yang bertanding pada laga ini"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>{editingMatchCardId === match.id ? "Batal Edit" : "Edit Pasangan"}</span>
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

                            {/* Tombol Mulai Pertandingan dengan Animasi Shutter (sembunyi jika sudah Selesai) */}
                            {match.status !== "Selesai" && (
                              <button
                                type="button"
                                disabled={Boolean(shutterMatch)}
                                onMouseEnter={() => {
                                  try {
                                    router.prefetch(`/tanding/${match.id}`);
                                  } catch {}
                                }}
                                onClick={() => handleStartMatchWithShutter(match)}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-amber-400 text-zinc-950 font-black text-xs hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,163,255,0.4)] animate-pulse hover:animate-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                                title="Buka Arena Tanding & Timer Stopwatch"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Mulai Tanding</span>
                              </button>
                            )}

                            {/* Quick Status Pill */}
                            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-xs">
                              {(match.status === "Selesai"
                                ? (["Selesai"] as const)
                                : (["Siap Tanding", "Berlangsung", "Selesai"] as const)
                              ).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  disabled={match.status === "Selesai"}
                                  onClick={() => handleSetMatchStatus(match.id, st)}
                                  className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                                    match.status === st
                                      ? st === "Berlangsung"
                                        ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                                        : st === "Selesai"
                                        ? "bg-emerald-500 text-zinc-950 font-bold cursor-default"
                                        : "bg-amber-500 text-zinc-950 font-bold"
                                      : "text-zinc-400 hover:text-white cursor-pointer"
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* INLINE EDIT PASANGAN LAGA */}
                        {editingMatchCardId === match.id && (
                          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
                                <Pencil className="w-3.5 h-3.5" />
                                Edit Tim Tanding: {match.matchLabel}
                              </span>
                              <span className="text-[11px] text-zinc-400">
                                Pilih dari {qualifiedBracketParticipants.length} tim yang lolos ke {match.round}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-mono text-rose-400 block mb-1 font-bold">
                                  Sudut Merah:
                                </label>
                                <select
                                  value={editTeamA}
                                  onChange={(e) => setEditTeamA(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-rose-500/40 text-white text-xs font-bold focus:border-rose-400 focus:outline-none"
                                >
                                  <option value="">-- Pilih Tim Sudut Merah --</option>
                                  {qualifiedBracketParticipants.map((p) => (
                                    <option key={p.id} value={p.name}>
                                      {p.code ? `[${p.code}] ` : ""}{p.name} {p.institution ? `(${p.institution})` : ""}
                                    </option>
                                  ))}
                                  {editTeamA && !qualifiedBracketParticipants.some((p) => p.name === editTeamA) && (
                                    <option value={editTeamA}>{editTeamA}</option>
                                  )}
                                </select>
                              </div>

                              <div>
                                <label className="text-[11px] font-mono text-blue-400 block mb-1 font-bold">
                                  Sudut Biru:
                                </label>
                                <select
                                  value={editTeamB}
                                  onChange={(e) => setEditTeamB(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-blue-500/40 text-white text-xs font-bold focus:border-blue-400 focus:outline-none"
                                >
                                  <option value="">-- Pilih Tim Sudut Biru --</option>
                                  <option value="- (Tanding Tunggal)">- (Tanding Tunggal / Bye) -</option>
                                  {qualifiedBracketParticipants.map((p) => (
                                    <option key={p.id} value={p.name} disabled={p.name === editTeamA}>
                                      {p.code ? `[${p.code}] ` : ""}{p.name} {p.institution ? `(${p.institution})` : ""}
                                    </option>
                                  ))}
                                  {editTeamB && editTeamB !== "- (Tanding Tunggal)" && !qualifiedBracketParticipants.some((p) => p.name === editTeamB) && (
                                    <option value={editTeamB}>{editTeamB}</option>
                                  )}
                                </select>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleCancelEditMatchCard}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                disabled={isSavingMatchCard || !editTeamA.trim()}
                                onClick={() => handleSaveMatchCard(match.id)}
                                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isSavingMatchCard ? "Menyimpan..." : "Simpan Pasangan"}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* BODY TAMPILAN LAGA */}
                        {is2x && !isSingle ? (
                          /* TAMPILAN 2X MAIN: PUTARAN 1 & PUTARAN 2 DIMUNCULKAN BERTINGKAT SEKALIGUS (NO TAB) */
                          <div className="space-y-4">
                            {/* BLOK PUTARAN 1 */}
                            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-black uppercase flex items-center gap-1.5">
                                  <span>⚔️ Putaran 1</span>
                                </span>
                                <span className="text-xs font-mono text-zinc-400">
                                  Skor P1: <strong className="text-white">{match.teamA} ({match.scoreALeg1 || 0})</strong> vs <strong className="text-white">{match.teamB} ({match.scoreBLeg1 || 0})</strong>
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
                                        onClick={() => handleBracketLegScoreChange(match.id, "A", 1, rule.points)}
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

                                {/* Sudut Biru Putaran 1: Team B */}
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
                                        onClick={() => handleBracketLegScoreChange(match.id, "B", 1, rule.points)}
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
                              </div>
                            </div>

                            {/* BLOK PUTARAN 2 (TUKAR SISI) - DIMUNCULKAN DI BAWAHNYA LANGSUNG */}
                            <div className="p-4 rounded-xl bg-zinc-950/60 border border-cyan-500/30 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-black uppercase flex items-center gap-1.5">
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                  <span>🔁 Putaran 2 (Tukar Sisi Arena)</span>
                                </span>
                                <span className="text-xs font-mono text-zinc-400">
                                  Skor P2: <strong className="text-white">{match.teamB} ({match.scoreBLeg2 || 0})</strong> vs <strong className="text-white">{match.teamA} ({match.scoreALeg2 || 0})</strong>
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Sudut Merah Putaran 2: Team B (Tukar) */}
                                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-rose-500/30 space-y-2.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                        <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">
                                          Sudut Merah (Tukar)
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
                                        onClick={() => handleBracketLegScoreChange(match.id, "B", 2, rule.points)}
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

                                {/* Sudut Biru Putaran 2: Team A (Tukar) */}
                                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-blue-500/30 space-y-2.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                        <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">
                                          Sudut Biru (Tukar)
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
                                        onClick={() => handleBracketLegScoreChange(match.id, "A", 2, rule.points)}
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

                            {/* REKAP HASIL AKHIR & RATA-RATA DARI KEDUA PUTARAN */}
                            <div className="p-3.5 rounded-xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-700/80 flex flex-wrap items-center justify-between gap-4 font-mono">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-cyan-400 font-black uppercase tracking-wider">
                                  🎯 Rata-Rata Resmi Akhir:
                                </span>
                                <span className="text-[11px] text-zinc-400">
                                  (P1 + P2) / 2
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-zinc-300 font-bold">{match.teamA}:</span>
                                  <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 font-black text-amber-400 text-sm">
                                    {match.scoreA} PTS
                                  </span>
                                </div>

                                <span className="text-zinc-600 font-black">VS</span>

                                <div className="flex items-center gap-2">
                                  <span className="text-zinc-300 font-bold">{match.teamB}:</span>
                                  <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 font-black text-amber-400 text-sm">
                                    {match.scoreB} PTS
                                  </span>
                                </div>

                                {match.status === "Selesai" && (
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold text-xs">
                                    {match.winner === "A" ? `${match.teamA} Menang` : match.winner === "B" ? `${match.teamB} Menang` : "Hasil Seri"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* TAMPILAN 1X MAIN (LANGSUNG DATA) ATAU TANDING TUNGGAL */
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                            {!isSingle && (
                              <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-zinc-900 border-2 border-zinc-700 items-center justify-center text-[11px] font-black text-cyan-400 shadow-lg">
                                VS
                              </div>
                            )}

                            {/* Team Corner (Red: Team A) */}
                            <div
                              className={`p-4 rounded-xl border space-y-3 transition-all ${
                                match.status === "Selesai" && match.scoreA > match.scoreB
                                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                                  : "bg-zinc-900/70 border-zinc-800"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                                    <span className="text-[10px] font-bold text-rose-400 tracking-wider uppercase font-mono">
                                      SUDUT MERAH
                                    </span>
                                  </div>
                                  <h4 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                                    {match.teamA}
                                  </h4>
                                  {instA && <p className="text-xs text-zinc-400 truncate">{instA}</p>}
                                </div>

                                <div className="flex flex-col items-end shrink-0">
                                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                                    Skor Laga
                                  </span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={match.scoreA}
                                    onChange={(e) => handleSetExactScore(match.id, "A", parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 text-center font-mono text-lg font-black rounded-xl bg-zinc-950 text-amber-400 border border-zinc-700 focus:outline-none focus:border-cyan-500 shadow-inner"
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
                                      onClick={() => handleBracketScoreChange(match.id, "A", rule.points)}
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
                                  onClick={() => handleBracketScoreChange(match.id, "A", 1)}
                                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold"
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBracketScoreChange(match.id, "A", -1)}
                                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-mono font-bold"
                                >
                                  -1
                                </button>
                              </div>
                            </div>

                            {/* Team Corner (Blue: Team B) */}
                            <div
                              className={`p-4 rounded-xl border space-y-3 transition-all ${
                                match.status === "Selesai" && match.scoreB > match.scoreA
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
                                          SUDUT BIRU
                                        </span>
                                      </div>
                                      <h4 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                                        {match.teamB}
                                      </h4>
                                      {instB && <p className="text-xs text-zinc-400 truncate">{instB}</p>}
                                    </div>

                                    <div className="flex flex-col items-end shrink-0">
                                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                                        Skor Laga
                                      </span>
                                      <input
                                        type="number"
                                        step="0.5"
                                        value={match.scoreB}
                                        onChange={(e) => handleSetExactScore(match.id, "B", parseFloat(e.target.value) || 0)}
                                        className="w-20 px-2 py-1 text-center font-mono text-lg font-black rounded-xl bg-zinc-950 text-amber-400 border border-zinc-700 focus:outline-none focus:border-cyan-500 shadow-inner"
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
                                          onClick={() => handleBracketScoreChange(match.id, "B", rule.points)}
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
                                      onClick={() => handleBracketScoreChange(match.id, "B", 1)}
                                      className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold"
                                    >
                                      +1
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleBracketScoreChange(match.id, "B", -1)}
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
          </div>
        )}

        {/* TAB 3: SETTING TIMER & STOPWATCH PERTANDINGAN DENGAN FITUR PERSIAPAN (FULL WIDTH) */}
        {activeTab === "timer" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
            {/* Kolom Kiri (7 Kolom): Konsol Live Stopwatch & Kontrol Langsung */}
            <div className="lg:col-span-7 bg-[#0a172c]/90 border border-cyan-900/40 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
              <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                    LIVE ARENA STOPWATCH CONSOLE
                  </span>
                  <h3 className="text-xl font-bold text-white mt-0.5">Kontrol Pertandingan & Stopwatch</h3>
                  <p className="text-xs text-zinc-400">
                    Kendalikan waktu persiapan dan jalankan stopwatch hitung maju untuk peserta secara langsung.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    title={soundEnabled ? "Suara Buzzer Aktif (Klik untuk Matikan)" : "Suara Buzzer Mati (Klik untuk Aktifkan)"}
                    className={`p-2.5 rounded-xl border transition-all ${
                      soundEnabled
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500"
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Timer className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Display Stopwatch / Countdown Jam Besar */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#09090b] border border-zinc-800 text-center space-y-4 shadow-inner relative overflow-hidden">
                {/* Status Header Badge */}
                <div className="flex items-center justify-center">
                  {timerPhase === "preparation" ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold font-mono tracking-wider animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>WAKTU PERSIAPAN (PREPARATION) • TIM BERSIAP</span>
                    </div>
                  ) : timerPhase === "prep_ended" ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/60 text-yellow-300 text-xs font-bold font-mono tracking-wider animate-bounce shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span>PERSIAPAN SELESAI (00:00) • SIAP START PERTANDINGAN!</span>
                    </div>
                  ) : timerPhase === "countdown" ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 via-sky-500/20 to-blue-500/20 border border-cyan-500/60 text-cyan-300 text-xs font-bold font-mono tracking-wider animate-pulse shadow-[0_0_20px_rgba(0,163,255,0.35)]">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>HITUNG MUNDUR START (3-2-1)</span>
                    </div>
                  ) : timerPhase === "match" ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold font-mono tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <Flame className="w-4 h-4 text-cyan-400" />
                      <span>PERTANDINGAN BERJALAN (STOPWATCH LIVE)</span>
                    </div>
                  ) : timerPhase === "paused" ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono">
                      <Pause className="w-4 h-4 text-amber-400" />
                      <span>PERTANDINGAN DIJEDA (PAUSED)</span>
                    </div>
                  ) : timerPhase === "finished" ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-bold font-mono shadow-[0_0_20px_rgba(244,63,94,0.25)]">
                      <StopCircle className="w-4 h-4 text-rose-400" />
                      <span>PERTANDINGAN SELESAI • CATATAN WAKTU FINAL</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-xs font-semibold font-mono">
                      <Clock className="w-4 h-4 text-zinc-400" />
                      <span>STANDBY • SIAP MEMULAI PERTANDINGAN</span>
                    </div>
                  )}
                </div>

                {/* Giant Digital Stopwatch Digits */}
                {timerPhase === "countdown" ? (
                  <div className="font-mono text-7xl sm:text-8xl font-black text-cyan-400 drop-shadow-[0_0_40px_rgba(0,163,255,0.6)] tracking-tight animate-bounce">
                    {timerSeconds}
                  </div>
                ) : timerPhase === "preparation" ? (
                  <div className="font-mono text-6xl sm:text-7xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(245,158,11,0.35)] tracking-tight">
                    {formatTimerDisplay(timerSeconds)}
                  </div>
                ) : (
                  <div className="font-mono font-black select-none flex items-baseline justify-center tracking-tight">
                    <span className="text-6xl sm:text-7xl bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,163,255,0.35)]">
                      {getStopwatchParts(timerElapsedMs).minutes}:{getStopwatchParts(timerElapsedMs).seconds}
                    </span>
                    <span className="text-3xl sm:text-4xl text-cyan-400 font-extrabold ml-1.5 drop-shadow-[0_0_20px_rgba(0,163,255,0.5)]">
                      .{getStopwatchParts(timerElapsedMs).centiseconds}
                    </span>
                  </div>
                )}

                {/* Sub-info Keterangan Waktu */}
                <div className="text-xs font-mono text-zinc-400 space-y-2">
                  {timerPhase === "preparation" ? (
                    <p className="text-amber-400 font-semibold">
                      Waktu Persiapan Tim di Arena (Sisa {timerSeconds} detik) • Berjalan penuh hingga 00:00
                    </p>
                  ) : timerPhase === "prep_ended" ? (
                    <p className="text-yellow-400 font-bold">
                      Waktu persiapan selesai! Klik tombol "Mulai Pertandingan (Hitung Mundur 3-2-1)" untuk memulai.
                    </p>
                  ) : timerPhase === "countdown" ? (
                    <p className="text-cyan-400 font-bold text-sm tracking-wide animate-pulse">
                      Bersiap di arena... Pertandingan dimulai dalam {timerSeconds} detik!
                    </p>
                  ) : timerPhase === "match" ? (
                    <div className="space-y-1.5 max-w-sm mx-auto">
                      <p className="text-zinc-300">
                        Stopwatch Berjalan (Hitung Maju dari 00:00)
                        {matchLimit > 0 && (
                          <span className="text-cyan-400 ml-1">
                            • Batas: {formatTimerDisplay(matchLimit)}
                          </span>
                        )}
                      </p>
                      {matchLimit > 0 && (
                        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden border border-zinc-700/60">
                          <div
                            className="bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 h-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.round((timerSeconds / matchLimit) * 100))}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : timerPhase === "finished" ? (
                    <p className="text-emerald-400 font-bold text-sm">
                      Catatan Waktu Resmi Pertandingan: {getStopwatchParts(timerElapsedMs).formatted}
                    </p>
                  ) : (
                    <p className="text-zinc-500">
                      Durasi Persiapan: {prepDuration}s • Batas Pertandingan: {matchLimit > 0 ? `${formatTimerDisplay(matchLimit)}` : "Tanpa Batas"}
                    </p>
                  )}
                </div>
              </div>

              {/* Tombol Kontrol Cepat Arena */}
              <div className="space-y-3">
                {/* Baris 1: Aksi Utama Pertandingan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tombol Waktu Persiapan */}
                  <button
                    type="button"
                    onClick={() => {
                      if (timerPhase === "preparation") {
                        handleTogglePause();
                      } else {
                        handleStartPrep();
                      }
                    }}
                    className={`py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-md ${
                      timerPhase === "preparation"
                        ? isTimerRunning
                          ? "bg-amber-500/25 hover:bg-amber-500/35 text-amber-300 border border-amber-500/50"
                          : "bg-amber-500 text-zinc-950 hover:bg-amber-400"
                        : "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      {timerPhase === "preparation"
                        ? isTimerRunning
                          ? "Jeda Waktu Persiapan"
                          : "Lanjut Waktu Persiapan"
                        : `Mulai Waktu Persiapan (${prepDuration}s)`}
                    </span>
                  </button>

                  {/* Tombol Start Stopwatch Pertandingan (Terpisah dengan 3-2-1 Countdown) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (timerPhase === "match") {
                        handleTogglePause();
                      } else if (timerPhase === "paused") {
                        handleTogglePause();
                      } else if (timerPhase === "countdown") {
                        handleTogglePause();
                      } else {
                        handleStartCountdown();
                      }
                    }}
                    className={`py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                      timerPhase === "countdown"
                        ? "bg-cyan-500 text-zinc-950 font-black animate-pulse shadow-cyan-500/40"
                        : timerPhase === "match"
                        ? isTimerRunning
                          ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
                          : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-emerald-500/25"
                        : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25"
                    }`}
                  >
                    {timerPhase === "match" && isTimerRunning ? (
                      <Pause className="w-4 h-4 shrink-0" />
                    ) : timerPhase === "countdown" ? (
                      <FastForward className="w-4 h-4 shrink-0 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 shrink-0" />
                    )}
                    <span>
                      {timerPhase === "countdown"
                        ? `Hitung Mundur (${timerSeconds})...`
                        : timerPhase === "match"
                        ? isTimerRunning
                          ? "Jeda Stopwatch"
                          : "Lanjutkan Stopwatch"
                        : timerPhase === "paused"
                        ? "Lanjutkan Stopwatch"
                        : "Mulai Pertandingan (Hitung Mundur 3-2-1)"}
                    </span>
                  </button>
                </div>

                {/* Baris 2: Selesai, Reset & Tools */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={handleFinishMatch}
                    disabled={timerPhase === "idle" || timerPhase === "finished"}
                    className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 border border-zinc-800 hover:border-rose-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Selesai & Kunci</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetStopwatch}
                    className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Reset (00:00)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetToPrep}
                    className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FastForward className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reset Persiapan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => playSound("start", soundStartUrl, soundVolume)}
                    className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Tes Buzzer</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Kolom Kanan (5 Kolom): Konfigurasi Durasi Persiapan, Limit Waktu & Tampilan Monitor */}
            <div className="lg:col-span-5 bg-[#0a172c]/90 border border-cyan-900/40 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
              <div className="border-b border-zinc-800 pb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                  TIMER CONFIGURATION
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">Konfigurasi Durasi & Layar</h3>
                <p className="text-xs text-zinc-400">
                  Atur preset waktu persiapan dan batas maksimal pertandingan yang disinkronkan ke layar arena.
                </p>
              </div>

              {/* Pengaturan Durasi Persiapan (Preparation) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Durasi Waktu Persiapan:</span>
                  </label>
                  <span className="text-[11px] font-mono text-amber-400 font-semibold">
                    {prepDuration} Detik ({Math.floor(prepDuration / 60)}m {prepDuration % 60}s)
                  </span>
                </div>

                {/* Preset Waktu Persiapan Cepat */}
                <div className="grid grid-cols-3 gap-2">
                  {[30, 45, 60, 90, 120, 180].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setPrepDuration(s);
                        if (timerPhase === "preparation" && !isTimerRunning) {
                          setTimerSeconds(s);
                        }
                      }}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                        prepDuration === s
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm"
                          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                      }`}
                    >
                      {s >= 60 ? `${s / 60} Menit` : `${s} Detik`}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Durasi Persiapan Kustom (Detik):
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={prepDuration}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 10;
                      setPrepDuration(v);
                      if (timerPhase === "preparation" && !isTimerRunning) {
                        setTimerSeconds(v);
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Pengaturan Batas Waktu Stopwatch (Match Limit) */}
              <div className="space-y-3 pt-4 border-t border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Batas Waktu Stopwatch (Limit):</span>
                  </label>
                  <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                    {matchLimit > 0 ? `${formatTimerDisplay(matchLimit)} (${Math.floor(matchLimit / 60)}m)` : "Tanpa Batas"}
                  </span>
                </div>

                {/* Preset Batas Waktu Cepat */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "2 Menit", sec: 120 },
                    { label: "3 Menit", sec: 180 },
                    { label: "5 Menit", sec: 300 },
                    { label: "7 Menit", sec: 420 },
                    { label: "10 Menit", sec: 600 },
                    { label: "Tanpa Batas", sec: 0 },
                  ].map((item) => (
                    <button
                      key={item.sec}
                      type="button"
                      onClick={() => setMatchLimit(item.sec)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                        matchLimit === item.sec
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm"
                          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Batas Waktu Kustom (Menit):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={Math.floor(matchLimit / 60)}
                    onChange={(e) => {
                      const m = Number(e.target.value) || 0;
                      setMatchLimit(m * 60);
                    }}
                    placeholder="0 untuk tanpa batas"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Tampilan Timer di Monitor Utama & Simpan */}
              <div className="space-y-4 pt-4 border-t border-zinc-800/80">
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div>
                    <span className="text-xs font-bold text-white block">Tampilkan Timer di Layar Monitor</span>
                    <span className="text-[11px] text-zinc-400">Tampilkan widget jam arena di layar monitor utama</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextShow = !showTimerOnMonitor;
                      setShowTimerOnMonitor(nextShow);
                      saveSettings({ show_timer_on_monitor: String(nextShow) });
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      showTimerOnMonitor
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    {showTimerOnMonitor ? "AKTIF (ON)" : "NONAKTIF (OFF)"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => saveSettings()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-bold hover:brightness-110 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Pengaturan Timer</span>
                </button>
              </div>
            </div>

            {/* Kolom Penuh (12 Kolom): KUSTOMISASI & INPUT AUDIO ARENA */}
            <div className="lg:col-span-12 bg-[#0a172c]/90 border border-cyan-900/40 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
              {/* Header Bagian Sound */}
              <div className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                      ARENA SOUND & BUZZER SYSTEM
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      4 Input Sound Tersedia
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                    <Music className="w-5 h-5 text-cyan-400" />
                    <span>Kustomisasi & Input Sound Pertandingan</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                    Unggah file suara kustom (.mp3, .wav, .ogg, .m4a) atau gunakan preset suara buzzer studio bawaan sistem untuk setiap momen pertandingan.
                  </p>
                </div>

                {/* Kontrol Master Volume, Toggle Suara & Tombol Stop Global */}
                <div className="flex flex-wrap items-center gap-3 bg-zinc-900/80 border border-zinc-800 px-4 py-2.5 rounded-xl shrink-0">
                  {/* Tombol Stop Global jika sedang ada audio memutar */}
                  {activePlayingKey && (
                    <button
                      type="button"
                      onClick={handleStopAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all animate-pulse"
                      title="Hentikan audio yang sedang diputar"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Audio</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const next = !soundEnabled;
                      setSoundEnabled(next);
                      if (!next) stopAllSounds();
                      saveSettings({ sound_enabled: String(next) });
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      soundEnabled
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-zinc-400" />}
                    <span>{soundEnabled ? "Audio ON" : "Audio MUTE"}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-400">Vol:</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={soundVolume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSoundVolume(val);
                        saveSettings({ sound_volume: String(val) });
                      }}
                      className="w-24 accent-cyan-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-cyan-400 font-bold w-9 text-right">
                      {Math.round(soundVolume * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid 4 Kartu Input Sound */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. SOUND PERSIAPAN (PREPARATION) */}
                <div className={`p-4 rounded-xl bg-zinc-900/60 border flex flex-col justify-between space-y-4 transition-all ${
                  activePlayingKey === "prep"
                    ? "border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)] bg-rose-950/10"
                    : "border-zinc-800 hover:border-amber-500/40"
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {activePlayingKey === "prep" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-400 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                            Memutar
                          </span>
                        )}
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          Fase 1
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Sound Waktu Persiapan</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Berbunyi saat tombol "Mulai Persiapan" ditekan untuk tim bersiap di arena.
                      </p>
                    </div>

                    <div className="pt-1">
                      {soundPrepUrl ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 max-w-full truncate">
                          <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
                          <span className="truncate">{soundPrepName || "Audio Kustom Aktif"}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-[11px] font-mono text-zinc-400">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Preset: Dual-Tone Chime</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-zinc-800/60">
                    {/* Toggle Loop / Putar Ulang Otomatis */}
                    <label className="flex items-center justify-between text-[11px] text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
                      <span className="flex items-center gap-1.5">
                        <Repeat className={`w-3.5 h-3.5 ${soundPrepLoop ? "text-amber-400" : "text-zinc-500"}`} />
                        <span>Putar Ulang Otomatis (Loop)</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={soundPrepLoop}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setSoundPrepLoop(next);
                          saveSettings({ sound_prep_loop: String(next) });
                        }}
                        className="accent-amber-500 w-3.5 h-3.5 cursor-pointer rounded"
                      />
                    </label>

                    <input
                      type="file"
                      ref={prepFileInputRef}
                      accept="audio/*"
                      onChange={(e) => handleUploadSound("prep", e)}
                      className="hidden"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {activePlayingKey === "prep" ? (
                        <button
                          type="button"
                          onClick={handleStopAll}
                          className="py-2 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-600/30 animate-pulse"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Suara</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePlayTest("prep")}
                          className="py-2 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 text-amber-400" />
                          <span>Putar / Tes</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isUploadingSound}
                        onClick={() => prepFileInputRef.current?.click()}
                        className="py-2 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah File</span>
                      </button>
                    </div>

                    {soundPrepUrl && (
                      <button
                        type="button"
                        onClick={() => handleResetSound("prep")}
                        className="w-full py-1.5 px-2 text-[11px] text-zinc-500 hover:text-rose-400 flex items-center justify-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Kembalikan ke Preset Sistem</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. SOUND HITUNG MUNDUR (COUNTDOWN 3, 2, 1) */}
                <div className={`p-4 rounded-xl bg-zinc-900/60 border flex flex-col justify-between space-y-4 transition-all ${
                  activePlayingKey === "countdown"
                    ? "border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)] bg-rose-950/10"
                    : "border-zinc-800 hover:border-yellow-500/40"
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {activePlayingKey === "countdown" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-400 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                            Memutar
                          </span>
                        )}
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          Fase 2
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Sound Hitung Mundur (3-2-1)</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Berbunyi 'pip-pip-pip' di 3 detik terakhir waktu persiapan sebelum mulai.
                      </p>
                    </div>

                    <div className="pt-1">
                      {soundCountdownUrl ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 max-w-full truncate">
                          <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
                          <span className="truncate">{soundCountdownName || "Audio Kustom Aktif"}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-[11px] font-mono text-zinc-400">
                          <Sparkles className="w-3 h-3 text-yellow-400" />
                          <span>Preset: 880Hz Metronome</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-zinc-800/60">
                    {/* Toggle Loop / Putar Ulang Otomatis */}
                    <label className="flex items-center justify-between text-[11px] text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
                      <span className="flex items-center gap-1.5">
                        <Repeat className={`w-3.5 h-3.5 ${soundCountdownLoop ? "text-yellow-400" : "text-zinc-500"}`} />
                        <span>Putar Ulang Otomatis (Loop)</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={soundCountdownLoop}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setSoundCountdownLoop(next);
                          saveSettings({ sound_countdown_loop: String(next) });
                        }}
                        className="accent-yellow-500 w-3.5 h-3.5 cursor-pointer rounded"
                      />
                    </label>

                    <input
                      type="file"
                      ref={countdownFileInputRef}
                      accept="audio/*"
                      onChange={(e) => handleUploadSound("countdown", e)}
                      className="hidden"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {activePlayingKey === "countdown" ? (
                        <button
                          type="button"
                          onClick={handleStopAll}
                          className="py-2 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-600/30 animate-pulse"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Suara</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePlayTest("countdown")}
                          className="py-2 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Putar / Tes</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isUploadingSound}
                        onClick={() => countdownFileInputRef.current?.click()}
                        className="py-2 px-2.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah File</span>
                      </button>
                    </div>

                    {soundCountdownUrl && (
                      <button
                        type="button"
                        onClick={() => handleResetSound("countdown")}
                        className="w-full py-1.5 px-2 text-[11px] text-zinc-500 hover:text-rose-400 flex items-center justify-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Kembalikan ke Preset Sistem</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. SOUND PERTANDINGAN MULAI (MATCH START) */}
                <div className={`p-4 rounded-xl bg-zinc-900/60 border flex flex-col justify-between space-y-4 transition-all ${
                  activePlayingKey === "start"
                    ? "border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)] bg-rose-950/10"
                    : "border-zinc-800 hover:border-cyan-500/40"
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {activePlayingKey === "start" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-400 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                            Memutar
                          </span>
                        )}
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          Fase 3
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Sound Pertandingan Mulai</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Berbunyi keras saat persiapan selesai (00:00) atau tombol Mulai ditekan.
                      </p>
                    </div>

                    <div className="pt-1">
                      {soundStartUrl ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 max-w-full truncate">
                          <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
                          <span className="truncate">{soundStartName || "Audio Kustom Aktif"}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-[11px] font-mono text-zinc-400">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>Preset: Ascending Horn</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-zinc-800/60">
                    {/* Toggle Loop / Putar Ulang Otomatis */}
                    <label className="flex items-center justify-between text-[11px] text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
                      <span className="flex items-center gap-1.5">
                        <Repeat className={`w-3.5 h-3.5 ${soundStartLoop ? "text-cyan-400" : "text-zinc-500"}`} />
                        <span>Putar Ulang Otomatis (Loop)</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={soundStartLoop}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setSoundStartLoop(next);
                          saveSettings({ sound_start_loop: String(next) });
                        }}
                        className="accent-cyan-500 w-3.5 h-3.5 cursor-pointer rounded"
                      />
                    </label>

                    <input
                      type="file"
                      ref={startFileInputRef}
                      accept="audio/*"
                      onChange={(e) => handleUploadSound("start", e)}
                      className="hidden"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {activePlayingKey === "start" ? (
                        <button
                          type="button"
                          onClick={handleStopAll}
                          className="py-2 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-600/30 animate-pulse"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Suara</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePlayTest("start")}
                          className="py-2 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Putar / Tes</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isUploadingSound}
                        onClick={() => startFileInputRef.current?.click()}
                        className="py-2 px-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah File</span>
                      </button>
                    </div>

                    {soundStartUrl && (
                      <button
                        type="button"
                        onClick={() => handleResetSound("start")}
                        className="w-full py-1.5 px-2 text-[11px] text-zinc-500 hover:text-rose-400 flex items-center justify-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Kembalikan ke Preset Sistem</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. SOUND FINISH / WAKTU HABIS / SELESAI */}
                <div className={`p-4 rounded-xl bg-zinc-900/60 border flex flex-col justify-between space-y-4 transition-all ${
                  activePlayingKey === "finish"
                    ? "border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)] bg-rose-950/10"
                    : "border-zinc-800 hover:border-rose-500/40"
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                        <StopCircle className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {activePlayingKey === "finish" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-400 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                            Memutar
                          </span>
                        )}
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          Fase 4
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Sound Selesai / Habis</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Berbunyi sirene stadion saat limit waktu tercapai atau tombol Selesai ditekan.
                      </p>
                    </div>

                    <div className="pt-1">
                      {soundFinishUrl ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 max-w-full truncate">
                          <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
                          <span className="truncate">{soundFinishName || "Audio Kustom Aktif"}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-[11px] font-mono text-zinc-400">
                          <Sparkles className="w-3 h-3 text-rose-400" />
                          <span>Preset: Stadium Siren</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-zinc-800/60">
                    {/* Toggle Loop / Putar Ulang Otomatis */}
                    <label className="flex items-center justify-between text-[11px] text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
                      <span className="flex items-center gap-1.5">
                        <Repeat className={`w-3.5 h-3.5 ${soundFinishLoop ? "text-rose-400" : "text-zinc-500"}`} />
                        <span>Putar Ulang Otomatis (Loop)</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={soundFinishLoop}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setSoundFinishLoop(next);
                          saveSettings({ sound_finish_loop: String(next) });
                        }}
                        className="accent-rose-500 w-3.5 h-3.5 cursor-pointer rounded"
                      />
                    </label>

                    <input
                      type="file"
                      ref={finishFileInputRef}
                      accept="audio/*"
                      onChange={(e) => handleUploadSound("finish", e)}
                      className="hidden"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {activePlayingKey === "finish" ? (
                        <button
                          type="button"
                          onClick={handleStopAll}
                          className="py-2 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-600/30 animate-pulse"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Suara</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePlayTest("finish")}
                          className="py-2 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 text-rose-400" />
                          <span>Putar / Tes</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isUploadingSound}
                        onClick={() => finishFileInputRef.current?.click()}
                        className="py-2 px-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah File</span>
                      </button>
                    </div>

                    {soundFinishUrl && (
                      <button
                        type="button"
                        onClick={() => handleResetSound("finish")}
                        className="w-full py-1.5 px-2 text-[11px] text-zinc-500 hover:text-rose-400 flex items-center justify-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Kembalikan ke Preset Sistem</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Catatan / Keterangan Format Audio */}
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3 text-xs text-zinc-400">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-zinc-200">Tips Audio Arena:</strong> Format audio yang didukung meliputi <span className="font-mono text-cyan-400">.mp3</span>, <span className="font-mono text-cyan-400">.wav</span>, <span className="font-mono text-cyan-400">.ogg</span>, dan <span className="font-mono text-cyan-400">.m4a</span>. Berkas audio disimpan di server lokal dan langsung disinkronkan ke seluruh layar arena. Jika berkas kustom tidak diunggah, sistem otomatis menggunakan generator audio studio Web Audio API bawaan secara instan tanpa jeda koneksi.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SETTING POINT & PENILAIAN (MENU POINT KUSTOM BISA TAMBAH SENDIRI) */}
        {activeTab === "point" && (
          <div className="space-y-6 w-full">
            {/* Bagian 1: Header Aturan Poin Kustom & Tombol Tambah */}
            <div className="bg-[#0a172c]/90 border border-cyan-900/40 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="border-b border-zinc-800/80 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                      KUSTOMISASI MENU POIN ARENA
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold">
                      Custom Rules
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                    Menu Aturan Poin & Tombol Cepat
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
                    Buat aturan poin sendiri, tambah tombol aksi bonus atau penalti baru, serta atur bobot penilaian juri sesuai regulasi kompetisi Anda.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsResetRulesConfirmOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset ke Preset</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddPointRule}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:brightness-110 text-white text-xs sm:text-sm font-black flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/25"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Tambah Aturan Poin Baru</span>
                  </button>
                </div>
              </div>

              {/* KPI Mini Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <span className="text-[11px] text-zinc-400 font-medium block">Total Aturan Poin</span>
                  <span className="font-mono text-2xl font-black text-white mt-0.5 block">
                    {customPointRules.length}
                  </span>
                  <span className="text-[10px] text-zinc-500">Tersimpan di sistem</span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <span className="text-[11px] text-emerald-400 font-medium block">Tombol Bonus (Positif)</span>
                  <span className="font-mono text-2xl font-black text-emerald-400 mt-0.5 block">
                    {customPointRules.filter((r) => r.points > 0).length}
                  </span>
                  <span className="text-[10px] text-zinc-500">Menambah poin tim</span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <span className="text-[11px] text-rose-400 font-medium block">Tombol Penalti (Negatif)</span>
                  <span className="font-mono text-2xl font-black text-rose-400 mt-0.5 block">
                    {customPointRules.filter((r) => r.points < 0).length}
                  </span>
                  <span className="text-[10px] text-zinc-500">Mengurangi poin tim</span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <span className="text-[11px] text-amber-400 font-medium block">Tombol Aktif di Monitor</span>
                  <span className="font-mono text-2xl font-black text-amber-400 mt-0.5 block">
                    {customPointRules.filter((r) => r.enabled).length}
                  </span>
                  <span className="text-[10px] text-zinc-500">Siap diklik juri/wasit</span>
                </div>
              </div>

              {/* Grid Daftar Kartu Aturan Poin Kustom */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Daftar Tombol & Aturan Poin ({customPointRules.length})</span>
                  </h4>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Klik Edit untuk ubah nilai/warna • Klik toggle untuk sembunyikan/tampilkan
                  </span>
                </div>

                {customPointRules.length === 0 ? (
                  <div className="p-12 rounded-xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-3">
                    <Sliders className="w-10 h-10 text-zinc-600 mx-auto" />
                    <p className="text-sm font-semibold text-zinc-300">Belum ada aturan poin kustom.</p>
                    <p className="text-xs text-zinc-500">
                      Klik tombol "Tambah Aturan Poin Baru" di atas untuk membuat tombol poin pertama Anda.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAddPointRule}
                      className="px-4 py-2 rounded-lg bg-cyan-500 text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Buat Aturan Poin</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {customPointRules.map((rule) => {
                      const colorStyle = POINT_COLOR_MAP[rule.color] || POINT_COLOR_MAP.emerald;
                      const isPositive = rule.points >= 0;

                      return (
                        <div
                          key={rule.id}
                          className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all relative overflow-hidden ${
                            rule.enabled
                              ? `${colorStyle.bg} ${colorStyle.border} ${colorStyle.glow}`
                              : "bg-zinc-900/40 border-zinc-800 opacity-60"
                          }`}
                        >
                          {/* Top Row: Type Pill & Toggle Switch */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                                  colorStyle.badgeBg
                                }`}
                              >
                                {rule.type === "bonus"
                                  ? "Bonus"
                                  : rule.type === "penalty"
                                  ? "Penalti"
                                  : rule.type === "objective"
                                  ? "Objektif"
                                  : "Khusus"}
                              </span>
                              <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                                <span className={`w-2 h-2 rounded-full ${colorStyle.dotBg}`} />
                                <span className="capitalize">{rule.color}</span>
                              </span>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <span className="text-[10px] font-mono text-zinc-400">
                                {rule.enabled ? "Aktif" : "Nonaktif"}
                              </span>
                              <input
                                type="checkbox"
                                checked={rule.enabled}
                                onChange={() => handleToggleRuleStatus(rule.id)}
                                className="accent-cyan-500 w-4 h-4 cursor-pointer rounded"
                              />
                            </label>
                          </div>

                          {/* Center: Big Points Display & Label */}
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                              <span
                                className={`font-mono text-3xl sm:text-4xl font-black tracking-tight ${colorStyle.text}`}
                              >
                                {isPositive ? `+${rule.points}` : rule.points}
                              </span>
                              <span className="font-mono text-xs font-bold text-zinc-400">PTS</span>
                            </div>
                            <h4 className="font-bold text-white text-base truncate">{rule.label}</h4>
                            <p className="text-xs text-zinc-400 line-clamp-2 min-h-[32px]">
                              {rule.description || "Tanpa deskripsi tambahan."}
                            </p>
                          </div>

                          {/* Preview Pill on Monitor */}
                          <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-zinc-500 font-mono">Preview Tombol:</span>
                            <div
                              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition-transform ${
                                colorStyle.pillBg
                              }`}
                            >
                              {isPositive ? `+${rule.points}` : rule.points} {rule.label}
                            </div>
                          </div>

                          {/* Hotkey Keyboard Info */}
                          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-rose-400 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Merah:
                              </span>
                              <kbd className="px-2 py-0.5 rounded bg-zinc-900 border border-rose-500/40 text-rose-300 font-mono font-black text-xs shadow-sm">
                                {rule.hotkeyRed || "-"}
                              </kbd>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-blue-400 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Biru:
                              </span>
                              <kbd className="px-2 py-0.5 rounded bg-zinc-900 border border-blue-500/40 text-blue-300 font-mono font-black text-xs shadow-sm">
                                {rule.hotkeyBlue || "-"}
                              </kbd>
                            </div>
                          </div>

                          {/* Footer Action Buttons */}
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                            <button
                              type="button"
                              onClick={() => {
                                playSound("start", "", 0.3, false);
                                showNotification(
                                  `Tes Berhasil: [${rule.label}] ${isPositive ? "+" : ""}${rule.points} PTS`
                                );
                              }}
                              className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
                              title="Tes suara & aksi poin ini"
                            >
                              <Play className="w-3 h-3 text-cyan-400" />
                              <span>Tes Tombol</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditPointRule(rule)}
                                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setRuleToDelete(rule)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                                title="Hapus Aturan Poin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TICKER & KATEGORI LOMBA */}
        {activeTab === "ticker_kategori" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Setting Announcement Ticker */}
            <div className="bg-[#0a172c]/90 border border-cyan-900/40 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                  TICKER MONITOR ARENA
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Teks Pengumuman Berjalan (Ticker)</h3>
                <p className="text-xs text-zinc-400">Teks ini tampil di baris teratas layar monitor pertandingan.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Isi Pesan Pengumuman</label>
                <textarea
                  rows={3}
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="Ketik pengumuman live untuk monitor..."
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="button"
                onClick={() => saveSettings()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Ticker</span>
              </button>
            </div>

            {/* Manajemen Kategori Lomba */}
            <div className="bg-[#0a172c]/90 border border-cyan-900/40 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                  CABANG KOMPETISI
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Kelola Kategori / Cabang Lomba</h3>
                <p className="text-xs text-zinc-400">Tambah atau hapus cabang kompetisi perlombaan.</p>
              </div>

              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nama kategori lomba baru..."
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white text-xs font-bold shrink-0"
                >
                  + Tambah
                </button>
              </form>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {categories.map((c) => {
                  const count = participants.filter((p) => p.category === c).length;
                  return (
                    <div
                      key={c}
                      className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{c}</p>
                        <p className="text-[10px] text-zinc-400">{count} tim terdaftar</p>
                      </div>
                      {categories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: IMPORT / EXPORT & DATABASE */}
        {activeTab === "backup" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Export & Import CSV */}
            <div className="bg-[#0a172c]/90 border border-cyan-900/40 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                  REKAPITULASI SPREADSHEET
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Export & Import Data CSV</h3>
                <p className="text-xs text-zinc-400">Cadangkan atau masukkan daftar peserta secara massal.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                <span className="text-xs font-semibold text-white block">Download File CSV</span>
                <p className="text-[11px] text-zinc-400">Unduh seluruh klasemen, nilai per babak, dan profil tim.</p>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download File CSV Klasemen</span>
                </button>
              </div>

              <form onSubmit={handleImportCSV} className="space-y-3">
                <span className="text-xs font-semibold text-white block">Import Massal Format CSV</span>
                <p className="text-[11px] text-zinc-400">
                  Format: <code className="text-cyan-300">Nama Tim, Instansi, Kota, Kategori, Babak1, Babak2, Babak3</code>
                </p>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`Garuda Muda, Universitas Diponegoro, Semarang, Cyber Security & CTF, 850, 870, 820\nBorneo AI, Universitas Tanjungpura, Pontianak, AI & Smart System, 810, 830, 790`}
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white text-xs font-bold"
                >
                  Proses Import Data
                </button>
              </form>
            </div>

            {/* Database Info & Reset */}
            <div className="bg-[#0a172c]/90 border border-cyan-900/40 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                  STATUS DATABASE & SISTEM
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Penyimpanan Terpadu</h3>
                <p className="text-xs text-zinc-400">Penyimpanan lokal aman dan cepat di sistem operasi.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 text-xs font-mono">
                <p className="text-zinc-400">
                  Path File: <span className="text-cyan-300">/data/next_arena.db</span>
                </p>
                <p className="text-zinc-400">
                  Total Record Peserta: <span className="text-white font-bold">{participants.length} tim</span>
                </p>
                <p className="text-zinc-400">
                  Total Cabang Lomba: <span className="text-white font-bold">{categories.length} kategori</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                <h4 className="text-xs font-bold text-rose-300 uppercase">Reset Data Perlombaan</h4>
                <p className="text-xs text-zinc-400">
                  Kembalikan seluruh data kompetisi ke pengaturan awal kompetisi NEXT Arena.
                </p>
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Data Awal Kompetisi</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL KONFIRMASI HAPUS PESERTA */}
        <ConfirmModal
          isOpen={!!deleteConfirmTarget}
          onClose={() => setDeleteConfirmTarget(null)}
          onConfirm={handleConfirmDeleteParticipant}
          title="Hapus Peserta"
          message={`Apakah Anda yakin ingin menghapus peserta "${deleteConfirmTarget?.name}"?`}
          subMessage="Data tim, skor per babak, dan rincian anggota akan dihapus secara permanen dari sistem."
          confirmText="Ya, Hapus Tim"
          cancelText="Batal"
          variant="danger"
        />

        {/* MODAL KONFIRMASI KOSONGKAN DATA PESERTA */}
        <ConfirmModal
          isOpen={isResetConfirmOpen}
          onClose={() => setIsResetConfirmOpen(false)}
          onConfirm={handleConfirmResetDB}
          title="Kosongkan Semua Peserta"
          message="Apakah Anda yakin ingin mengosongkan seluruh peserta?"
          subMessage="Seluruh daftar peserta, riwayat poin babak, dan jadwal pertandingan akan dihapus bersih sehingga sistem siap digunakan dari awal."
          confirmText="Ya, Kosongkan Semua"
          cancelText="Batal"
          variant="danger"
        />

        {/* MODAL TAMBAH / EDIT ATURAN POIN KUSTOM (PAS LAYAR & SELALU BISA DISIMPAN) */}
        {isPointRuleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
            {/* Backdrop with Blur */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsPointRuleModalOpen(false)}
            />

            {/* Modal Dialog Box (Paskan Layar & Responsive) */}
            <div className="relative z-10 w-full max-w-lg bg-[#141419] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
              {/* Header (Fixed) */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-950/60 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      {editingRuleId ? "Edit Aturan Poin" : "Tambah Aturan Poin Baru"}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Tentukan nama, nilai poin, warna tombol, dan kategorinya.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPointRuleModalOpen(false)}
                  className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors text-sm"
                  title="Tutup Modal"
                >
                  ✕
                </button>
              </div>

              {/* Form & Scrollable Body */}
              <form onSubmit={handleSavePointRule} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-xs">
                  {/* Grid 2 Kolom: Nama Poin & Nilai Poin */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Nama / Label Poin */}
                    <div className="sm:col-span-7 space-y-1">
                      <label className="block text-xs font-semibold text-zinc-300">
                        Nama / Label Poin <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Bonus Lap Cepat, Sentuh Garis"
                        value={ruleForm.label}
                        onChange={(e) => setRuleForm({ ...ruleForm, label: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-cyan-500 placeholder:text-zinc-600 font-medium"
                      />
                    </div>

                    {/* Nilai Poin */}
                    <div className="sm:col-span-5 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-zinc-300">
                          Nilai Poin <span className="text-cyan-400">*</span>
                        </label>
                        <span className="text-[10px] font-mono text-zinc-500">(- Penalti)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          required
                          value={ruleForm.points}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setRuleForm({
                              ...ruleForm,
                              points: val,
                              type: val < 0 ? "penalty" : ruleForm.type === "penalty" ? "bonus" : ruleForm.type,
                              color: val < 0 && ruleForm.color === "emerald" ? "rose" : ruleForm.color,
                            });
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-white text-sm font-bold focus:outline-none focus:border-cyan-500"
                        />
                        <span className="text-[11px] font-mono font-bold text-zinc-400 shrink-0">PTS</span>
                      </div>
                    </div>
                  </div>

                  {/* Preset Nilai Cepat */}
                  <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-1.5">
                    <span className="text-[10px] text-zinc-400 font-mono block">Preset Cepat:</span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: "+10", val: 10, type: "bonus", color: "emerald" },
                        { label: "+20", val: 20, type: "bonus", color: "blue" },
                        { label: "+25", val: 25, type: "bonus", color: "emerald" },
                        { label: "+50", val: 50, type: "bonus", color: "emerald" },
                        { label: "+100", val: 100, type: "objective", color: "amber" },
                        { label: "-5", val: -5, type: "penalty", color: "rose" },
                        { label: "-10", val: -10, type: "penalty", color: "rose" },
                        { label: "-25", val: -25, type: "penalty", color: "rose" },
                        { label: "-50", val: -50, type: "penalty", color: "rose" },
                      ].map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() =>
                            setRuleForm({
                              ...ruleForm,
                              points: chip.val,
                              type: chip.type as CustomPointType,
                              color: chip.color as CustomPointColor,
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                            ruleForm.points === chip.val
                              ? "bg-cyan-500 text-zinc-950 font-black shadow-sm"
                              : chip.val > 0
                              ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30"
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tipe Aturan Poin */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300">Tipe Poin</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: "bonus", label: "Bonus", desc: "Tambah" },
                        { id: "penalty", label: "Penalti", desc: "Kurang" },
                        { id: "objective", label: "Objektif", desc: "Misi" },
                        { id: "custom", label: "Khusus", desc: "Spesial" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setRuleForm({
                              ...ruleForm,
                              type: t.id as CustomPointType,
                              color:
                                t.id === "penalty"
                                  ? "rose"
                                  : t.id === "objective"
                                  ? "amber"
                                  : t.id === "bonus"
                                  ? "emerald"
                                  : "cyan",
                            })
                          }
                          className={`p-2 rounded-xl border text-center transition-all ${
                            ruleForm.type === t.id
                              ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold"
                              : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                          }`}
                        >
                          <span className="block text-xs font-bold leading-tight">{t.label}</span>
                          <span className="block text-[10px] text-zinc-500 mt-0.5">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pilihan Warna Tombol */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Warna Tombol di Monitor
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(POINT_COLOR_MAP) as CustomPointColor[]).map((cKey) => {
                        const c = POINT_COLOR_MAP[cKey];
                        const isSelected = ruleForm.color === cKey;
                        return (
                          <button
                            key={cKey}
                            type="button"
                            onClick={() => setRuleForm({ ...ruleForm, color: cKey })}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                              isSelected
                                ? `${c.pillBg} border-white ring-1 ring-white/50 font-bold`
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${c.dotBg}`} />
                            <span className="capitalize">{cKey}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Deskripsi Singkat */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Deskripsi Singkat (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Diberikan saat menyelesaikan putaran rintangan..."
                      value={ruleForm.description}
                      onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-cyan-500 placeholder:text-zinc-600"
                    />
                  </div>

                  {/* Pengaturan Hotkey Keyboard Tim Merah & Tim Biru */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Hotkey Tombol Keyboard (Pertandingan Langsung)</span>
                      </label>
                      <span className="text-[10px] text-zinc-400 font-mono">1 Karakter Keyboard</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Tekan tombol ini pada keyboard saat pertandingan live berlangsung untuk menambah/mengurangi poin tim yang sedang bertanding di arena.
                    </p>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {/* Hotkey Merah */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="text-[11px] font-bold text-rose-300">Hotkey Sudut Merah</span>
                        </div>
                        <input
                          type="text"
                          maxLength={3}
                          placeholder="Misal: Q"
                          value={ruleForm.hotkeyRed || ""}
                          onChange={(e) => setRuleForm({ ...ruleForm, hotkeyRed: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-rose-500/40 text-center font-mono text-sm font-black text-rose-300 focus:outline-none focus:border-rose-400 uppercase"
                        />
                      </div>

                      {/* Hotkey Biru */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-[11px] font-bold text-blue-300">Hotkey Sudut Biru</span>
                        </div>
                        <input
                          type="text"
                          maxLength={3}
                          placeholder="Misal: U"
                          value={ruleForm.hotkeyBlue || ""}
                          onChange={(e) => setRuleForm({ ...ruleForm, hotkeyBlue: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-blue-500/40 text-center font-mono text-sm font-black text-blue-300 focus:outline-none focus:border-blue-400 uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Preview Kotak */}
                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-zinc-500 font-mono">Preview Tombol:</span>
                    <div
                      className={`px-3 py-1 rounded-lg font-mono text-xs font-bold border shadow-sm ${
                        POINT_COLOR_MAP[ruleForm.color]?.pillBg || ""
                      }`}
                    >
                      {ruleForm.points >= 0 ? `+${ruleForm.points}` : ruleForm.points}{" "}
                      {ruleForm.label || "Nama Poin"}
                    </div>
                  </div>
                </div>

                {/* Footer Modal Actions (Sticky / Always Visible!) */}
                <div className="px-5 py-3 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsPointRuleModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-semibold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    {editingRuleId ? "Simpan Perubahan" : "Simpan Aturan Poin"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL KONFIRMASI HAPUS ATURAN POIN */}
        <ConfirmModal
          isOpen={!!ruleToDelete}
          onClose={() => setRuleToDelete(null)}
          onConfirm={handleConfirmDeleteRule}
          title="Hapus Aturan Poin"
          message={`Apakah Anda yakin ingin menghapus aturan poin "${ruleToDelete?.label}"?`}
          subMessage="Tombol aksi ini tidak akan muncul lagi di layar monitor dan kontrol arena."
          confirmText="Ya, Hapus Aturan"
          cancelText="Batal"
          variant="danger"
        />

        {/* MODAL KONFIRMASI RESET PRESET POIN */}
        <ConfirmModal
          isOpen={isResetRulesConfirmOpen}
          onClose={() => setIsResetRulesConfirmOpen(false)}
          onConfirm={handleResetPointRules}
          title="Kembalikan Preset Poin Bawaan"
          message="Kembalikan daftar aturan poin ke preset bawaan sistem?"
          subMessage="Semua tombol kustom akan diganti dengan preset default (+50 Bonus Cepat, -25 Penalti Koreksi, +100 Bonus Objektif, +20 Lap Sempurna)."
          confirmText="Ya, Kembalikan Preset"
          cancelText="Batal"
          variant="danger"
        />

        {/* MODAL KONFIRMASI RESET POIN TURNAMEN */}
        <ConfirmModal
          isOpen={showResetBracketModal}
          onClose={() => setShowResetBracketModal(false)}
          onConfirm={handleResetPoints}
          title="Reset Seluruh Poin Pertandingan?"
          message="Semua perolehan skor laga dan poin peserta di seluruh babak akan dikembalikan ke 0 PTS."
          subMessage="Log riwayat poin akan dibersihkan. Laga tanding tetap tersimpan dan siap dimulai ulang dari awal."
          confirmText="Ya, Reset Poin ke 0"
          cancelText="Batal"
          variant="danger"
        />

        {/* MODAL KONFIRMASI RESET BABAK TURNAMEN */}
        <ConfirmModal
          isOpen={showResetRoundModal}
          onClose={() => setShowResetRoundModal(false)}
          onConfirm={handleResetRound}
          title="Reset Babak ke Babak Pertama?"
          message="Seluruh peserta akan dikembalikan ke babak pertama (Babak 1), dan jadwal laga di Babak 2 serta seterusnya akan dikosongkan."
          subMessage="Peserta yang sebelumnya gugur akan diaktifkan kembali di Babak 1. Jadwal tanding Babak 1 tetap tersimpan."
          confirmText="Ya, Reset ke Babak 1"
          cancelText="Batal"
          variant="warning"
        />

        {/* MODAL TAMBAH / EDIT BABAK */}
        {isAddStageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0a172c] border border-cyan-900/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                    MANAJEMEN TURNAMEN
                  </span>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {editingStage ? "Edit Pengaturan Babak" : "Tambah Babak Baru"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddStageModalOpen(false);
                    setEditingStage(null);
                  }}
                  className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Input Nama Babak */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Nama Babak:
                  </label>
                  <input
                    type="text"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="Contoh: Babak 16 Besar / Babak Playoff"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-bold text-sm focus:outline-none focus:border-cyan-500"
                    autoFocus
                  />
                </div>

                {/* Pilihan Model: Ranking vs Gugur */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Model Babak (Hanya 2 Model):
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewStageModel("ranking")}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        newStageModel === "ranking"
                          ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm ring-1 ring-amber-500/50"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ranking</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 block">Klasemen Poin</span>
                      </div>
                      {newStageModel === "ranking" && <Check className="w-4 h-4 text-amber-400 stroke-[3]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewStageModel("gugur")}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        newStageModel === "gugur"
                          ? "bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm ring-1 ring-rose-500/50"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                          <Swords className="w-3.5 h-3.5 text-rose-400" />
                          <span>Gugur</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 block">Knockout Duel</span>
                      </div>
                      {newStageModel === "gugur" && <Check className="w-4 h-4 text-rose-400 stroke-[3]" />}
                    </button>
                  </div>
                </div>

                {/* Pilihan Format Main: 1x vs 2x Main */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Format Putaran Pertandingan:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewStageTurns("1x")}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        newStageTurns === "1x"
                          ? "bg-yellow-500/20 border-yellow-500 text-yellow-300 shadow-sm ring-1 ring-yellow-500/50"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                          <Zap className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                          <span>1x Main</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 block">Langsung rekap</span>
                      </div>
                      {newStageTurns === "1x" && <Check className="w-4 h-4 text-yellow-400 stroke-[3]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewStageTurns("2x")}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        newStageTurns === "2x"
                          ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm ring-1 ring-cyan-500/50"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                          <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
                          <span>2x Main</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 block">Tukar Sisi Arena</span>
                      </div>
                      {newStageTurns === "2x" && <Check className="w-4 h-4 text-cyan-400 stroke-[3]" />}
                    </button>
                  </div>
                </div>

                {/* Pilihan Hitungan Poin: Reset Skor ke 0 vs Bawa Poin (Carry Over) */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Hitungan Poin: Reset Skor ke 0 vs Bawa Poin (Carry Over):
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewStageResetPoints(true)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        newStageResetPoints
                          ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm ring-1 ring-amber-500/50"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reset ke 0</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 block">Skor babak mulai dari 0 (Default)</span>
                      </div>
                      {newStageResetPoints && <Check className="w-4 h-4 text-amber-400 stroke-[3]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewStageResetPoints(false)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        !newStageResetPoints
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm ring-1 ring-emerald-500/50"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                          <Layers className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Bawa Poin</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 block">Akumulasi carry over</span>
                      </div>
                      {!newStageResetPoints && <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddStageModalOpen(false);
                    setEditingStage(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (editingStage) {
                      handleUpdateStage(editingStage.id, {
                        name: newStageName,
                        model: newStageModel,
                        turns: newStageTurns,
                        resetPoints: newStageResetPoints,
                      });
                      setIsAddStageModalOpen(false);
                      setEditingStage(null);
                      showNotification(`Perubahan babak "${newStageName}" berhasil disimpan!`);
                    } else {
                      handleAddStage(newStageName, newStageModel, newStageTurns, newStageResetPoints);
                    }
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-amber-400 text-zinc-950 text-xs font-bold hover:brightness-110 shadow-md transition-all cursor-pointer"
                >
                  {editingStage ? "Simpan Perubahan Babak" : "Simpan & Tambahkan Babak"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL KONFIRMASI HAPUS BABAK */}
        {stageDeleteTarget && (
          <ConfirmModal
            isOpen={Boolean(stageDeleteTarget)}
            onClose={() => setStageDeleteTarget(null)}
            onConfirm={() => handleDeleteStage(stageDeleteTarget.id)}
            title="Hapus Babak Perlombaan"
            message={`Apakah Anda yakin ingin menghapus "${stageDeleteTarget.name}"?`}
            subMessage="Format pertandingan dan pengaturan babak ini akan dihapus dari sistem."
            confirmText="Ya, Hapus Babak"
            cancelText="Batal"
            variant="danger"
          />
        )}

        {/* MODAL SUSUN / INPUT JADWAL LAGA MANUAL */}
        {showManualBracketModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#0a172c] border border-cyan-900/50 rounded-3xl p-6 sm:p-8 max-w-4xl w-full space-y-6 shadow-2xl relative max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-zinc-800/80 pb-4 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold uppercase tracking-wider border border-cyan-500/30">
                      Input Manual Bagan
                    </span>
                    <span className="text-zinc-500 text-xs">•</span>
                    <span className="text-white text-xs font-bold">{selectedBracketRound}</span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1">
                    Susun Jadwal Laga Manual
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Tentukan sendiri pasangan tanding (Sudut Merah vs Sudut Biru) untuk {selectedBracketRound}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualBracketModal(false)}
                  className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Tim Berhak / Lolos */}
              <div className="shrink-0 p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span className="text-zinc-300 font-bold">
                      Daftar Tim Lolos ke {selectedBracketRound} ({qualifiedBracketParticipants.length} Tim):
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    {(() => {
                      const assignedNames = new Set(
                        manualMatchPairs
                          .flatMap((p) => [p.teamA, p.teamB])
                          .filter((n) => n && n !== "- (Tanding Tunggal)")
                      );
                      const assignedCount = qualifiedBracketParticipants.filter((p) => assignedNames.has(p.name)).length;
                      return (
                        <>
                          <span className="text-emerald-400 font-bold">
                            {assignedCount} Terpasang
                          </span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-amber-400 font-bold">
                            {qualifiedBracketParticipants.length - assignedCount} Belum Terpasang
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Chips tim */}
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {qualifiedBracketParticipants.map((p) => {
                    const isAssigned = manualMatchPairs.some(
                      (m) => m.teamA === p.name || m.teamB === p.name
                    );
                    return (
                      <span
                        key={p.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border transition-all ${
                          isAssigned
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : "bg-zinc-900 text-zinc-300 border-zinc-700/80"
                        }`}
                      >
                        {isAssigned ? (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        )}
                        <span className="truncate max-w-[140px] font-semibold">{p.name}</span>
                        {p.code && <span className="text-zinc-500 text-[10px]">[{p.code}]</span>}
                      </span>
                    );
                  })}
                  {qualifiedBracketParticipants.length === 0 && (
                    <span className="text-xs text-zinc-500 italic">
                      Belum ada tim yang lolos ke babak ini. Anda tetap dapat memasukkan jadwal jika diinginkan.
                    </span>
                  )}
                </div>
              </div>

              {/* List of Match Pairs */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-[200px]">
                {manualMatchPairs.map((pair, idx) => (
                  <div
                    key={pair.id || idx}
                    className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 hover:border-zinc-700/80 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-400 font-mono text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={pair.label || `Laga ${String(idx + 1).padStart(2, "0")}`}
                          onChange={(e) => handleUpdateManualPair(idx, "label", e.target.value)}
                          placeholder={`Laga ${String(idx + 1).padStart(2, "0")}`}
                          className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono text-xs font-bold w-28 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveManualPairRow(idx)}
                        disabled={manualMatchPairs.length <= 1}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-500/50 text-zinc-500 hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        title="Hapus baris laga ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-3">
                      {/* Sudut Merah (Team A) */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Sudut Merah
                        </label>
                        <select
                          value={pair.teamA}
                          onChange={(e) => handleUpdateManualPair(idx, "teamA", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-rose-500/30 text-white text-xs font-bold focus:border-rose-400 focus:outline-none"
                        >
                          <option value="">-- Pilih Tim Sudut Merah --</option>
                          {qualifiedBracketParticipants.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.code ? `[${p.code}] ` : ""}{p.name} {p.institution ? `(${p.institution})` : ""}
                            </option>
                          ))}
                          {pair.teamA && !qualifiedBracketParticipants.some((p) => p.name === pair.teamA) && (
                            <option value={pair.teamA}>{pair.teamA}</option>
                          )}
                        </select>
                      </div>

                      {/* VS Divider */}
                      <div className="text-center font-black text-xs font-mono text-zinc-500 pt-3 md:pt-4">
                        <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-cyan-400">
                          VS
                        </span>
                      </div>

                      {/* Sudut Biru (Team B) */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Sudut Biru
                        </label>
                        <select
                          value={pair.teamB}
                          onChange={(e) => handleUpdateManualPair(idx, "teamB", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-blue-500/30 text-white text-xs font-bold focus:border-blue-400 focus:outline-none"
                        >
                          <option value="">-- Pilih Tim Sudut Biru --</option>
                          <option value="- (Tanding Tunggal)">- (Tanding Tunggal / Bye) -</option>
                          {qualifiedBracketParticipants.map((p) => (
                            <option key={p.id} value={p.name} disabled={p.name === pair.teamA}>
                              {p.code ? `[${p.code}] ` : ""}{p.name} {p.institution ? `(${p.institution})` : ""}
                            </option>
                          ))}
                          {pair.teamB && pair.teamB !== "- (Tanding Tunggal)" && !qualifiedBracketParticipants.some((p) => p.name === pair.teamB) && (
                            <option value={pair.teamB}>{pair.teamB}</option>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Controls */}
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={handleAddManualPairRow}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <span>Tambah Baris Laga</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualBracketModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveManualBracket}
                    disabled={isSavingManualBracket}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-black hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingManualBracket ? "Menyimpan..." : "Simpan & Terapkan Jadwal"}</span>
                  </button>
                </div>
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

        {/* MODAL KONFIRMASI RESET LAGA */}
        {resetMatchTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reset Pertandingan Laga {resetMatchTarget.matchLabel}?</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {resetMatchTarget.teamA} vs {resetMatchTarget.teamB} ({resetMatchTarget.round})
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-xs text-zinc-300">
                <p>
                  Skor kedua tim (Putaran 1 & Putaran 2) akan dikembalikan ke <strong className="text-white">0</strong>, dan status laga kembali menjadi <strong className="text-emerald-400">"Siap Tanding"</strong>.
                </p>
                <label className="flex items-center gap-2.5 pt-2 border-t border-zinc-800/80 cursor-pointer text-zinc-300 hover:text-white select-none">
                  <input
                    type="checkbox"
                    checked={resetWithLogs}
                    onChange={(e) => setResetWithLogs(e.target.checked)}
                    className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                  />
                  <span>Hapus juga seluruh catatan log poin laga ini</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetMatchTarget(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleResetSingleMatch(resetMatchTarget.id, resetWithLogs)}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ya, Reset Laga</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-[#070709] py-4 px-6 text-center text-xs text-zinc-500 mt-auto">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 NEXT ARENA — NUSANTARA NEXT Competition Management System</span>
          <Link href="/" className="text-cyan-400 hover:text-cyan-300 font-semibold">
            Buka Tampilan Monitor Utama →
          </Link>
        </div>
      </footer>
    </div>
  );
}


"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Trophy,
  Zap,
  RotateCcw,
  Play,
  Pause,
  StopCircle,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Clock,
  ArrowLeftRight,
  CheckCircle2,
  Swords,
  Check,
  Building2,
  Flame,
  Award,
  FastForward,
  AlertTriangle,
  History,
  Trash2,
  ClipboardCheck,
  X,
  FileText,
  Flag,
} from "lucide-react";
import { ArenaLogo } from "@/components/ArenaLogo";
import { LiveTickerBar } from "@/components/LiveTickerBar";
import {
  BracketMatch,
  Participant,
  CustomPointRule,
  DEFAULT_POINT_RULES,
} from "@/data/mockCompetition";
import { playSound, stopAllSounds } from "@/lib/soundEffects";
import { resolveMatchWinner } from "@/lib/tieBreaker";
import {
  buildLeg1ResultTicker,
  buildMatchFinishedTicker,
  buildWelcomeMatchTicker,
  DEFAULT_TICKER_TEXT,
  formatTickerScoreSummary,
  type LiveTickerMode,
} from "@/lib/liveTicker";

export default function ArenaBattleMatchPage() {
  const params = useParams();
  const matchId = params?.id as string;

  // Data States
  const [match, setMatch] = useState<BracketMatch | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [customPointRules, setCustomPointRules] = useState<CustomPointRule[]>(
    DEFAULT_POINT_RULES
  );
  const [roundMatchTurns, setRoundMatchTurns] = useState<Record<string, "1x" | "2x">>({
    "Babak Penyisihan": "2x",
    "Babak 8 Besar": "1x",
    "Babak Semifinal": "1x",
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Timer & Audio States
  const [timerSeconds, setTimerSeconds] = useState<number>(10);
  const [matchElapsedMs, setMatchElapsedMs] = useState<number>(0);
  const matchStartTimeRef = useRef<number>(0);
  const matchElapsedBaseRef = useRef<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerPhase, setTimerPhase] = useState<"idle" | "preparation" | "prep_paused" | "prep_ended" | "countdown" | "match" | "match_paused" | "finished">("idle");
  const [prepDuration, setPrepDuration] = useState<number>(10);
  const [matchLimit, setMatchLimit] = useState<number>(300);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [soundVolume, setSoundVolume] = useState<number>(1);
  const [soundStartUrl, setSoundStartUrl] = useState<string>("");
  const [soundFinishUrl, setSoundFinishUrl] = useState<string>("");
  const [soundCountdownUrl, setSoundCountdownUrl] = useState<string>("");
  const [soundPrepUrl, setSoundPrepUrl] = useState<string>("");
  const [soundStartLoop, setSoundStartLoop] = useState<boolean>(false);
  const [soundFinishLoop, setSoundFinishLoop] = useState<boolean>(false);
  const [soundPrepLoop, setSoundPrepLoop] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Toast / Floating Arena Notification Payload
  interface ArenaToastPayload {
    key: number;
    kind: "point" | "switch_leg" | "reset_match" | "reset_timer" | "prep" | "info" | "default";
    title?: string;
    text: string;
    teamA?: string;
    teamB?: string;
    leg?: 1 | 2;
    isPositive?: boolean;
  }

  const [toastMsg, setToastMsg] = useState<ArenaToastPayload | null>(null);

  interface CornerActionNotif {
    key: number;
    label: string;
    isPositive: boolean;
    isFinish?: boolean;
  }

  // Notifikasi aksi skor (Point, Cekpoint, Retry, Finish) di tepi kiri/kanan dalam kotak timer
  const [cornerNotifs, setCornerNotifs] = useState<{
    red: CornerActionNotif | null;
    blue: CornerActionNotif | null;
  }>({
    red: null,
    blue: null,
  });
  const cornerNotifSeqRef = useRef<number>(0);

  // Finish Status & Auto-Stop States (Disimpan per Sesi/Putaran & per Sudut agar 1 sisi hanya bisa Finish 1x dan langsung terkunci)
  const [finishedCorners, setFinishedCorners] = useState<{
    p1Red: string;
    p1Blue: string;
    p2Red: string;
    p2Blue: string;
  }>({
    p1Red: "",
    p1Blue: "",
    p2Red: "",
    p2Blue: "",
  });

  const getCornerFinishTime = (leg: 1 | 2, corner: "red" | "blue") => {
    if (leg === 1) return corner === "red" ? finishedCorners.p1Red : finishedCorners.p1Blue;
    return corner === "red" ? finishedCorners.p2Red : finishedCorners.p2Blue;
  };

  const isCornerFinished = (leg: 1 | 2, corner: "red" | "blue") => {
    return Boolean(getCornerFinishTime(leg, corner));
  };

  // Live Match History Log (Waktu + Poin + Aksi)
  const [matchHistory, setMatchHistory] = useState<
    Array<{
      id: string;
      timestamp: string;      // Jam riil (17:05:12)
      timeFormatted: string;  // Waktu stopwatch (00:42)
      corner: "red" | "blue" | "system";
      teamName: string;
      actionLabel: string;
      delta: number;
      leg: number;
    }>
  >([]);

  // History View Mode & Filters (Dipisah per Putaran / Sudut)
  const [historyViewMode, setHistoryViewMode] = useState<"split" | "unified">("split");
  const [p1TeamFilter, setP1TeamFilter] = useState<"all" | "A" | "B">("all");
  const [p2TeamFilter, setP2TeamFilter] = useState<"all" | "A" | "B">("all");

  // Winner Celebration & Leg 1 Transition Modal
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [winnerBreakdownLeg, setWinnerBreakdownLeg] = useState<1 | 2 | "all">(2);
  const [showLeg1Modal, setShowLeg1Modal] = useState<boolean>(false);
  const [revisedLeg1ScoreA, setRevisedLeg1ScoreA] = useState<number>(0);
  const [revisedLeg1ScoreB, setRevisedLeg1ScoreB] = useState<number>(0);
  const [leg1LogFilter, setLeg1LogFilter] = useState<"all" | "A" | "B">("all");
  const [leg1RuleAdjustments, setLeg1RuleAdjustments] = useState<{
    A: Record<string, number>;
    B: Record<string, number>;
  }>({ A: {}, B: {} });
  const [showResetMatchModal, setShowResetMatchModal] = useState<boolean>(false);
  const [resetWithLogs, setResetWithLogs] = useState<boolean>(true);
  const [announcement, setAnnouncement] = useState<string>("");

  // Unique sender ID to avoid processing self-broadcasts
  const SENDER_ID = useMemo(() => Math.random().toString(36).substring(2, 9), []);
  const hasInitializedRef = useRef<boolean>(false);
  const hasTriggeredMatchStartRef = useRef<boolean>(false);
  const lastSyncedTickerRef = useRef<string>("");
  const hasSyncedLiveTickerRef = useRef<boolean>(false);

  // Helper broadcast (tags senderId so current arena tab ignores its own echo)
  const broadcastSync = (type: string, payload?: any) => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel("next_arena_sync");
      channel.postMessage({ type, payload, senderId: SENDER_ID });
      channel.close();
    }
  };

  const syncLiveTickerToArena = (
    liveTicker: string,
    liveTickerMatchId: string,
    liveTickerMode: LiveTickerMode,
    useKeepalive: boolean = false
  ) => {
    const payload = {
      live_ticker: liveTicker,
      live_ticker_match_id: liveTickerMatchId,
      live_ticker_mode: liveTickerMode,
    };
    if (liveTicker) {
      hasSyncedLiveTickerRef.current = true;
    } else {
      hasSyncedLiveTickerRef.current = false;
    }
    broadcastSync("SETTINGS_SYNC", payload);
    if (typeof fetch !== "undefined") {
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: useKeepalive,
      }).catch(() => {});
    }
  };

  const clearLiveTicker = (useKeepalive: boolean = false) => {
    const emptyPayload = JSON.stringify({ text: "", matchId: "", mode: "default" });
    lastSyncedTickerRef.current = emptyPayload;
    syncLiveTickerToArena("", "", "default", useKeepalive);
  };

  const showArenaToast = (
    payload: Omit<ArenaToastPayload, "key">,
    duration: number = 2800
  ) => {
    const key = Date.now();
    setToastMsg({ ...payload, key });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.key === key ? null : prev));
    }, duration);
  };

  const showPointToast = (text: string, isPositive: boolean = true) => {
    showArenaToast(
      {
        kind: "point",
        text,
        isPositive,
      },
      2000
    );
  };

  const formatScoringNotifLabel = (ruleLabel?: string) => {
    const raw = (ruleLabel || "").trim();
    const lower = raw.toLowerCase();
    if (lower.includes("finish")) return "Finish";
    if (lower.includes("cekpoint") || lower.includes("checkpoint")) return "Cekpoint";
    if (lower.includes("retry")) return "Retry";
    if (!raw || lower === "point" || lower === "poin" || lower.includes("manual")) {
      return "Point";
    }
    return raw;
  };

  const showTimerCornerNotif = (
    corner: "red" | "blue",
    label: string,
    isPositive: boolean = true,
    isFinish: boolean = false,
    duration: number = 1800
  ) => {
    cornerNotifSeqRef.current += 1;
    const key = cornerNotifSeqRef.current;
    setCornerNotifs((prev) => ({
      ...prev,
      [corner]: { key, label, isPositive, isFinish },
    }));
    setTimeout(() => {
      setCornerNotifs((prev) =>
        prev[corner]?.key === key ? { ...prev, [corner]: null } : prev
      );
    }, duration);
  };

  // Load arena data
  const loadData = async () => {
    try {
      const res = await fetch("/api/arena");
      if (res.ok) {
        const json = await res.json();
        if (json.bracketMatches) {
          const found = json.bracketMatches.find((m: BracketMatch) => m.id === matchId);
          if (found) {
            setMatch(found);
            // Hanya inisialisasi state timer saat pertama kali halaman dimuat
            // JANGAN pernah reset timer jika pertandingan atau countdown sedang berjalan!
            if (!hasInitializedRef.current) {
              hasInitializedRef.current = true;
              if (found.status === "Selesai") {
                setTimerPhase("finished");
                setIsTimerRunning(false);
              } else {
                setTimerPhase("idle");
                setIsTimerRunning(false);
              }
            }
          }
        }
        if (json.participants) setParticipants(json.participants);
        if (json.settings) {
          const s = json.settings;
          if (s.custom_point_rules) {
            try {
              const parsed = typeof s.custom_point_rules === "string" ? JSON.parse(s.custom_point_rules) : s.custom_point_rules;
              setCustomPointRules(parsed);
            } catch (e) {}
          }
          if (s.round_match_turns) {
            try {
              const parsed = typeof s.round_match_turns === "string" ? JSON.parse(s.round_match_turns) : s.round_match_turns;
              setRoundMatchTurns(parsed);
            } catch (e) {}
          }
          if (s.sound_volume !== undefined) setSoundVolume(Number(s.sound_volume) || 1);
          if (s.sound_enabled !== undefined) setSoundEnabled(s.sound_enabled === "true");
          if (s.sound_start_url !== undefined) setSoundStartUrl(s.sound_start_url);
          if (s.sound_finish_url !== undefined) setSoundFinishUrl(s.sound_finish_url);
          if (s.sound_countdown_url !== undefined) setSoundCountdownUrl(s.sound_countdown_url);
          if (s.sound_prep_url !== undefined) setSoundPrepUrl(s.sound_prep_url);
          if (s.sound_start_loop !== undefined) setSoundStartLoop(s.sound_start_loop === "true");
          if (s.sound_finish_loop !== undefined) setSoundFinishLoop(s.sound_finish_loop === "true");
          if (s.sound_prep_loop !== undefined) setSoundPrepLoop(s.sound_prep_loop === "true");
          if (s.prep_duration !== undefined) setPrepDuration(Number(s.prep_duration) || 10);
          if (s.match_limit !== undefined) setMatchLimit(Number(s.match_limit) || 300);
          if (s.announcement !== undefined) setAnnouncement(s.announcement);
        }

        // Muat log histori poin dari SQLite jika ada
        if (json.pointLogs && Array.isArray(json.pointLogs)) {
          const found = json.bracketMatches?.find((m: BracketMatch) => m.id === matchId);
          if (found) {
            const mLabel = (found.matchLabel || "").toLowerCase();
            const mId = (found.id || "").toLowerCase();
            const teamALow = (found.teamA || "").toLowerCase();
            const teamBLow = (found.teamB || "").toLowerCase();

            const relatedLogs = json.pointLogs.filter((l: any) => {
              const sl = (l.stageLabel || "").toLowerCase();
              const pn = (l.participantName || "").toLowerCase();
              const isMatchTeam = pn === teamALow || pn === teamBLow;
              if (isMatchTeam && (sl.includes(mLabel) || sl.includes(mId))) return true;
              if (isMatchTeam && sl.includes("laga") && !sl.match(/laga\s+\d+/) ) return true;
              return false;
            });

            const parsed = relatedLogs.map((l: any) => {
              const sl = l.stageLabel || "";
              const timeMatch = sl.match(/@(\d{2}:\d{2}(?:\.\d{1,2})?)/);
              const legMatch = sl.match(/\bP([12])\b/i) || sl.match(/Putaran\s*([12])/i) || sl.match(/Sesi\s*([12])/i);
              const leg: 1 | 2 = legMatch && legMatch[1] === "2" ? 2 : 1;
              const timeFormatted = timeMatch ? timeMatch[1] : "00:00.00";
              const actionLabel = sl.replace(/\s*\((?:Laga\s*)?.*?\)\s*$/i, "").trim() || "Poin";
              const isTeamA = (l.participantName || "").toLowerCase() === teamALow;
              const corner: "red" | "blue" =
                leg === 1
                  ? (isTeamA ? "red" : "blue")
                  : (isTeamA ? "blue" : "red");

              let clockTime = "-";
              if (l.timestamp && l.timestamp !== "Baru saja") {
                const parsedMs = Date.parse(l.timestamp);
                if (!isNaN(parsedMs)) {
                  clockTime = new Date(parsedMs)
                    .toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                    .replace(/\./g, ":");
                } else if (/^\d{2}[:.]\d{2}/.test(l.timestamp)) {
                  clockTime = l.timestamp.replace(/\./g, ":");
                }
              }
              if (clockTime === "-") {
                const idEpoch = String(l.id || "").match(/log-(\d{10,15})/);
                if (idEpoch) {
                  clockTime = new Date(Number(idEpoch[1]))
                    .toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                    .replace(/\./g, ":");
                } else {
                  clockTime = new Date()
                    .toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                    .replace(/\./g, ":");
                }
              }

              return {
                id: l.id,
                timestamp: clockTime,
                timeFormatted,
                corner,
                teamName: l.participantName || "Peserta",
                actionLabel,
                delta: l.delta || 0,
                leg,
              };
            });

            setMatchHistory((prev) => {
              if (prev.length === 0) return parsed;
              const nonSystemCount = prev.filter((item) => item.corner !== "system").length;
              if (nonSystemCount === 0 && parsed.length > 0) {
                return [...prev, ...parsed];
              }
              return prev;
            });

            // Pulihkan status Finish per sudut dari histori log jika ada
            const restoredFinishes = { p1Red: "", p1Blue: "", p2Red: "", p2Blue: "" };
            parsed.forEach((item: any) => {
              if (item.actionLabel && item.actionLabel.toUpperCase().includes("FINISH")) {
                if (item.leg === 1 && item.corner === "red" && !restoredFinishes.p1Red) {
                  restoredFinishes.p1Red = item.timeFormatted || "00:00.00";
                } else if (item.leg === 1 && item.corner === "blue" && !restoredFinishes.p1Blue) {
                  restoredFinishes.p1Blue = item.timeFormatted || "00:00.00";
                } else if (item.leg === 2 && item.corner === "red" && !restoredFinishes.p2Red) {
                  restoredFinishes.p2Red = item.timeFormatted || "00:00.00";
                } else if (item.leg === 2 && item.corner === "blue" && !restoredFinishes.p2Blue) {
                  restoredFinishes.p2Blue = item.timeFormatted || "00:00.00";
                }
              }
            });
            setFinishedCorners((prev) => ({
              p1Red: prev.p1Red || restoredFinishes.p1Red,
              p1Blue: prev.p1Blue || restoredFinishes.p1Blue,
              p2Red: prev.p2Red || restoredFinishes.p2Red,
              p2Blue: prev.p2Blue || restoredFinishes.p2Blue,
            }));

            const anyFinish = restoredFinishes.p2Red || restoredFinishes.p2Blue || restoredFinishes.p1Red || restoredFinishes.p1Blue;
            if (anyFinish) {
              const msMatch = anyFinish.match(/(\d{1,2}):(\d{2})(?:\.(\d{1,2}))?/);
              if (msMatch) {
                const m = parseInt(msMatch[1], 10) || 0;
                const s = parseInt(msMatch[2], 10) || 0;
                const cs = msMatch[3] ? parseInt(msMatch[3].padEnd(2, "0").slice(0, 2), 10) : 0;
                setMatchElapsedMs((m * 60 + s) * 1000 + cs * 10);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("Koneksi ke backend belum siap atau terputus:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    hasInitializedRef.current = false;
    loadData();
    // Real-time broadcast sync listener (ignore self-broadcasts)
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel("next_arena_sync");
      channel.onmessage = (event) => {
        if (event.data?.senderId === SENDER_ID) return;
        if (event.data?.type === "DATA_REFRESH") {
          loadData();
        } else if (
          event.data?.type === "SETTINGS_SYNC" &&
          event.data.payload?.announcement !== undefined
        ) {
          setAnnouncement(event.data.payload.announcement);
        }
      };
      return () => channel.close();
    }
  }, [matchId, SENDER_ID]);

  // Determine if this match runs in 2x Main (Tukar Sisi)
  const is2x = useMemo(() => {
    if (!match) return false;
    const rName = match.round;
    if (roundMatchTurns[rName]) return roundMatchTurns[rName] === "2x";
    if (rName.includes("Penyisihan") || rName.includes("16 Besar")) return (roundMatchTurns["Babak Penyisihan"] || "2x") === "2x";
    if (rName.includes("8 Besar")) return (roundMatchTurns["Babak 8 Besar"] || "1x") === "2x";
    if (rName.includes("Semifinal") || rName.includes("Final")) return (roundMatchTurns["Babak Semifinal"] || "1x") === "2x";
    return false;
  }, [match, roundMatchTurns]);

  const activeLeg = (match?.currentLeg || 1) as 1 | 2;
  const isSwapped = is2x && activeLeg === 2;

  // Corner assignments:
  // In 1x mode: Red = Team A, Blue = Team B
  // In 2x mode Leg 1: Red = Team A, Blue = Team B
  // In 2x mode Leg 2: Red = Team B, Blue = Team A (TUKAR SISI!)
  const redTeamKey: "A" | "B" = isSwapped ? "B" : "A";
  const blueTeamKey: "A" | "B" = isSwapped ? "A" : "B";

  const redTeamName = isSwapped ? match?.teamB : match?.teamA;
  const blueTeamName = isSwapped ? match?.teamA : match?.teamB;

  const instA = participants.find((p) => p.name === match?.teamA)?.institution;
  const instB = participants.find((p) => p.name === match?.teamB)?.institution;

  const redInst = isSwapped ? instB : instA;
  const blueInst = isSwapped ? instA : instB;

  const redScore = is2x
    ? (isSwapped ? match?.scoreBLeg2 ?? 0 : match?.scoreALeg1 ?? 0)
    : (match?.scoreA ?? 0);

  const blueScore = is2x
    ? (isSwapped ? match?.scoreALeg2 ?? 0 : match?.scoreBLeg1 ?? 0)
    : (match?.scoreB ?? 0);

  // Filter history per Putaran (Putaran 1 & Putaran 2)
  const p1History = useMemo(() => {
    return matchHistory.filter((item) => item.leg === 1);
  }, [matchHistory]);

  const p2History = useMemo(() => {
    return matchHistory.filter((item) => item.leg === 2);
  }, [matchHistory]);

  const p1Filtered = useMemo(() => {
    if (p1TeamFilter === "all" || !match) return p1History;
    const targetName = p1TeamFilter === "A" ? match.teamA : match.teamB;
    return p1History.filter((item) => item.teamName === targetName || item.corner === "system");
  }, [p1History, p1TeamFilter, match]);

  const p2Filtered = useMemo(() => {
    if (p2TeamFilter === "all" || !match) return p2History;
    const targetName = p2TeamFilter === "A" ? match.teamA : match.teamB;
    return p2History.filter((item) => item.teamName === targetName || item.corner === "system");
  }, [p2History, p2TeamFilter, match]);

  // Waktu Persiapan Selesai -> Masuk ke Sesi Kembali ke Tempat (Menunggu Tombol Hitung Mundur 3-2-1)
  const handlePrepCompleted = () => {
    stopAllSounds();
    setIsTimerRunning(false);
    hasTriggeredMatchStartRef.current = false;
    setTimerPhase("prep_ended");
    setTimerSeconds(0);
    if (soundEnabled) {
      playPointChime(10);
    }
    const nowClock = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setMatchHistory((prev) => [
      {
        id: `hist-prep-end-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: nowClock,
        timeFormatted: "00:00",
        corner: "system",
        teamName: "ARENA SYSTEM",
        actionLabel: `Waktu Persiapan Selesai — Siap Mulai Pertandingan (Sesi ${activeLeg})`,
        delta: 0,
        leg: activeLeg,
      },
      ...prev,
    ]);
  };

  // Mulai Hitung Mundur 3-2-1 secara manual lewat tombol setelah peserta kembali ke tempat
  const handleStartCountdown = () => {
    stopAllSounds();
    hasTriggeredMatchStartRef.current = false;
    setTimerPhase("countdown");
    setTimerSeconds(3);
    setIsTimerRunning(true);
    if (soundEnabled) {
      playSound("countdown", soundCountdownUrl, soundVolume, false);
    }
    const nowClock = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setMatchHistory((prev) => [
      {
        id: `hist-cd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: nowClock,
        timeFormatted: "00:03",
        corner: "system",
        teamName: "ARENA SYSTEM",
        actionLabel: `⏱️ Hitung Mundur 3-2-1 Dimulai (Sesi ${activeLeg})`,
        delta: 0,
        leg: activeLeg,
      },
      ...prev,
    ]);

  };

  // Hitung Mundur Selesai -> Transisi Otomatis ke Pertandingan Berjalan (Stopwatch Hitung Maju dari 00:00.00)
  const handleCountdownCompleted = () => {
    // Guard agar tidak pernah dieksekusi dobel (misal oleh React Strict Mode)
    if (hasTriggeredMatchStartRef.current) return;
    hasTriggeredMatchStartRef.current = true;

    matchStartTimeRef.current = Date.now();
    matchElapsedBaseRef.current = 0;
    setMatchElapsedMs(0);
    setTimerPhase("match");
    setTimerSeconds(0);
    if (soundEnabled) {
      playSound("start", soundStartUrl, soundVolume, soundStartLoop);
    }
    try {
      fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          status: "Berlangsung",
        }),
      }).then(() => broadcastSync("DATA_REFRESH"));
    } catch {}
    const startClock = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const uniqueHistId = `hist-start-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setMatchHistory((prev) => [
      {
        id: uniqueHistId,
        timestamp: startClock,
        timeFormatted: "00:00.00",
        corner: "system",
        teamName: "ARENA SYSTEM",
        actionLabel: `⏱️ Pertandingan Dimulai (Putaran ${activeLeg})`,
        delta: 0,
        leg: activeLeg,
      },
      ...prev,
    ]);

  };

  // Timer Tick Effect (Supports Preparation Countdown, 3-2-1 Countdown, and Match Forward Stopwatch with Centisecond Precision)
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      if (timerPhase === "preparation") {
        interval = setInterval(() => {
          setTimerSeconds((prev) => {
            if (prev <= 1) {
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (timerPhase === "countdown") {
        interval = setInterval(() => {
          setTimerSeconds((prev) => {
            if (prev <= 1) {
              return 0;
            }
            // Synthesized beep on 2 and 1 if no custom countdown sound provided
            if (!soundCountdownUrl && soundEnabled) {
              playSound("countdown", "", soundVolume, false);
            }
            return prev - 1;
          });
        }, 1000);
      } else if (timerPhase === "match") {
        interval = setInterval(() => {
          if (matchStartTimeRef.current > 0) {
            const elapsed = matchElapsedBaseRef.current + (Date.now() - matchStartTimeRef.current);
            setMatchElapsedMs(elapsed);
            const totalSec = Math.floor(elapsed / 1000);
            setTimerSeconds(totalSec);

            if (matchLimit > 0 && totalSec >= matchLimit) {
              const finalMs = matchLimit * 1000;
              setMatchElapsedMs(finalMs);
              setTimerSeconds(matchLimit);
              matchStartTimeRef.current = 0;
              matchElapsedBaseRef.current = finalMs;
              stopAllSounds();
              setIsTimerRunning(false);
              setTimerPhase("finished");
              if (soundEnabled) {
                playSound("finish", soundFinishUrl, soundVolume, soundFinishLoop);
              }
              if (is2x && activeLeg === 1) {
                setTimeout(() => {
                  handleCompleteLeg1(false);
                }, 800);
              }
            }
          }
        }, 30);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    isTimerRunning,
    timerPhase,
    soundEnabled,
    soundCountdownUrl,
    soundFinishUrl,
    soundFinishLoop,
    soundVolume,
    matchLimit,
    is2x,
    activeLeg,
  ]);

  // Phase Transition Effect (Dipicu bersih saat timer mencapai 0)
  useEffect(() => {
    if (!isTimerRunning) return;

    if (timerPhase === "preparation" && timerSeconds === 0) {
      handlePrepCompleted();
    } else if (timerPhase === "countdown" && timerSeconds === 0) {
      handleCountdownCompleted();
    }
  }, [timerSeconds, timerPhase, isTimerRunning]);

  // Helper memformat milidetik ke menit, detik, dan seperseratus detik (centiseconds / hitungan stopwatch cepat 00..99)
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

  const formatTime = (totalMs: number) => {
    return getStopwatchParts(totalMs).formatted;
  };

  // Timer Handlers (Single Sequential Arena Flow: Persiapan -> Hitung Mundur -> Pertandingan)
  const handleStartPrep = () => {
    stopAllSounds();
    hasTriggeredMatchStartRef.current = false;
    const sec = prepDuration > 0 ? prepDuration : 10;
    setTimerSeconds(sec);
    setTimerPhase("preparation");
    setIsTimerRunning(true);
    if (soundEnabled) {
      playSound("prep", soundPrepUrl, soundVolume, soundPrepLoop);
    }
    const nowClock = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setMatchHistory((prev) => [
      {
        id: `hist-prep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: nowClock,
        timeFormatted: `00:${sec.toString().padStart(2, "0")}`,
        corner: "system",
        teamName: "ARENA SYSTEM",
        actionLabel: `Waktu Persiapan Dimulai (${sec} Detik)`,
        delta: 0,
        leg: activeLeg,
      },
      ...prev,
    ]);

  };

  const handlePausePrep = () => {
    setIsTimerRunning(false);
    setTimerPhase("prep_paused");
    stopAllSounds();
  };

  const handleResumePrep = () => {
    setIsTimerRunning(true);
    setTimerPhase("preparation");
    if (soundEnabled) {
      playSound("prep", soundPrepUrl, soundVolume, soundPrepLoop);
    }
  };

  const handlePauseMatch = () => {
    setIsTimerRunning(false);
    setTimerPhase("match_paused");
    stopAllSounds();
    if (matchStartTimeRef.current > 0) {
      matchElapsedBaseRef.current += Date.now() - matchStartTimeRef.current;
      matchStartTimeRef.current = 0;
    }
  };

  const handleResumeMatch = () => {
    matchStartTimeRef.current = Date.now();
    setIsTimerRunning(true);
    setTimerPhase("match");
    if (soundEnabled) {
      playSound("start", soundStartUrl, soundVolume, soundStartLoop);
    }
  };

  const handleMainAction = () => {
    if (timerPhase === "idle") {
      handleStartPrep();
    } else if (timerPhase === "preparation") {
      handlePausePrep();
    } else if (timerPhase === "prep_paused") {
      handleResumePrep();
    } else if (timerPhase === "prep_ended") {
      handleStartCountdown();
    } else if (timerPhase === "countdown") {
      // Countdown 3-2-1 sedang berjalan otomatis
    } else if (timerPhase === "match") {
      handlePauseMatch();
    } else if (timerPhase === "match_paused") {
      handleResumeMatch();
    } else if (timerPhase === "finished") {
      handleResetTimer();
    }
  };

  const handleResetTimer = () => {
    stopAllSounds();
    hasTriggeredMatchStartRef.current = false;
    setIsTimerRunning(false);
    setTimerPhase("idle");
    const sec = prepDuration > 0 ? prepDuration : 10;
    setTimerSeconds(sec);
    setMatchElapsedMs(0);
    matchStartTimeRef.current = 0;
    matchElapsedBaseRef.current = 0;
    setFinishedCorners((prev) =>
      activeLeg === 2
        ? { ...prev, p2Red: "", p2Blue: "" }
        : { ...prev, p1Red: "", p1Blue: "" }
    );
    setCornerNotifs({ red: null, blue: null });
    const nowClock = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setMatchHistory((prev) => [
      {
        id: `hist-reset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: nowClock,
        timeFormatted: "00:00.00",
        corner: "system",
        teamName: "ARENA SYSTEM",
        actionLabel: `🔄 Timer Sesi ${activeLeg} Di-reset ke Standby Persiapan`,
        delta: 0,
        leg: activeLeg,
      },
      ...prev,
    ]);

    showArenaToast({
      kind: "reset_timer",
      title: "STOPWATCH DIRESET",
      text: `Waktu Sesi ${activeLeg} kembali ke durasi standby persiapan (${prepDuration > 0 ? prepDuration : 10} detik)`,
      isPositive: true,
    }, 2500);
  };

  // Dedicated subtle chime for point scoring (does not interrupt match background music)
  const playPointChime = (delta: number) => {
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
      if (delta > 0) {
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

  // Score Handlers
  const handleScoreDelta = async (
    corner: "red" | "blue",
    delta: number,
    ruleLabel?: string,
    explicitLeg?: 1 | 2
  ) => {
    if (!match) return;

    const legToUse: 1 | 2 = explicitLeg || (activeLeg as 1 | 2) || 1;

    // 1. Poin HANYA bisa ditambahkan saat Waktu Pertandingan sedang berjalan (timerPhase === "match" atau "match_paused")
    if (timerPhase !== "match" && timerPhase !== "match_paused") {
      showPointToast(
        "🔒 Poin belum bisa ditambahkan! Poin hanya aktif saat Waktu Pertandingan dimulai.",
        false
      );
      return;
    }

    // Pada mode 2x Main, hanya sesi yang sedang aktif (activeLeg) yang bisa menerima poin
    if (is2x && legToUse !== activeLeg) {
      showPointToast(
        `🔒 Sesi ${legToUse} tidak aktif! Pertandingan saat ini sedang berjalan di Sesi ${activeLeg}.`,
        false
      );
      return;
    }

    // Jika laga tanding tunggal (1 tim):
    // Putaran 1: Tim A bermain di Sudut Merah (Sudut Biru kosong)
    // Putaran 2: Tim A bermain di Sudut Biru (Sudut Merah kosong)
    if (isSingle) {
      if (legToUse === 1 && corner === "blue") return;
      if (legToUse === 2 && corner === "red") return;
    }

    // Corner team assignment:
    // In 1x mode: Red = Team A, Blue = Team B
    // In 2x mode Leg 1: Red = Team A, Blue = Team B
    // In 2x mode Leg 2: Red = Team B, Blue = Team A (TUKAR SISI)
    const targetTeam: "A" | "B" = is2x
      ? legToUse === 1
        ? (corner === "red" ? "A" : "B")
        : (corner === "red" ? "B" : "A")
      : (corner === "red" ? redTeamKey : blueTeamKey);

    const teamName = targetTeam === "A" ? match.teamA : match.teamB;

    // 2. Jika sudut/sisi ini sudah FINISH pada sesi ini, kunci seluruh penambahan poin & larang Finish lebih dari 1x
    const existingFinishTime = getCornerFinishTime(legToUse, corner);
    if (existingFinishTime) return;

    const currentSwTime = formatTime(matchElapsedMs);
    const nowClock = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const labelText = ruleLabel || (delta > 0 ? `+${delta} PTS` : `${delta} PTS`);

    // Tambah ke riwayat histori laga
    const newHist: (typeof matchHistory)[0] = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowClock,
      timeFormatted: currentSwTime,
      corner,
      teamName: teamName || (corner === "red" ? "Sudut Merah" : "Sudut Biru"),
      actionLabel: labelText,
      delta,
      leg: legToUse,
    };
    setMatchHistory((prev) => [newHist, ...prev]);

    // Simpan ke SQLite point_logs
    const targetParticipant = participants.find((p) => p.name === teamName);
    if (targetParticipant) {
      fetch("/api/participants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "quick_adjust",
          participantId: targetParticipant.id,
          delta,
          label: `${labelText} (${(match.matchLabel || "").startsWith("Laga") ? match.matchLabel : `Laga ${match.matchLabel}`} P${legToUse} @${currentSwTime})`,
          targetRound: "babak1",
        }),
      }).catch(() => {});
    }

    const isFinishAction = Boolean(ruleLabel && ruleLabel.toUpperCase().includes("FINISH"));
    const cornerNotifLabel = formatScoringNotifLabel(ruleLabel);

    let nextLegScores = {
      scoreALeg1: match.scoreALeg1 || 0,
      scoreBLeg1: match.scoreBLeg1 || 0,
      scoreALeg2: match.scoreALeg2 || 0,
      scoreBLeg2: match.scoreBLeg2 || 0,
      scoreA: match.scoreA || 0,
      scoreB: match.scoreB || 0,
    };

    if (is2x) {
      let scoreALeg1 = match.scoreALeg1 || 0;
      let scoreBLeg1 = match.scoreBLeg1 || 0;
      let scoreALeg2 = match.scoreALeg2 || 0;
      let scoreBLeg2 = match.scoreBLeg2 || 0;

      if (targetTeam === "A" && legToUse === 1) scoreALeg1 = Number((scoreALeg1 + delta).toFixed(1));
      if (targetTeam === "B" && legToUse === 1) scoreBLeg1 = Number((scoreBLeg1 + delta).toFixed(1));
      if (targetTeam === "A" && legToUse === 2) scoreALeg2 = Number((scoreALeg2 + delta).toFixed(1));
      if (targetTeam === "B" && legToUse === 2) scoreBLeg2 = Number((scoreBLeg2 + delta).toFixed(1));

      // Rata-rata dari 2 pertandingan (Putaran 1 & Putaran 2)
      const avgA = Number(((scoreALeg1 + scoreALeg2) / 2).toFixed(2));
      const avgB = Number(((scoreBLeg1 + scoreBLeg2) / 2).toFixed(2));

      nextLegScores = { scoreALeg1, scoreBLeg1, scoreALeg2, scoreBLeg2, scoreA: avgA, scoreB: avgB };

      setMatch((prev) =>
        prev
          ? {
              ...prev,
              currentLeg: legToUse,
              scoreALeg1,
              scoreBLeg1,
              scoreALeg2,
              scoreBLeg2,
              scoreA: avgA,
              scoreB: avgB,
              status: "Berlangsung",
            }
          : null
      );

      showTimerCornerNotif(
        corner,
        cornerNotifLabel,
        delta > 0,
        isFinishAction,
        isFinishAction ? 2400 : 1800
      );
      playPointChime(delta);

      try {
        await fetch("/api/bracket", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: match.id,
            currentLeg: legToUse,
            scoreALeg1,
            scoreBLeg1,
            scoreALeg2,
            scoreBLeg2,
            scoreA: avgA,
            scoreB: avgB,
            status: "Berlangsung",
          }),
        });
        broadcastSync("DATA_REFRESH");
      } catch (e) {}
    } else {
      const curScore = targetTeam === "A" ? match.scoreA : match.scoreB;
      const newScore = Number((curScore + delta).toFixed(1));
      const newA = targetTeam === "A" ? newScore : match.scoreA;
      const newB = targetTeam === "B" ? newScore : match.scoreB;

      nextLegScores = {
        ...nextLegScores,
        scoreA: newA,
        scoreB: newB,
      };

      setMatch((prev) =>
        prev
          ? {
              ...prev,
              scoreA: newA,
              scoreB: newB,
              status: "Berlangsung",
            }
          : null
      );

      showTimerCornerNotif(
        corner,
        cornerNotifLabel,
        delta > 0,
        isFinishAction,
        isFinishAction ? 2400 : 1800
      );
      playPointChime(delta);

      try {
        await fetch("/api/bracket", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: match.id,
            scoreA: newA,
            scoreB: newB,
            status: "Berlangsung",
          }),
        });
        broadcastSync("DATA_REFRESH");
      } catch (e) {}
    }

    // CEK KONDISI FINISH (Maksimal 1x per sisi, langsung kunci poin sisi tersebut) & AUTO-STOP PERTANDINGAN
    if (isFinishAction) {
      finalizeCornerAndCheckMatchEnd(
        corner,
        legToUse,
        currentSwTime,
        nextLegScores,
        nowClock
      );
    }
  };

  /** Finalize a corner's finish timestamp and auto-stop/transition when all active sides have completed. */
  const finalizeCornerAndCheckMatchEnd = (
    corner: "red" | "blue",
    legToUse: 1 | 2,
    recordedFinishTime: string,
    nextLegScores: {
      scoreALeg1: number;
      scoreBLeg1: number;
      scoreALeg2: number;
      scoreBLeg2: number;
      scoreA: number;
      scoreB: number;
    },
    nowClock: string
  ) => {
    if (!match) return;

    const currentRedTime = legToUse === 1 ? finishedCorners.p1Red : finishedCorners.p2Red;
    const currentBlueTime = legToUse === 1 ? finishedCorners.p1Blue : finishedCorners.p2Blue;

    const nextRedTime = corner === "red" ? recordedFinishTime : currentRedTime;
    const nextBlueTime = corner === "blue" ? recordedFinishTime : currentBlueTime;

    setFinishedCorners((prev) =>
      legToUse === 1
        ? { ...prev, p1Red: nextRedTime, p1Blue: nextBlueTime }
        : { ...prev, p2Red: nextRedTime, p2Blue: nextBlueTime }
    );

    const isEveryoneDone = isSingle
      ? legToUse === 1
        ? Boolean(nextRedTime)
        : Boolean(nextBlueTime)
      : Boolean(nextRedTime && nextBlueTime);

    if (!isEveryoneDone) return;

    // SEMUA TIM TELAH FINISH -> AUTO STOP PERTANDINGAN!
    stopAllSounds();
    setIsTimerRunning(false);

    const doneTeamDesc = isSingle ? match.teamA : "SEMUA TIM";

    const autoStopLog: (typeof matchHistory)[0] = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-autostop`,
      timestamp: nowClock,
      timeFormatted: recordedFinishTime,
      corner: "system",
      teamName: "ARENA SYSTEM",
      actionLabel: `🏁 ${doneTeamDesc} FINISH! Sesi ${legToUse} Otomatis Berhenti (${recordedFinishTime})`,
      delta: 0,
      leg: legToUse,
    };
    setMatchHistory((prev) => [autoStopLog, ...prev]);

    let hasProceeded = false;
    const proceedToTransition = () => {
      if (hasProceeded) return;
      hasProceeded = true;
      if (is2x && legToUse === 1) {
        handleCompleteLeg1(false, nextLegScores);
      } else {
        handleFinishMatch(false, nextLegScores);
      }
    };

    if (soundEnabled) {
      // Habiskan suara finish dulu baru transisi buka modal
      playSound("finish", soundFinishUrl, soundVolume, false, () => {
        proceedToTransition();
      });
      // Fallback batas aman maksimal 7 detik jika audio terputus atau tidak trigger onended
      setTimeout(proceedToTransition, 7000);
    } else {
      setTimeout(proceedToTransition, 1500);
    }
  };

  /** Handle corner surrender: save current score as-is and record finish time at full match limit (e.g. 05:00.00). */
  const handleSurrender = async (corner: "red" | "blue", explicitLeg?: 1 | 2) => {
    if (!match) return;

    const legToUse: 1 | 2 = explicitLeg || (activeLeg as 1 | 2) || 1;

    if (timerPhase !== "match" && timerPhase !== "match_paused") {
      showPointToast(
        "🔒 Tombol Menyerah hanya aktif saat Waktu Pertandingan dimulai.",
        false
      );
      return;
    }

    if (is2x && legToUse !== activeLeg) {
      showPointToast(
        `🔒 Sesi ${legToUse} tidak aktif! Pertandingan saat ini sedang berjalan di Sesi ${activeLeg}.`,
        false
      );
      return;
    }

    if (isSingle) {
      if (legToUse === 1 && corner === "blue") return;
      if (legToUse === 2 && corner === "red") return;
    }

    if (getCornerFinishTime(legToUse, corner)) return;

    const targetTeam: "A" | "B" = is2x
      ? legToUse === 1
        ? (corner === "red" ? "A" : "B")
        : (corner === "red" ? "B" : "A")
      : (corner === "red" ? redTeamKey : blueTeamKey);

    const teamName = targetTeam === "A" ? match.teamA : match.teamB;

    const fullTimeMs = (matchLimit > 0 ? matchLimit : 300) * 1000;
    const fullTimeFormatted = formatTime(fullTimeMs);
    const nowClock = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const surrenderHist: (typeof matchHistory)[0] = {
      id: `hist-surrender-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowClock,
      timeFormatted: fullTimeFormatted,
      corner,
      teamName: teamName || (corner === "red" ? "Sudut Merah" : "Sudut Biru"),
      actionLabel: "Menyerah (Finish Waktu Habis)",
      delta: 0,
      leg: legToUse,
    };
    setMatchHistory((prev) => [surrenderHist, ...prev]);

    const targetParticipant = participants.find((p) => p.name === teamName);
    if (targetParticipant) {
      fetch("/api/participants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "quick_adjust",
          participantId: targetParticipant.id,
          delta: 0,
          label: `Menyerah • FINISH (${(match.matchLabel || "").startsWith("Laga") ? match.matchLabel : `Laga ${match.matchLabel}`} P${legToUse} @${fullTimeFormatted})`,
          targetRound: "babak1",
        }),
      }).catch(() => {});
    }

    const scoreALeg1 = match.scoreALeg1 || 0;
    const scoreBLeg1 = match.scoreBLeg1 || 0;
    const scoreALeg2 = match.scoreALeg2 || 0;
    const scoreBLeg2 = match.scoreBLeg2 || 0;
    const avgA = is2x ? Number(((scoreALeg1 + scoreALeg2) / 2).toFixed(2)) : (match.scoreA || 0);
    const avgB = is2x ? Number(((scoreBLeg1 + scoreBLeg2) / 2).toFixed(2)) : (match.scoreB || 0);

    const nextLegScores = {
      scoreALeg1,
      scoreBLeg1,
      scoreALeg2,
      scoreBLeg2,
      scoreA: avgA,
      scoreB: avgB,
    };

    showTimerCornerNotif(corner, "Menyerah", false, false, 2400);
    playPointChime(-1);

    try {
      await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          is2x
            ? {
                matchId: match.id,
                currentLeg: legToUse,
                scoreALeg1,
                scoreBLeg1,
                scoreALeg2,
                scoreBLeg2,
                scoreA: avgA,
                scoreB: avgB,
                status: "Berlangsung",
              }
            : {
                matchId: match.id,
                scoreA: avgA,
                scoreB: avgB,
                status: "Berlangsung",
              }
        ),
      });
      broadcastSync("DATA_REFRESH");
    } catch (e) {}

    finalizeCornerAndCheckMatchEnd(
      corner,
      legToUse,
      fullTimeFormatted,
      nextLegScores,
      nowClock
    );
  };

  const handleSetExactScore = async (
    corner: "red" | "blue",
    val: number,
    explicitLeg?: 1 | 2
  ) => {
    if (!match) return;
    const legToUse: 1 | 2 = explicitLeg || (activeLeg as 1 | 2) || 1;

    if (timerPhase !== "match") {
      showPointToast(
        "🔒 Poin hanya dapat diubah saat Waktu Pertandingan sedang berjalan.",
        false
      );
      return;
    }

    if (is2x && legToUse !== activeLeg) {
      showPointToast(
        `🔒 Sesi ${legToUse} tidak aktif! Pertandingan sedang berjalan di Sesi ${activeLeg}.`,
        false
      );
      return;
    }

    if (isSingle) {
      if (legToUse === 1 && corner === "blue") return;
      if (legToUse === 2 && corner === "red") return;
    }

    const targetTeam: "A" | "B" = is2x
      ? legToUse === 1
        ? (corner === "red" ? "A" : "B")
        : (corner === "red" ? "B" : "A")
      : (corner === "red" ? redTeamKey : blueTeamKey);

    const teamName = targetTeam === "A" ? match.teamA : match.teamB;

    const existingFinishTime = getCornerFinishTime(legToUse, corner);
    if (existingFinishTime) return;
    const currentSwTime =
      timerPhase === "match" || timerPhase === "match_paused" || timerPhase === "finished"
        ? formatTime(matchElapsedMs)
        : "00:00.00";
    const nowClock = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const exactHist: (typeof matchHistory)[0] = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-exact`,
      timestamp: nowClock,
      timeFormatted: currentSwTime,
      corner,
      teamName: teamName || (corner === "red" ? "Sudut Merah" : "Sudut Biru"),
      actionLabel: `Koreksi Manual Skor P${legToUse}: ${val} PTS`,
      delta: val,
      leg: legToUse,
    };
    setMatchHistory((prev) => [exactHist, ...prev]);

    if (is2x) {
      let scoreALeg1 = match.scoreALeg1 || 0;
      let scoreBLeg1 = match.scoreBLeg1 || 0;
      let scoreALeg2 = match.scoreALeg2 || 0;
      let scoreBLeg2 = match.scoreBLeg2 || 0;

      if (targetTeam === "A" && legToUse === 1) scoreALeg1 = val;
      if (targetTeam === "B" && legToUse === 1) scoreBLeg1 = val;
      if (targetTeam === "A" && legToUse === 2) scoreALeg2 = val;
      if (targetTeam === "B" && legToUse === 2) scoreBLeg2 = val;

      // Rata-rata dari 2 pertandingan (Putaran 1 & Putaran 2)
      const avgA = Number(((scoreALeg1 + scoreALeg2) / 2).toFixed(2));
      const avgB = Number(((scoreBLeg1 + scoreBLeg2) / 2).toFixed(2));

      setMatch((prev) =>
        prev
          ? {
              ...prev,
              scoreALeg1,
              scoreBLeg1,
              scoreALeg2,
              scoreBLeg2,
              scoreA: avgA,
              scoreB: avgB,
            }
          : null
      );

      try {
        await fetch("/api/bracket", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: match.id,
            scoreALeg1,
            scoreBLeg1,
            scoreALeg2,
            scoreBLeg2,
            scoreA: avgA,
            scoreB: avgB,
          }),
        });
        broadcastSync("DATA_REFRESH");
      } catch (e) {}
    } else {
      const newA = targetTeam === "A" ? val : match.scoreA;
      const newB = targetTeam === "B" ? val : match.scoreB;

      setMatch((prev) => (prev ? { ...prev, scoreA: newA, scoreB: newB } : null));

      try {
        await fetch("/api/bracket", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: match.id,
            scoreA: newA,
            scoreB: newB,
          }),
        });
        broadcastSync("DATA_REFRESH");
      } catch (e) {}
    }
  };

  // Switch Leg Handler for 2x Main
  const handleSwitchLeg = async (nextLeg: 1 | 2) => {
    if (!match) return;

    setMatch((prev) => (prev ? { ...prev, currentLeg: nextLeg } : null));

    // Reset timer ke standby persiapan untuk Putaran selanjutnya (Wajib Persiapan dlu)
    stopAllSounds();
    hasTriggeredMatchStartRef.current = false;
    const sec = prepDuration > 0 ? prepDuration : 10;
    setTimerSeconds(sec);
    setMatchElapsedMs(0);
    matchStartTimeRef.current = 0;
    matchElapsedBaseRef.current = 0;
    setIsTimerRunning(false);
    setTimerPhase("idle");
    setCornerNotifs({ red: null, blue: null });

    const nowClock = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setMatchHistory((prev) => [
      {
        id: `hist-leg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: nowClock,
        timeFormatted: "00:00",
        corner: "system",
        teamName: "ARENA SYSTEM",
        actionLabel: nextLeg === 2 ? "🔁 Beralih ke Putaran 2 (Tukar Sisi)" : "⬅️ Kembali ke Putaran 1",
        delta: 0,
        leg: nextLeg,
      },
      ...prev,
    ]);

    if (nextLeg === 2) {
      showArenaToast({
        kind: "switch_leg",
        leg: 2,
        title: "TUKAR SISI ARENA • PUTARAN 2",
        text: `Sudut Merah: ${match.teamB} • Sudut Biru: ${match.teamA}`,
        teamA: match.teamB,
        teamB: match.teamA,
        isPositive: true,
      }, 3500);
    } else {
      showArenaToast({
        kind: "switch_leg",
        leg: 1,
        title: "KEMBALI KE PUTARAN 1",
        text: `Sudut Merah: ${match.teamA} • Sudut Biru: ${match.teamB}`,
        teamA: match.teamA,
        teamB: match.teamB,
        isPositive: true,
      }, 3200);
    }

    try {
      await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          currentLeg: nextLeg,
          status: "Berlangsung",
        }),
      });
      broadcastSync("DATA_REFRESH");
    } catch (e) {}
  };

  type Leg1RuleKey = "point" | "cekpoint" | "finish" | "bonus" | "retry";

  const LEG1_SCORE_CATEGORIES: Array<{
    key: Leg1RuleKey;
    label: string;
    fallbackPoints: number;
  }> = [
    { key: "point", label: "Point", fallbackPoints: 5 },
    { key: "cekpoint", label: "Cekpoint", fallbackPoints: 10 },
    { key: "finish", label: "Finish", fallbackPoints: 15 },
    { key: "bonus", label: "Bonus", fallbackPoints: 5 },
    { key: "retry", label: "Retry", fallbackPoints: -0.5 },
  ];

  const matchesLeg1RuleKey = (rawLabel: string | undefined, key: Leg1RuleKey): boolean => {
    const al = (rawLabel || "").trim().toLowerCase();
    if (key === "point") return al === "point" || al === "poin";
    if (key === "cekpoint") return al.includes("cekpoint") || al.includes("checkpoint");
    if (key === "finish") return al.includes("finish") && !al.includes("menyerah");
    if (key === "bonus") return al.includes("bonus");
    return al.includes("retry");
  };

  const getRulePointsForKey = (key: Leg1RuleKey): number => {
    const matched = customPointRules.find((r) => matchesLeg1RuleKey(r.label, key));
    if (matched) return matched.points;
    return LEG1_SCORE_CATEGORIES.find((c) => c.key === key)?.fallbackPoints ?? 0;
  };

  const getScoreCategoryBreakdown = (
    legFilter: 1 | 2 | "all",
    team: "A" | "B",
    includeLeg1Adj: boolean = false
  ) => {
    const targetName = team === "A" ? match?.teamA : match?.teamB;
    const teamLogs = matchHistory.filter((item) => {
      if (item.corner === "system") return false;
      if (legFilter !== "all" && item.leg !== legFilter) return false;
      if (item.teamName === targetName) return true;
      const itemCornerTeam =
        item.leg === 2
          ? item.corner === "blue"
            ? "A"
            : "B"
          : item.corner === "red"
          ? "A"
          : "B";
      return itemCornerTeam === team;
    });

    return LEG1_SCORE_CATEGORIES.map((cat) => {
      const rulePoints = getRulePointsForKey(cat.key);
      const matchingLogs = teamLogs.filter((item) => matchesLeg1RuleKey(item.actionLabel, cat.key));
      const baseCount = matchingLogs.length;
      const basePts = matchingLogs.reduce((sum, item) => sum + (Number(item.delta) || 0), 0);
      const adjCount = includeLeg1Adj ? (leg1RuleAdjustments[team][cat.key] || 0) : 0;
      const count = Math.max(0, baseCount + adjCount);
      const totalPts = Number((basePts + adjCount * rulePoints).toFixed(2));

      return {
        ...cat,
        rulePoints,
        count,
        totalPts,
      };
    });
  };

  const getLeg1CategoryBreakdown = (team: "A" | "B") =>
    getScoreCategoryBreakdown(1, team, true);

  const handleAdjustLeg1Rule = (
    team: "A" | "B",
    key: Leg1RuleKey,
    rulePoints: number,
    step: 1 | -1,
    currentCount: number
  ) => {
    if (step === -1 && currentCount <= 0) return;

    setLeg1RuleAdjustments((prev) => ({
      ...prev,
      [team]: {
        ...prev[team],
        [key]: (prev[team][key] || 0) + step,
      },
    }));

    const scoreDelta = step * rulePoints;
    if (team === "A") {
      setRevisedLeg1ScoreA((prev) => Math.max(0, Number((prev + scoreDelta).toFixed(2))));
    } else {
      setRevisedLeg1ScoreB((prev) => Math.max(0, Number((prev + scoreDelta).toFixed(2))));
    }
  };

  const renderLeg1CategoryBreakdown = (team: "A" | "B") => {
    const rows = getLeg1CategoryBreakdown(team);
    return (
      <div className="pt-2 border-t border-white/10 space-y-1.5">
        <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
          Rincian Per Skor (Putaran 1):
        </span>
        <div className="space-y-1">
          {rows.map((row) => {
            const pointBadgeText = row.rulePoints > 0 ? `+${row.rulePoints}` : `${row.rulePoints}`;
            const subtotalText = row.totalPts > 0 ? `+${row.totalPts}` : `${row.totalPts}`;
            return (
              <div
                key={row.key}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px]"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-white truncate">{row.label}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">({pointBadgeText})</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-mono font-bold">
                    {row.count}x
                  </span>
                  <span
                    className={`min-w-[52px] text-right font-mono font-black text-[11px] ${
                      row.totalPts > 0
                        ? "text-emerald-400"
                        : row.totalPts < 0
                        ? "text-rose-400"
                        : "text-zinc-500"
                    }`}
                  >
                    {subtotalText}
                  </span>
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      type="button"
                      disabled={row.count <= 0}
                      onClick={() =>
                        handleAdjustLeg1Rule(team, row.key, row.rulePoints, -1, row.count)
                      }
                      className={`w-6 h-6 rounded-lg border font-bold text-xs flex items-center justify-center transition-colors ${
                        row.count <= 0
                          ? "bg-zinc-900/40 border-zinc-800/60 text-zinc-600 cursor-not-allowed"
                          : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
                      }`}
                      title={`Kurangi 1 ${row.label}`}
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleAdjustLeg1Rule(team, row.key, row.rulePoints, 1, row.count)
                      }
                      className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                      title={`Tambah 1 ${row.label} (${pointBadgeText})`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Handler Selesai Putaran 1 (Untuk 2x Main: buka modal tinjau & revisi log P1, timer ke idle/stop)
  const handleCompleteLeg1 = async (
    stopSounds: boolean = true,
    overrideScores?: {
      scoreALeg1: number;
      scoreBLeg1: number;
      scoreALeg2: number;
      scoreBLeg2: number;
      scoreA: number;
      scoreB: number;
    }
  ) => {
    if (!match) return;

    if (stopSounds) {
      stopAllSounds();
      if (soundEnabled) {
        playPointChime(10);
      }
    }
    setIsTimerRunning(false);
    hasTriggeredMatchStartRef.current = false;
    if (matchStartTimeRef.current > 0) {
      matchElapsedBaseRef.current += Date.now() - matchStartTimeRef.current;
      matchStartTimeRef.current = 0;
    }

    const sAL1 = overrideScores ? overrideScores.scoreALeg1 : (match.scoreALeg1 || 0);
    const sBL1 = overrideScores ? overrideScores.scoreBLeg1 : (match.scoreBLeg1 || 0);

    // Inisialisasi skor untuk revisi di modal tinjau log
    setRevisedLeg1ScoreA(sAL1);
    setRevisedLeg1ScoreB(sBL1);
    setLeg1LogFilter("all");
    setLeg1RuleAdjustments({ A: {}, B: {} });

    // Timer diset ke idle & stop (sama seperti kondisi awal)
    const sec = prepDuration > 0 ? prepDuration : 10;
    setTimerSeconds(sec);
    setTimerPhase("idle");
    setShowLeg1Modal(true);

    const nowClock = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setMatchHistory((prev) => [
      {
        id: `hist-comp-p1-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: nowClock,
        timeFormatted: formatTime(matchElapsedMs),
        corner: "system",
        teamName: "ARENA SYSTEM",
        actionLabel: `🏁 Sesi 1 (Putaran 1) Selesai! (${match.teamA}: ${sAL1} PTS | ${match.teamB}: ${sBL1} PTS) • Menunggu Tinjauan & ACC Log`,
        delta: 0,
        leg: 1,
      },
      ...prev,
    ]);
  };

  // Konfirmasi ACC Putaran 1 -> Simpan skor (termasuk hasil revisi) & beralih ke Putaran 2 (Tukar Sisi)
  // Kondisi Putaran 2: STANDBY / STOP (TIDAK LANGSUNG MULAI!)
  const handleConfirmAccLeg1 = async () => {
    if (!match) return;

    const sAL1 = revisedLeg1ScoreA;
    const sBL1 = revisedLeg1ScoreB;
    const sAL2 = match.scoreALeg2 || 0;
    const sBL2 = match.scoreBLeg2 || 0;

    const avgA = Number(((sAL1 + sAL2) / 2).toFixed(2));
    const avgB = Number(((sBL1 + sBL2) / 2).toFixed(2));

    setMatch((prev) =>
      prev
        ? {
            ...prev,
            currentLeg: 2,
            scoreALeg1: sAL1,
            scoreBLeg1: sBL1,
            scoreALeg2: sAL2,
            scoreBLeg2: sBL2,
            scoreA: avgA,
            scoreB: avgB,
            status: "Berlangsung",
          }
        : null
    );

    // KONDISI AWAL: Timer STOP / IDLE, TIDAK LANGSUNG JALAN
    stopAllSounds();
    hasTriggeredMatchStartRef.current = false;
    const sec = prepDuration > 0 ? prepDuration : 10;
    setTimerSeconds(sec);
    setMatchElapsedMs(0);
    matchStartTimeRef.current = 0;
    matchElapsedBaseRef.current = 0;
    setIsTimerRunning(false);
    setTimerPhase("idle");
    setCornerNotifs({ red: null, blue: null });
    setShowLeg1Modal(false);

    const nowClock = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setMatchHistory((prev) => {
      let nextHistory = [...prev];
      (["A", "B"] as const).forEach((teamKey) => {
        const teamName = teamKey === "A" ? match.teamA : match.teamB;
        const cornerKey = teamKey === "A" ? "red" : "blue";
        const teamAdjs = leg1RuleAdjustments[teamKey] || {};
        LEG1_SCORE_CATEGORIES.forEach((cat) => {
          const adj = teamAdjs[cat.key] || 0;
          if (adj > 0) {
            const pts = getRulePointsForKey(cat.key);
            for (let i = 0; i < adj; i += 1) {
              nextHistory.unshift({
                id: `hist-rev-${teamKey}-${cat.key}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
                timestamp: nowClock,
                timeFormatted: "Revisi",
                corner: cornerKey,
                teamName,
                actionLabel: cat.label,
                delta: pts,
                leg: 1,
              });
            }
          } else if (adj < 0) {
            let remainingToRemove = Math.abs(adj);
            nextHistory = nextHistory.filter((item) => {
              if (
                remainingToRemove > 0 &&
                item.leg === 1 &&
                item.corner !== "system" &&
                (item.teamName === teamName || item.corner === cornerKey) &&
                matchesLeg1RuleKey(item.actionLabel, cat.key)
              ) {
                remainingToRemove -= 1;
                return false;
              }
              return true;
            });
          }
        });
      });

      return [
        {
          id: `hist-acc-p1-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: nowClock,
          timeFormatted: "00:00",
          corner: "system",
          teamName: "ARENA SYSTEM",
          actionLabel: `✅ Putaran 1 di-ACC (${match.teamA}: ${sAL1} PTS | ${match.teamB}: ${sBL1} PTS) • Beralih ke Putaran 2 (Tukar Sisi)`,
          delta: 0,
          leg: 1,
        },
        ...nextHistory,
      ];
    });
    setLeg1RuleAdjustments({ A: {}, B: {} });

    showArenaToast({
      kind: "switch_leg",
      leg: 2,
      title: "TUKAR SISI ARENA • PUTARAN 2",
      text: `Putaran 2 Standby (Stop). Sudut Merah: ${match.teamB} • Sudut Biru: ${match.teamA}. Tekan Mulai Pertandingan bila siap.`,
      teamA: match.teamB,
      teamB: match.teamA,
      isPositive: true,
    }, 4500);

    try {
      await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          currentLeg: 2,
          scoreALeg1: sAL1,
          scoreBLeg1: sBL1,
          scoreALeg2: sAL2,
          scoreBLeg2: sBL2,
          scoreA: avgA,
          scoreB: avgB,
          status: "Berlangsung",
        }),
      });
      broadcastSync("DATA_REFRESH");
    } catch (e) {
      console.error("Gagal menyelesaikan Putaran 1:", e);
    }
  };

  // Finish Match Handler (Finalize match after Putaran 2 or after 1x Main)
  const handleFinishMatch = async (
    stopSounds: boolean = true,
    overrideScores?: {
      scoreALeg1: number;
      scoreBLeg1: number;
      scoreALeg2: number;
      scoreBLeg2: number;
      scoreA: number;
      scoreB: number;
    }
  ) => {
    if (!match) return;

    if (stopSounds) {
      stopAllSounds();
      if (soundEnabled) {
        playSound("finish", soundFinishUrl, soundVolume, soundFinishLoop);
      }
    }
    setIsTimerRunning(false);
    if (matchStartTimeRef.current > 0) {
      matchElapsedBaseRef.current += Date.now() - matchStartTimeRef.current;
      matchStartTimeRef.current = 0;
    }
    setTimerPhase("finished");

    const sAL1 = overrideScores ? overrideScores.scoreALeg1 : (match.scoreALeg1 || 0);
    const sBL1 = overrideScores ? overrideScores.scoreBLeg1 : (match.scoreBLeg1 || 0);
    const sAL2 = overrideScores ? overrideScores.scoreALeg2 : (match.scoreALeg2 || 0);
    const sBL2 = overrideScores ? overrideScores.scoreBLeg2 : (match.scoreBLeg2 || 0);

    const finalScoreA = is2x
      ? Number(((sAL1 + sAL2) / 2).toFixed(2))
      : overrideScores
      ? overrideScores.scoreA
      : (match.scoreA || 0);

    const finalScoreB = is2x
      ? Number(((sBL1 + sBL2) / 2).toFixed(2))
      : overrideScores
      ? overrideScores.scoreB
      : (match.scoreB || 0);

    const historyFinishLogs = matchHistory
      .filter((item) => item.corner !== "system" && item.actionLabel.toUpperCase().includes("FINISH"))
      .map((item) => ({
        participantName: item.teamName,
        stageLabel: `${item.actionLabel} (Laga ${match.matchLabel} P${item.leg} @${item.timeFormatted})`,
      }));

    const resolution = resolveMatchWinner({
      scoreA: finalScoreA,
      scoreB: finalScoreB,
      is2xMode: is2x,
      finishedCorners,
      matchLogs: historyFinishLogs,
      teamA: match.teamA,
      teamB: match.teamB,
    });

    const winner: "A" | "B" | null = resolution.winner;

    setMatch((prev) =>
      prev
        ? {
            ...prev,
            status: "Selesai",
            scoreALeg1: sAL1,
            scoreBLeg1: sBL1,
            scoreALeg2: sAL2,
            scoreBLeg2: sBL2,
            scoreA: finalScoreA,
            scoreB: finalScoreB,
            winner: winner || undefined,
          }
        : null
    );
    setWinnerBreakdownLeg(is2x ? 2 : "all");
    setShowWinnerModal(true);

    const tieNote =
      resolution.decidedBy === "finish_time" &&
      resolution.teamAFinishFormatted &&
      resolution.teamBFinishFormatted
        ? ` • Waktu Finish Lebih Cepat (${resolution.teamAFinishFormatted} vs ${resolution.teamBFinishFormatted})`
        : resolution.decidedBy === "finish_time"
        ? " • Waktu Finish Lebih Cepat"
        : "";

    const nowClock = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setMatchHistory((prev) => [
      {
        id: `hist-finish-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: nowClock,
        timeFormatted: formatTime(matchElapsedMs),
        corner: "system",
        teamName: "ARENA SYSTEM",
        actionLabel: `🏆 Pertandingan Selesai Resmi! ${winner === "A" ? match.teamA : winner === "B" ? match.teamB : "Hasil Seri"} (${finalScoreA} - ${finalScoreB})${tieNote}`,
        delta: 0,
        leg: activeLeg,
      },
      ...prev,
    ]);

    try {
      await fetch("/api/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          status: "Selesai",
          scoreA: finalScoreA,
          scoreB: finalScoreB,
          scoreALeg1: sAL1,
          scoreBLeg1: sBL1,
          scoreALeg2: sAL2,
          scoreBLeg2: sBL2,
          winner,
        }),
      });
      broadcastSync("DATA_REFRESH");
    } catch (e) {
      console.error("Gagal menyelesaikan match:", e);
    }
  };

  // Global Keyboard Hotkey Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      // Spacebar triggers main action (Mulai Persiapan / Jeda / Lanjut)
      if (e.code === "Space") {
        e.preventDefault();
        handleMainAction();
        return;
      }

      // Hotkey penilaian HANYA bisa dipencet saat sudah masuk ke mode mulai pertandingan
      if (timerPhase !== "match" && timerPhase !== "match_paused") {
        return;
      }

      const pressedKey = e.key.toUpperCase();

      // Check Red rules
      const redRule = customPointRules.find(
        (r) => r.enabled && r.hotkeyRed && r.hotkeyRed.toUpperCase() === pressedKey
      );
      if (redRule) {
        if (isSingle && activeLeg === 2) return;
        e.preventDefault();
        handleScoreDelta("red", redRule.points, redRule.label);
        return;
      }

      // Check Blue rules
      const blueRule = customPointRules.find(
        (r) => r.enabled && r.hotkeyBlue && r.hotkeyBlue.toUpperCase() === pressedKey
      );
      if (blueRule) {
        if (isSingle && activeLeg === 1) return;
        e.preventDefault();
        handleScoreDelta("blue", blueRule.points, blueRule.label);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [match, customPointRules, is2x, activeLeg, isTimerRunning, timerPhase, soundEnabled, finishedCorners]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Reset Pertandingan Seluruhnya ke 0 & Siap Tanding
  const handleResetCurrentMatch = async () => {
    if (!match) return;
    try {
      const res = await fetch(
        `/api/bracket?matchId=${match.id}&clearLogs=${resetWithLogs}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setMatch((prev) =>
          prev
            ? {
                ...prev,
                scoreA: 0,
                scoreB: 0,
                scoreALeg1: 0,
                scoreBLeg1: 0,
                scoreALeg2: 0,
                scoreBLeg2: 0,
                status: "Siap Tanding",
                winner: undefined,
                currentLeg: 1,
              }
            : null
        );
        setIsTimerRunning(false);
        setTimerPhase("idle");
        setTimerSeconds(prepDuration > 0 ? prepDuration : 10);
        setFinishedCorners({ p1Red: "", p1Blue: "", p2Red: "", p2Blue: "" });
        setCornerNotifs({ red: null, blue: null });
        stopAllSounds();

        if (resetWithLogs) {
          setMatchHistory([]);
        } else {
          const nowClock = new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          setMatchHistory((prev) => [
            {
              id: `hist-reset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              timestamp: nowClock,
              timeFormatted: "00:00",
              corner: "system",
              teamName: "ARENA SYSTEM",
              actionLabel: "🔄 Pertandingan Di-reset ke Siap Tanding (Skor kembali ke 0)",
              delta: 0,
              leg: 1,
            },
            ...prev,
          ]);
        }
        broadcastSync("DATA_REFRESH");
        clearLiveTicker();
        showArenaToast({
          kind: "reset_match",
          title: "PERTANDINGAN BERHASIL DIRESET",
          text: `Skor laga ${match.matchLabel} dikembalikan ke 0 PTS • Status Siap Tanding`,
          isPositive: true,
        }, 3200);
      }
    } catch (e) {
      console.error("Gagal reset laga:", e);
      showPointToast("Gagal me-reset laga", false);
    } finally {
      setShowResetMatchModal(false);
    }
  };

  // Helper Renderer untuk Battle Corner Card (Dapat digunakan untuk Putaran 1 & Putaran 2)
  const renderCornerCard = ({
    corner,
    leg,
    teamKey,
    teamName,
    teamCode,
    institution,
    score,
    scoreLabel,
    subTitle,
    isFinished,
    finishTime,
  }: {
    corner: "red" | "blue";
    leg: 1 | 2;
    teamKey: "A" | "B";
    teamName?: string;
    teamCode?: string;
    institution?: string;
    score: number;
    scoreLabel: string;
    subTitle: string;
    isFinished?: boolean;
    finishTime?: string;
  }) => {
    const isCurrentActiveLeg = activeLeg === leg;
    const isRed = corner === "red";
    const isMatchRunningForCard = (timerPhase === "match" || timerPhase === "match_paused") && (!is2x || isCurrentActiveLeg);
    const isScoringLocked = !isMatchRunningForCard || Boolean(isFinished);
    const isWinner =
      match?.status === "Selesai" &&
      (teamKey === "A"
        ? (match.scoreA || 0) > (match.scoreB || 0)
        : (match.scoreB || 0) > (match.scoreA || 0));

    return (
      <div
        className={`p-5 sm:p-6 rounded-3xl border-2 transition-all space-y-4 flex flex-col justify-between ${
          isWinner
            ? isRed
              ? "bg-gradient-to-b from-rose-950/40 via-[#0a172c]/90 to-[#060d1a] border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.3)]"
              : "bg-gradient-to-b from-blue-950/40 via-[#0a172c]/90 to-[#060d1a] border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.3)]"
            : isCurrentActiveLeg
            ? isRed
              ? "bg-gradient-to-b from-rose-950/25 via-[#0a172c]/95 to-[#060d1a] border-rose-500/70 ring-1 ring-rose-500/50 shadow-xl"
              : "bg-gradient-to-b from-blue-950/25 via-[#0a172c]/95 to-[#060d1a] border-blue-500/70 ring-1 ring-blue-500/50 shadow-xl"
            : isRed
            ? "bg-gradient-to-b from-rose-950/15 via-[#0a172c]/80 to-[#060d1a]/90 border-rose-500/30 opacity-90"
            : "bg-gradient-to-b from-blue-950/15 via-[#0a172c]/80 to-[#060d1a]/90 border-blue-500/30 opacity-90"
        }`}
      >
        {/* Header: Sudut Tag & Score box */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-lg border font-mono font-extrabold text-[11px] uppercase inline-flex items-center gap-1.5 shadow-sm ${
                  isRed
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                    : "bg-blue-500/20 text-blue-300 border-blue-500/50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isRed ? "bg-rose-500" : "bg-blue-500"}`} />
                <span>
                  {isRed ? "SUDUT MERAH" : "SUDUT BIRU"}
                  {is2x ? ` • PUTARAN ${leg}${leg === 2 ? " (TUKAR SISI)" : ""}` : ""}
                </span>
              </span>

              {is2x && isCurrentActiveLeg && !isFinished && timerPhase === "match" && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold animate-pulse">
                  🎮 Hotkey Aktif
                </span>
              )}

              {isFinished && (
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 font-mono font-black text-[11px] flex items-center gap-1">
                  🏁 FINISH ({finishTime})
                </span>
              )}
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide truncate">
                {teamName || (isRed ? "Sudut Merah" : "Sudut Biru")}
              </h3>
              {institution && (
                <p className="text-xs text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                  <Building2 className={`w-3.5 h-3.5 ${isRed ? "text-rose-400" : "text-blue-400"}`} />
                  <span>{institution}</span>
                </p>
              )}
              <p className="text-[11px] font-mono text-zinc-500 mt-0.5">{subTitle}</p>
            </div>
          </div>

          {/* Score Box on Top Right */}
          <div className="flex flex-col items-end shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
              {scoreLabel}
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.5"
                value={score}
                disabled={isScoringLocked}
                onChange={(e) =>
                  handleSetExactScore(corner, parseFloat(e.target.value) || 0, leg)
                }
                className={`w-20 px-2 py-1 text-center font-mono text-xl font-black rounded-xl bg-[#060d1a] border focus:outline-none transition-all shadow-inner ${
                  isScoringLocked
                    ? "text-zinc-500 border-zinc-800 cursor-not-allowed opacity-60"
                    : isRed
                    ? "text-amber-400 border-rose-500/50 focus:border-rose-400"
                    : "text-amber-400 border-blue-500/50 focus:border-blue-400"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Buttons Row: Point Rules + Hotkeys + Quick +1/-1 */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-2">
          {isScoringLocked && !isFinished && (
            <div
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono font-bold flex items-center gap-2 ${
                timerPhase === "preparation" ||
                timerPhase === "prep_paused" ||
                timerPhase === "prep_ended" ||
                timerPhase === "countdown"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-zinc-900/90 border-zinc-800 text-zinc-400"
              }`}
            >
              <span>
                {is2x && !isCurrentActiveLeg
                  ? `🔒 Sesi ${leg} Terkunci — Pertandingan sedang di Sesi ${activeLeg}`
                  : timerPhase === "preparation" ||
                    timerPhase === "prep_paused" ||
                    timerPhase === "prep_ended" ||
                    timerPhase === "countdown"
                  ? "🔒 Waktu Persiapan — Poin baru bisa ditambahkan saat Waktu Pertandingan dimulai"
                  : "🔒 Poin Terkunci — Mulai Waktu Pertandingan untuk menambah poin"}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {customPointRules
              .filter((r) => r.enabled)
              .map((rule) => {
                const hotkey = isRed ? rule.hotkeyRed : rule.hotkeyBlue;
                return (
                  <button
                    key={rule.id}
                    type="button"
                    disabled={isScoringLocked}
                    onClick={() => handleScoreDelta(corner, rule.points, rule.label, leg)}
                    className={`px-2.5 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                      isScoringLocked
                        ? "bg-zinc-900/50 border-zinc-800/60 text-zinc-600 opacity-45 cursor-not-allowed"
                        : rule.points > 0
                        ? isRed
                          ? "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300 hover:border-rose-500/60 cursor-pointer"
                          : "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-300 hover:border-blue-500/60 cursor-pointer"
                        : "bg-zinc-900/90 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                    }`}
                  >
                    {isCurrentActiveLeg && hotkey && !isScoringLocked && (
                      <kbd
                        className={`px-1 py-0.5 rounded text-[10px] font-black uppercase shadow-sm ${
                          isRed
                            ? "bg-rose-950 text-rose-300 border border-rose-500/50"
                            : "bg-blue-950 text-blue-300 border border-blue-500/50"
                        }`}
                      >
                        {hotkey}
                      </kbd>
                    )}
                    <span>
                      {rule.points > 0 ? `+${rule.points}` : rule.points} {rule.label}
                    </span>
                  </button>
                );
              })}

            {/* Quick +1 & -1 */}
            <button
              type="button"
              disabled={isScoringLocked}
              onClick={() => handleScoreDelta(corner, 1, "+1 Manual", leg)}
              className={`px-2.5 py-1.5 rounded-xl font-mono font-bold text-xs transition-colors ${
                isScoringLocked
                  ? "bg-zinc-900/50 text-zinc-600 opacity-45 cursor-not-allowed"
                  : "bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
              }`}
            >
              +1
            </button>
            <button
              type="button"
              disabled={isScoringLocked}
              onClick={() => handleScoreDelta(corner, -1, "-1 Manual", leg)}
              className={`px-2.5 py-1.5 rounded-xl font-mono font-bold text-xs transition-colors ${
                isScoringLocked
                  ? "bg-zinc-900/50 text-zinc-600 opacity-45 cursor-not-allowed"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 cursor-pointer"
              }`}
            >
              -1
            </button>
            <button
              type="button"
              disabled={isScoringLocked}
              onClick={() => handleSurrender(corner, leg)}
              className={`ml-auto px-3 py-1.5 rounded-xl border font-mono font-bold text-xs transition-all flex items-center gap-1.5 ${
                isScoringLocked
                  ? "bg-zinc-900/50 border-zinc-800/60 text-zinc-600 opacity-45 cursor-not-allowed"
                  : "bg-amber-500/10 hover:bg-rose-500/20 border-amber-500/40 hover:border-rose-500/60 text-amber-300 hover:text-rose-200 cursor-pointer shadow-sm"
              }`}
              title={`Menyerah — Simpan poin terakhir & catat finish waktu habis (${formatTime((matchLimit > 0 ? matchLimit : 300) * 1000)})`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Menyerah</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const isSingle = match?.teamB === "- (Tanding Tunggal)";
  const winnerResolution = match
    ? resolveMatchWinner({
        scoreA: match.scoreA || 0,
        scoreB: match.scoreB || 0,
        is2xMode: is2x,
        finishedCorners,
        matchLogs: matchHistory
          .filter((item) => item.corner !== "system" && item.actionLabel.toUpperCase().includes("FINISH"))
          .map((item) => ({
            participantName: item.teamName,
            stageLabel: `${item.actionLabel} (Laga ${match.matchLabel} P${item.leg} @${item.timeFormatted})`,
          })),
        teamA: match.teamA,
        teamB: match.teamB,
      })
    : null;
  const winnerTeamName =
    match && (match.winner === "A" ? match.teamA : match.winner === "B" ? match.teamB : null);

  const battleTickerState = (() => {
    const defaultText = (announcement || "").trim() || DEFAULT_TICKER_TEXT;
    if (!match) {
      return {
        text: defaultText,
        mode: "default" as LiveTickerMode,
        syncText: "",
        syncMatchId: "",
        syncMode: "default" as LiveTickerMode,
      };
    }

    if (showWinnerModal || (timerPhase === "finished" && hasSyncedLiveTickerRef.current)) {
      const finishedText = buildMatchFinishedTicker({
        matchLabel: match.matchLabel,
        teamA: match.teamA,
        teamB: match.teamB,
        scoreA: match.scoreA || 0,
        scoreB: match.scoreB || 0,
        winnerName: winnerTeamName || null,
        isSingle,
        finishTimeA: winnerResolution?.teamAFinishFormatted,
        finishTimeB: winnerResolution?.teamBFinishFormatted,
      });
      return {
        text: finishedText,
        mode: "finished" as LiveTickerMode,
        syncText: "",
        syncMatchId: "",
        syncMode: "default" as LiveTickerMode,
      };
    }

    if (is2x && (showLeg1Modal || (activeLeg === 2 && timerPhase === "idle"))) {
      const p1ScoreA = showLeg1Modal ? revisedLeg1ScoreA : (match.scoreALeg1 || 0);
      const p1ScoreB = showLeg1Modal ? revisedLeg1ScoreB : (match.scoreBLeg1 || 0);
      const summaryA = formatTickerScoreSummary(getScoreCategoryBreakdown(1, "A", showLeg1Modal));
      const summaryB = formatTickerScoreSummary(getScoreCategoryBreakdown(1, "B", showLeg1Modal));
      const leg1Text = buildLeg1ResultTicker({
        matchLabel: match.matchLabel,
        teamA: match.teamA,
        teamB: match.teamB,
        scoreALeg1: p1ScoreA,
        scoreBLeg1: p1ScoreB,
        isSingle,
        summaryA,
        summaryB,
        finishTimeA: finishedCorners.p1Red || winnerResolution?.teamALeg1Formatted || "",
        finishTimeB: finishedCorners.p1Blue || winnerResolution?.teamBLeg1Formatted || "",
      });
      return {
        text: leg1Text,
        mode: "leg1_result" as LiveTickerMode,
        syncText: leg1Text,
        syncMatchId: match.id,
        syncMode: "leg1_result" as LiveTickerMode,
      };
    }

    if (timerPhase !== "idle" && timerPhase !== "finished") {
      const welcomeText = buildWelcomeMatchTicker({
        matchLabel: match.matchLabel,
        round: match.round,
        teamA: match.teamA,
        teamB: match.teamB,
        is2x,
        leg: activeLeg,
        isSingle,
      });
      return {
        text: welcomeText,
        mode: "welcome" as LiveTickerMode,
        syncText: welcomeText,
        syncMatchId: match.id,
        syncMode: "welcome" as LiveTickerMode,
      };
    }

    return {
      text: defaultText,
      mode: "default" as LiveTickerMode,
      syncText: "",
      syncMatchId: "",
      syncMode: "default" as LiveTickerMode,
    };
  })();

  const serializedTickerSync = JSON.stringify({
    text: battleTickerState.syncText,
    matchId: battleTickerState.syncMatchId,
    mode: battleTickerState.syncMode,
  });

  useEffect(() => {
    if (!match) return;
    if (lastSyncedTickerRef.current === serializedTickerSync) return;
    if (lastSyncedTickerRef.current === "" && battleTickerState.syncText === "") {
      lastSyncedTickerRef.current = serializedTickerSync;
      return;
    }
    lastSyncedTickerRef.current = serializedTickerSync;
    syncLiveTickerToArena(
      battleTickerState.syncText,
      battleTickerState.syncMatchId,
      battleTickerState.syncMode
    );
  }, [serializedTickerSync, match?.id]);

  useEffect(() => {
    return () => {
      if (hasSyncedLiveTickerRef.current) {
        clearLiveTicker(true);
      }
    };
  }, []);

  if (isLoading || !match || !winnerResolution) {
    return (
      <div className="min-h-screen bg-[#060d1a] flex flex-col items-center justify-center space-y-4">
        <ArenaLogo size="lg" />
        <p className="text-sm font-mono text-zinc-400 animate-pulse">Memuat Arena Pertandingan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060d1a] text-white flex flex-col justify-between selection:bg-cyan-500 selection:text-black relative overflow-x-clip">
      {/* Background Subtle Hex/Diamond Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#00a3ff_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />

      {/* FLOATING ARENA HUD NOTIFICATION (PREMIUM TOAST) */}
      {toastMsg && (
        <div
          key={toastMsg.key}
          className="fixed top-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300"
        >
          {toastMsg.kind === "switch_leg" ? (
            <div className={`px-6 py-4 rounded-3xl border backdrop-blur-2xl shadow-2xl flex items-center gap-4 ${
              toastMsg.leg === 2
                ? "bg-[#0a172c]/95 border-cyan-500/80 shadow-[0_15px_50px_rgba(0,163,255,0.4)]"
                : "bg-[#0a172c]/95 border-amber-500/80 shadow-[0_15px_50px_rgba(245,158,11,0.4)]"
            }`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                toastMsg.leg === 2
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/50"
              }`}>
                {toastMsg.leg === 2 ? (
                  <ArrowLeftRight className="w-6 h-6 stroke-[2.5]" />
                ) : (
                  <RotateCcw className="w-6 h-6 stroke-[2.5]" />
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg ${
                    toastMsg.leg === 2
                      ? "bg-cyan-500 text-zinc-950 font-black shadow-md shadow-cyan-500/20"
                      : "bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20"
                  }`}>
                    {toastMsg.title}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Standby Persiapan Tim
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-white">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 font-mono">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse" />
                    <span>Sudut Merah: <strong className="text-white">{toastMsg.teamA}</strong></span>
                  </span>
                  <span className="text-zinc-500 font-mono text-xs font-black">VS</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-500/40 text-blue-300 font-mono">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse" />
                    <span>Sudut Biru: <strong className="text-white">{toastMsg.teamB}</strong></span>
                  </span>
                </div>
              </div>
            </div>
          ) : toastMsg.kind === "reset_match" ? (
            <div className="px-6 py-4 rounded-3xl bg-zinc-950/95 border-2 border-rose-500/70 shadow-[0_15px_50px_rgba(244,63,94,0.4)] backdrop-blur-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6 stroke-[2.3]" />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-mono font-black text-rose-400 uppercase tracking-widest">
                  {toastMsg.title}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-zinc-200">
                  {toastMsg.text}
                </div>
              </div>
            </div>
          ) : toastMsg.kind === "reset_timer" ? (
            <div className="px-6 py-3.5 rounded-3xl bg-zinc-950/95 border-2 border-amber-500/70 shadow-[0_15px_50px_rgba(245,158,11,0.4)] backdrop-blur-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest">
                  {toastMsg.title}
                </div>
                <div className="text-xs font-semibold text-zinc-200">
                  {toastMsg.text}
                </div>
              </div>
            </div>
          ) : (
            <div className={`px-6 py-3 rounded-2xl border font-mono font-black text-base sm:text-lg shadow-2xl backdrop-blur-xl flex items-center gap-2.5 ${
              toastMsg.isPositive
                ? "bg-emerald-950/90 border-emerald-500/70 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                : "bg-rose-950/90 border-rose-500/70 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.3)]"
            }`}>
              <Zap className="w-5 h-5 fill-current" />
              <span>{toastMsg.text}</span>
            </div>
          )}
        </div>
      )}

      {/* STICKY TOP WRAPPER: Neon Accent + Live Broadcast Ticker + Arena Header */}
      <div className="sticky top-0 z-40">
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-sky-400 to-amber-400" />
        <LiveTickerBar
          text={battleTickerState.text}
          mode={battleTickerState.mode}
        />
        {/* TOP HEADER BAR */}
        <header className="px-4 sm:px-8 py-4 bg-[#060e1c]/95 border-b border-cyan-900/40 flex flex-wrap items-center justify-between gap-4 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-4">
            <Link
              href="/?tab=bracket"
              onClick={() => clearLiveTicker(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0a172c] hover:bg-[#0e2240] text-zinc-300 hover:text-white border border-cyan-900/40 text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Bagan</span>
            </Link>

            <div className="h-6 w-px bg-cyan-900/40 hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-black text-xs border border-cyan-500/40">
                  {match.matchLabel}
                </span>
                <span className="text-xs font-bold text-white tracking-wide">
                  {match.round} • {match.category || "Transporter SMP"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5">

            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              title={soundEnabled ? "Audio Aktif" : "Audio Nonaktif"}
              className="p-2.5 rounded-xl bg-[#0a172c] hover:bg-[#0e2240] border border-cyan-900/40 text-zinc-400 hover:text-white transition-all"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              title="Layar Penuh (F11)"
              className="p-2.5 rounded-xl bg-[#0a172c] hover:bg-[#0e2240] border border-cyan-900/40 text-zinc-400 hover:text-white transition-all"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </header>
      </div>

      {/* MAIN BATTLEFIELD & TIMER CONSOLE */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full flex flex-col justify-between gap-6 z-10">
        {/* CENTER ARENA TIMER / STOPWATCH HUD */}
        <div className="bg-[#0a172c]/95 border-2 border-cyan-900/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center space-y-4">
          {/* Subtle neon glow background behind timer */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-cyan-500/20 to-transparent blur-3xl pointer-events-none" />

          {/* Corner Action Notifications Inside Timer Box Edges (Kiri = Sudut Merah, Kanan = Sudut Biru) */}
          <div className="absolute inset-0 pointer-events-none z-20 !mt-0">
            {(["red", "blue"] as const).map((side) => {
              const notif = cornerNotifs[side];
              if (!notif) return null;
              const isLeft = side === "red";
              const toneClass = notif.isFinish
                ? "bg-amber-500/15 border-amber-400/70 text-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.3)]"
                : notif.isPositive
                ? "bg-emerald-500/15 border-emerald-400/60 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                : "bg-rose-500/15 border-rose-500/60 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.25)]";
              const slideAnim = isLeft ? "slide-in-from-left-3" : "slide-in-from-right-3";

              return (
                <div
                  key={`${side}-${notif.key}`}
                  className={`absolute top-3.5 sm:top-6 ${
                    isLeft ? "left-3.5 sm:left-6" : "right-3.5 sm:right-6"
                  } animate-in fade-in ${slideAnim} duration-200`}
                >
                  <div
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl border backdrop-blur-md font-mono font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 ${toneClass}`}
                  >
                    {isLeft && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] shrink-0" />
                    )}
                    {notif.label === "Menyerah" ? (
                      <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    ) : notif.isFinish ? (
                      <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    ) : notif.isPositive ? (
                      <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{notif.label}</span>
                    {!isLeft && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Phase Badge & Round status */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span
              className={`px-4 py-1 rounded-full text-xs font-mono font-extrabold uppercase tracking-widest border flex items-center gap-2 shadow-md ${
                timerPhase === "preparation"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse"
                  : timerPhase === "prep_paused"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                  : timerPhase === "prep_ended"
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/60 animate-pulse"
                  : timerPhase === "countdown"
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 animate-bounce"
                  : timerPhase === "match"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse"
                  : timerPhase === "match_paused"
                  ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"
                  : timerPhase === "finished"
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/50"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  timerPhase === "match"
                    ? "bg-emerald-400 animate-ping"
                    : timerPhase === "prep_ended"
                    ? "bg-cyan-400 animate-ping"
                    : timerPhase === "countdown"
                    ? "bg-cyan-400 animate-ping"
                    : timerPhase === "preparation"
                    ? "bg-amber-400 animate-ping"
                    : "bg-zinc-500"
                }`}
              />
              <span>
                {timerPhase === "preparation"
                  ? "WAKTU PERSIAPAN (TIM BERSIAP)"
                  : timerPhase === "prep_paused"
                  ? "WAKTU PERSIAPAN (JEDA)"
                  : timerPhase === "prep_ended"
                  ? "PERSIAPAN SELESAI • SIAP MULAI PERTANDINGAN"
                  : timerPhase === "countdown"
                  ? "HITUNG MUNDUR (3-2-1)"
                  : timerPhase === "match"
                  ? "PERTANDINGAN BERLANGSUNG"
                  : timerPhase === "match_paused"
                  ? "PERTANDINGAN JEDA"
                  : timerPhase === "finished"
                  ? "PERTANDINGAN SELESAI"
                  : `STANDBY • WAKTU PERSIAPAN (${prepDuration}s)`}
              </span>
            </span>

            {is2x && (
              <span className="px-3.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold">
                {activeLeg === 1 ? "SESI 1 / PUTARAN 1" : "SESI 2 / PUTARAN 2 (TUKAR SISI)"}
              </span>
            )}
          </div>

          {/* Giant Digital Stopwatch / Timer Display */}
          {timerPhase === "countdown" ? (
            <div className="font-mono text-8xl sm:text-9xl md:text-[10rem] font-black tracking-tight text-cyan-400 drop-shadow-[0_0_40px_rgba(0,163,255,0.6)] select-none animate-bounce">
              {timerSeconds}
            </div>
          ) : timerPhase === "preparation" || timerPhase === "prep_paused" ? (
            <div className="font-mono text-7xl sm:text-8xl md:text-9xl font-black tracking-tight text-white drop-shadow-[0_0_35px_rgba(245,158,11,0.35)] select-none">
              {`${String(Math.floor(timerSeconds / 60)).padStart(2, "0")}:${String(timerSeconds % 60).padStart(2, "0")}`}
            </div>
          ) : (
            <div className="font-mono font-black tracking-tight text-white select-none flex items-baseline justify-center">
              <span className="text-7xl sm:text-8xl md:text-9xl drop-shadow-[0_0_35px_rgba(0,163,255,0.35)]">
                {getStopwatchParts(matchElapsedMs).minutes}:{getStopwatchParts(matchElapsedMs).seconds}
              </span>
              <span className="text-4xl sm:text-5xl md:text-6xl text-cyan-400 font-extrabold ml-1.5 sm:ml-2.5 drop-shadow-[0_0_25px_rgba(0,163,255,0.5)]">
                .{getStopwatchParts(matchElapsedMs).centiseconds}
              </span>
            </div>
          )}

          {/* Timer Control Buttons - Unified Sequential Control (Persiapan -> Sesi Kembali ke Tempat -> Hitung Mundur 3-2-1 -> Pertandingan) */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {/* Tombol Utama Tunggal Berurutan */}
            {timerPhase === "idle" && (
              <button
                type="button"
                onClick={handleMainAction}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-amber-400 text-zinc-950 hover:brightness-110 font-black text-sm sm:text-base flex items-center gap-2.5 transition-all shadow-xl shadow-cyan-500/25 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
                title="Mulai Waktu Persiapan (Mario Kart TV Channel OST)"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Mulai Waktu Persiapan ({prepDuration}s)</span>
              </button>
            )}

            {timerPhase === "preparation" && (
              <button
                type="button"
                onClick={handleMainAction}
                className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm sm:text-base flex items-center gap-2.5 transition-all shadow-xl shadow-amber-500/25 cursor-pointer"
                title="Jeda Waktu Persiapan"
              >
                <Pause className="w-5 h-5 fill-current" />
                <span>Jeda Persiapan</span>
              </button>
            )}

            {timerPhase === "prep_paused" && (
              <button
                type="button"
                onClick={handleMainAction}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:brightness-110 font-black text-sm sm:text-base flex items-center gap-2.5 transition-all shadow-xl shadow-cyan-500/25 cursor-pointer"
                title="Lanjutkan Waktu Persiapan"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Lanjutkan Persiapan</span>
              </button>
            )}

            {timerPhase === "prep_ended" && (
              <button
                type="button"
                onClick={handleMainAction}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-zinc-950 hover:brightness-110 font-black text-sm sm:text-base flex items-center gap-2.5 transition-all shadow-2xl shadow-emerald-500/30 cursor-pointer transform hover:scale-[1.03] active:scale-[0.98] ring-2 ring-emerald-300/60"
                title="Mulai Pertandingan (Langsung Hitung Mundur 3-2-1)"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Mulai Pertandingan</span>
              </button>
            )}

            {timerPhase === "countdown" && (
              <button
                type="button"
                disabled
                className="px-8 py-3.5 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-black text-sm sm:text-base flex items-center gap-2.5 shadow-lg opacity-90 cursor-not-allowed animate-pulse"
              >
                <FastForward className="w-5 h-5 text-cyan-400" />
                <span>Bersiap! Pertandingan Segera Mulai...</span>
              </button>
            )}

            {timerPhase === "match" && (
              <button
                type="button"
                onClick={handleMainAction}
                className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm sm:text-base flex items-center gap-2.5 transition-all shadow-xl shadow-amber-500/25 cursor-pointer"
                title="Jeda Pertandingan"
              >
                <Pause className="w-5 h-5 fill-current" />
                <span>Jeda Pertandingan</span>
              </button>
            )}

            {timerPhase === "match_paused" && (
              <button
                type="button"
                onClick={handleMainAction}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-zinc-950 hover:brightness-110 font-black text-sm sm:text-base flex items-center gap-2.5 transition-all shadow-xl shadow-emerald-500/25 cursor-pointer"
                title="Lanjutkan Pertandingan"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Lanjutkan Pertandingan</span>
              </button>
            )}

            {timerPhase === "finished" && (
              <button
                type="button"
                onClick={handleResetTimer}
                className="px-6 py-3.5 rounded-2xl bg-[#0a172c] hover:bg-[#0e2240] border border-cyan-900/40 text-zinc-300 hover:text-white font-bold text-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Tanding Ulang</span>
              </button>
            )}

            {/* Tombol Reset Waktu */}
            <button
              type="button"
              onClick={handleResetTimer}
              className="px-4 py-3.5 rounded-2xl bg-[#0a172c] hover:bg-[#0e2240] border border-cyan-900/40 text-zinc-400 hover:text-white font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer"
              title="Reset Waktu ke Standby Persiapan"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Waktu</span>
            </button>

            {/* Tombol Reset Pertandingan */}
            <button
              type="button"
              onClick={() => setShowResetMatchModal(true)}
              className="px-4 py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white font-bold text-sm flex items-center gap-2 transition-all cursor-pointer"
              title="Reset Pertandingan & Skor ke 0"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Reset Pertandingan</span>
            </button>

            {/* Tombol Selesai Laga & Kunci Skor */}
            <button
              type="button"
              onClick={() => {
                if (is2x && activeLeg === 1) {
                  handleCompleteLeg1(true);
                } else {
                  handleFinishMatch(true);
                }
              }}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-black text-sm flex items-center gap-2 hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              title={
                is2x && activeLeg === 1
                  ? "Selesaikan Putaran 1 & Buka Tinjauan Log"
                  : "Selesaikan Pertandingan dan kunci skor akhir"
              }
            >
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              <span>Selesai Laga & Kunci Skor</span>
            </button>
          </div>

          <p className="text-[11px] font-mono text-zinc-500">
            Tip Operator: Tekan tombol <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold text-[10px]">SPASI</kbd> di keyboard untuk Kontrol Timer (Mulai Persiapan / Jeda / Lanjut).
          </p>
        </div>

        {/* 2X MAIN SWITCHER BAR & PROGRESS */}
        {is2x && (
          <div className="p-4 sm:p-5 rounded-3xl bg-[#0a172c]/95 border border-cyan-900/40 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            {/* Segmented Control Putaran 1 vs Putaran 2 */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 font-mono font-bold uppercase tracking-wider hidden sm:inline-block">
                Fokus Sesi Laga:
              </span>
              <div className="inline-flex p-1 rounded-2xl bg-[#060d1a]/90 border border-cyan-900/40 gap-1.5 shadow-inner">
                {/* Tab Putaran 1 */}
                <button
                  type="button"
                  onClick={() => handleSwitchLeg(1)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                    activeLeg === 1
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 shadow-md font-black shadow-amber-500/25 scale-[1.02]"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                  }`}
                  title="Pindah fokus hotkey dan stopwatch ke Putaran 1"
                >
                  <span className={`w-2 h-2 rounded-full ${activeLeg === 1 ? "bg-zinc-950 animate-pulse" : "bg-zinc-600"}`} />
                  <span>Putaran 1</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    activeLeg === 1 ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {isSingle ? `${match.scoreALeg1 || 0} PTS` : `${match.scoreALeg1 || 0} - ${match.scoreBLeg1 || 0}`}
                  </span>
                </button>

                {/* Tab Putaran 2 (Tukar Sisi) */}
                <button
                  type="button"
                  onClick={() => handleSwitchLeg(2)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                    activeLeg === 2
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md font-black shadow-cyan-500/25 scale-[1.02]"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                  }`}
                  title="Pindah fokus hotkey dan stopwatch ke Putaran 2 (Tukar Sisi Arena)"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Putaran 2 (Tukar Sisi)</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    activeLeg === 2 ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {isSingle ? `${match.scoreALeg2 || 0} PTS` : `${match.scoreBLeg2 || 0} - ${match.scoreALeg2 || 0}`}
                  </span>
                </button>
              </div>

              {/* Tombol Tinjau & ACC Log Putaran 1 */}
              <button
                type="button"
                onClick={() => {
                  setRevisedLeg1ScoreA(match.scoreALeg1 || 0);
                  setRevisedLeg1ScoreB(match.scoreBLeg1 || 0);
                  setLeg1LogFilter("all");
                  setLeg1RuleAdjustments({ A: {}, B: {} });
                  setShowLeg1Modal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Buka panel tinjau log dan revisi skor Putaran 1"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Tinjau Log Putaran 1</span>
              </button>
            </div>

            {/* Rata-Rata Skor Preview */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-zinc-400">Total Akumulasi:</span>
              <span className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>{match.teamA}:</span>
                <span className="text-amber-400">{match.scoreA} PTS</span>
              </span>
              {!isSingle && (
                <>
                  <span className="text-zinc-600 font-bold">VS</span>
                  <span className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>{match.teamB}:</span>
                    <span className="text-blue-400">{match.scoreB} PTS</span>
                  </span>
                </>
              )}
              {isSingle && (
                <span className="text-zinc-400 text-[11px]">
                  (Rata-rata P1: {match.scoreALeg1 || 0} PTS & P2: {match.scoreALeg2 || 0} PTS)
                </span>
              )}
            </div>
          </div>
        )}

        {/* 4 CARDS CONTAINER: PUTARAN 1 (2 CARDS) + PUTARAN 2 (2 CARDS) */}
        {is2x ? (
          <div className="space-y-6">
            {/* PUTARAN 1 (ATAS) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                  <h3 className="text-xs sm:text-sm font-black font-mono tracking-wider text-amber-300 uppercase flex items-center gap-2">
                    <span>SESI 1 • PUTARAN 1</span>
                    {activeLeg === 1 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold animate-pulse">
                        🎮 Hotkey Stopwatch Aktif
                      </span>
                    )}
                  </h3>
                </div>
                <div className="text-xs font-mono text-zinc-400">
                  {isSingle ? (
                    <>Skor P1: <span className="font-bold text-white">{match.teamA} ({match.scoreALeg1 || 0})</span> (Sudut Merah)</>
                  ) : (
                    <>Skor P1: <span className="font-bold text-white">{match.teamA} ({match.scoreALeg1 || 0})</span> vs <span className="font-bold text-white">{match.teamB} ({match.scoreBLeg1 || 0})</span></>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 relative">
                {!isSingle && (
                  <div className="hidden lg:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-[#060e1c] border-2 border-cyan-800/60 items-center justify-center font-black text-xs text-cyan-400 shadow-[0_0_20px_rgba(0,163,255,0.2)]">
                    VS
                  </div>
                )}
                {/* Card 1: Putaran 1 Sudut Merah (Team A) */}
                {renderCornerCard({
                  corner: "red",
                  leg: 1,
                  teamKey: "A",
                  teamName: match.teamA,
                  teamCode: match.teamACode,
                  institution: instA,
                  score: match.scoreALeg1 || 0,
                  scoreLabel: "SKOR P1",
                  subTitle: isSingle
                    ? `P1: ${match.scoreALeg1 || 0} | P2: ${match.scoreALeg2 || 0} | Total: ${match.scoreA || 0}`
                    : `P1: ${match.scoreALeg1 || 0} | P2: ${match.scoreALeg2 || 0} | Total: ${match.scoreA || 0}`,
                  isFinished: Boolean(finishedCorners.p1Red),
                  finishTime: finishedCorners.p1Red,
                })}
                {/* Card 2: Putaran 1 Sudut Biru (Team B atau Placeholder Tunggal) */}
                {isSingle ? (
                  <div className="p-5 sm:p-6 rounded-3xl border-2 border-dashed border-zinc-800 bg-zinc-950/40 flex flex-col justify-between opacity-60">
                    <div className="space-y-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-300 font-mono text-[11px] font-extrabold uppercase inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500/50" />
                        <span>SUDUT BIRU • PUTARAN 1</span>
                      </span>
                      <h3 className="text-xl font-bold text-zinc-500 italic mt-1">- (Tanding Tunggal)</h3>
                      <p className="text-xs text-zinc-500">Tanpa lawan di Putaran 1 (Jumlah tim ganjil)</p>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-xs text-zinc-500 font-mono text-center">
                      Robot bertanding di Sudut Merah. Setelah Putaran 1 selesai, robot akan tukar sisi ke Sudut Biru di Putaran 2.
                    </div>
                  </div>
                ) : (
                  renderCornerCard({
                    corner: "blue",
                    leg: 1,
                    teamKey: "B",
                    teamName: match.teamB,
                    teamCode: match.teamBCode,
                    institution: instB,
                    score: match.scoreBLeg1 || 0,
                    scoreLabel: "SKOR P1",
                    subTitle: `P1: ${match.scoreBLeg1 || 0} | P2: ${match.scoreBLeg2 || 0} | Total: ${match.scoreB || 0}`,
                    isFinished: Boolean(finishedCorners.p1Blue),
                    finishTime: finishedCorners.p1Blue,
                  })
                )}
              </div>
            </div>

            {/* PUTARAN 2 (TUKAR SISI ARENA) (BAWAH) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(0,163,255,0.6)]" />
                  <h3 className="text-xs sm:text-sm font-black font-mono tracking-wider text-cyan-400 uppercase flex items-center gap-2">
                    <span>SESI 2 • PUTARAN 2 (TUKAR SISI ARENA)</span>
                    {activeLeg === 2 && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold animate-pulse">
                        🎮 Hotkey Stopwatch Aktif
                      </span>
                    )}
                  </h3>
                </div>
                <div className="text-xs font-mono text-zinc-400">
                  {isSingle ? (
                    <>Skor P2: <span className="font-bold text-white">{match.teamA} ({match.scoreALeg2 || 0})</span> (Sudut Biru • Tukar Sisi)</>
                  ) : (
                    <>Skor P2: <span className="font-bold text-white">{match.teamB} ({match.scoreBLeg2 || 0})</span> vs <span className="font-bold text-white">{match.teamA} ({match.scoreALeg2 || 0})</span></>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 relative">
                {!isSingle && (
                  <div className="hidden lg:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-[#060e1c] border-2 border-cyan-800/60 items-center justify-center font-black text-xs text-cyan-400 shadow-[0_0_20px_rgba(0,163,255,0.2)]">
                    VS
                  </div>
                )}
                {/* Card 3: Putaran 2 Sudut Merah (Team B atau Placeholder Tunggal) */}
                {isSingle ? (
                  <div className="p-5 sm:p-6 rounded-3xl border-2 border-dashed border-zinc-800 bg-zinc-950/40 flex flex-col justify-between opacity-60">
                    <div className="space-y-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 font-mono text-[11px] font-extrabold uppercase inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500/50" />
                        <span>SUDUT MERAH • PUTARAN 2 (TUKAR SISI)</span>
                      </span>
                      <h3 className="text-xl font-bold text-zinc-500 italic mt-1">- (Tanding Tunggal)</h3>
                      <p className="text-xs text-zinc-500">Tanpa lawan di Putaran 2 (Sisi ini kosong)</p>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-xs text-zinc-500 font-mono text-center">
                      Robot telah tukar sisi dan bertanding di Sudut Biru pada Putaran 2.
                    </div>
                  </div>
                ) : (
                  renderCornerCard({
                    corner: "red",
                    leg: 2,
                    teamKey: "B",
                    teamName: match.teamB,
                    teamCode: match.teamBCode,
                    institution: instB,
                    score: match.scoreBLeg2 || 0,
                    scoreLabel: "SKOR P2",
                    subTitle: `P1: ${match.scoreBLeg1 || 0} | P2: ${match.scoreBLeg2 || 0} | Total: ${match.scoreB || 0}`,
                    isFinished: Boolean(finishedCorners.p2Red),
                    finishTime: finishedCorners.p2Red,
                  })
                )}
                {/* Card 4: Putaran 2 Sudut Biru (Team A - Sisi Ditukar) */}
                {renderCornerCard({
                  corner: "blue",
                  leg: 2,
                  teamKey: "A",
                  teamName: match.teamA,
                  teamCode: match.teamACode,
                  institution: instA,
                  score: match.scoreALeg2 || 0,
                  scoreLabel: "SKOR P2 (TUKAR SISI)",
                  subTitle: `P1: ${match.scoreALeg1 || 0} | P2: ${match.scoreALeg2 || 0} | Total: ${match.scoreA || 0}`,
                  isFinished: Boolean(finishedCorners.p2Blue),
                  finishTime: finishedCorners.p2Blue,
                })}
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD 1X MAIN (2 CARDS) */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
            {!isSingle && (
              <div className="hidden lg:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-14 h-14 rounded-full bg-[#060e1c] border-4 border-cyan-800/60 items-center justify-center font-black text-sm text-cyan-400 shadow-[0_0_30px_rgba(0,163,255,0.25)]">
                VS
              </div>
            )}
            {renderCornerCard({
              corner: "red",
              leg: 1,
              teamKey: "A",
              teamName: match.teamA,
              teamCode: match.teamACode,
              institution: instA,
              score: match.scoreA || 0,
              scoreLabel: "SKOR PERTANDINGAN",
              subTitle: `Total Skor: ${match.scoreA || 0} PTS`,
              isFinished: Boolean(finishedCorners.p1Red),
              finishTime: finishedCorners.p1Red,
            })}
            {!isSingle &&
              renderCornerCard({
                corner: "blue",
                leg: 1,
                teamKey: "B",
                teamName: match.teamB,
                teamCode: match.teamBCode,
                institution: instB,
                score: match.scoreB || 0,
                scoreLabel: "SKOR PERTANDINGAN",
                subTitle: `Total Skor: ${match.scoreB || 0} PTS`,
                isFinished: Boolean(finishedCorners.p1Blue),
                finishTime: finishedCorners.p1Blue,
              })}
          </div>
        )}

        {/* MATCH HISTORY & AUDIT LOG */}
        <div className="p-6 rounded-3xl bg-[#0a172c]/90 border border-cyan-900/40 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cyan-900/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white font-mono tracking-wide uppercase">
                    Histori Aktivitas & Poin Pertandingan
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-xs font-bold border border-zinc-700">
                    {matchHistory.length} Total Log
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono">
                  {is2x
                    ? "Log aktivitas terpisah rapi per putaran (Putaran 1 & Putaran 2) dengan stopwatch dan jam riil."
                    : "Log aktivitas terpisah rapi per sudut tim dengan waktu stopwatch dan jam riil."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Toggle Split / Unified View */}
              {is2x && (
                <div className="flex items-center bg-[#060d1a] p-1 rounded-xl border border-cyan-900/40 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setHistoryViewMode("split")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      historyViewMode === "split"
                        ? "bg-cyan-500 text-zinc-950 shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Dua Kolom Terpisah (P1 & P2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryViewMode("unified")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      historyViewMode === "unified"
                        ? "bg-zinc-800 text-white shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Gabungan Kronologis
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowResetMatchModal(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Reset Skor Pertandingan & Histori"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset Laga</span>
              </button>

              {matchHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMatchHistory([])}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Tampilan Log</span>
                </button>
              )}
            </div>
          </div>

          {matchHistory.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 font-mono text-xs space-y-1">
              <Clock className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
              <p>Belum ada aktivitas poin tercatat.</p>
              <p className="text-zinc-600">
                Aktivitas akan otomatis tercatat saat hotkey keyboard ditekan atau tombol poin diklik.
              </p>
            </div>
          ) : historyViewMode === "split" ? (
            /* TAMPILAN TERPISAH (DUA KOLOM) */
            is2x ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* KOLOM KIRI: PUTARAN 1 */}
                <div className="bg-[#060d1a]/80 border border-amber-500/30 rounded-2xl p-4 flex flex-col space-y-3 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                      <h4 className="font-mono font-black text-amber-300 text-sm tracking-wide">
                        SESI 1 • LOG PUTARAN 1
                      </h4>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold">
                        {p1History.length} Log
                      </span>
                    </div>

                    {/* Team Filter Pills */}
                    <div className="flex items-center gap-1 text-[11px] font-mono">
                      <button
                        type="button"
                        onClick={() => setP1TeamFilter("all")}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          p1TeamFilter === "all"
                            ? "bg-amber-400 text-zinc-950 font-bold shadow"
                            : "bg-zinc-900 text-zinc-400 hover:text-white"
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setP1TeamFilter("A")}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          p1TeamFilter === "A"
                            ? "bg-rose-500 text-white font-bold shadow"
                            : "bg-zinc-900 text-rose-300 hover:bg-rose-950"
                        }`}
                      >
                        🔴 {match.teamA}
                      </button>
                      <button
                        type="button"
                        onClick={() => setP1TeamFilter("B")}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          p1TeamFilter === "B"
                            ? "bg-blue-500 text-white font-bold shadow"
                            : "bg-zinc-900 text-blue-300 hover:bg-blue-950"
                        }`}
                      >
                        🔵 {match.teamB}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1 font-mono text-xs divide-y divide-zinc-800/50 flex-1">
                    {p1Filtered.length === 0 ? (
                      <div className="py-8 text-center text-zinc-500 space-y-1">
                        <Clock className="w-5 h-5 mx-auto text-zinc-600 mb-1" />
                        <p>Belum ada aktivitas di Putaran 1.</p>
                      </div>
                    ) : (
                      p1Filtered.map((item) => (
                        <div
                          key={item.id}
                          className="pt-2 first:pt-0 flex flex-wrap items-center justify-between gap-3 hover:bg-zinc-800/30 p-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black font-mono text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              {item.timeFormatted}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-mono">
                              {item.timestamp}
                            </span>
                            {item.corner === "red" ? (
                              <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold text-[11px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                MERAH • {item.teamName}
                              </span>
                            ) : item.corner === "blue" ? (
                              <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 font-bold text-[11px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                BIRU • {item.teamName}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-[11px]">
                                SYSTEM
                              </span>
                            )}
                            <span className="text-zinc-200 font-medium">
                              {item.actionLabel}
                            </span>
                          </div>
                          {item.delta !== 0 && (
                            <span
                              className={`px-2.5 py-0.5 rounded-lg font-black text-xs font-mono border shrink-0 ${
                                item.delta > 0
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                              }`}
                            >
                              {item.delta > 0 ? `+${item.delta}` : item.delta} PTS
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* KOLOM KANAN: PUTARAN 2 (TUKAR SISI) */}
                <div className="bg-[#060d1a]/80 border border-cyan-500/30 rounded-2xl p-4 flex flex-col space-y-3 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(0,163,255,0.6)]" />
                      <h4 className="font-mono font-black text-cyan-400 text-sm tracking-wide">
                        SESI 2 • LOG PUTARAN 2 (TUKAR SISI)
                      </h4>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-bold">
                        {p2History.length} Log
                      </span>
                    </div>

                    {/* Team Filter Pills */}
                    <div className="flex items-center gap-1 text-[11px] font-mono">
                      <button
                        type="button"
                        onClick={() => setP2TeamFilter("all")}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          p2TeamFilter === "all"
                            ? "bg-cyan-500 text-zinc-950 font-bold shadow"
                            : "bg-zinc-900 text-zinc-400 hover:text-white"
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setP2TeamFilter("B")}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          p2TeamFilter === "B"
                            ? "bg-rose-500 text-white font-bold shadow"
                            : "bg-zinc-900 text-rose-300 hover:bg-rose-950"
                        }`}
                      >
                        🔴 {match.teamB}
                      </button>
                      <button
                        type="button"
                        onClick={() => setP2TeamFilter("A")}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          p2TeamFilter === "A"
                            ? "bg-blue-500 text-white font-bold shadow"
                            : "bg-zinc-900 text-blue-300 hover:bg-blue-950"
                        }`}
                      >
                        🔵 {match.teamA}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1 font-mono text-xs divide-y divide-zinc-800/50 flex-1">
                    {p2Filtered.length === 0 ? (
                      <div className="py-8 text-center text-zinc-500 space-y-1">
                        <Clock className="w-5 h-5 mx-auto text-zinc-600 mb-1" />
                        <p>Belum ada aktivitas di Putaran 2.</p>
                      </div>
                    ) : (
                      p2Filtered.map((item) => (
                        <div
                          key={item.id}
                          className="pt-2 first:pt-0 flex flex-wrap items-center justify-between gap-3 hover:bg-zinc-800/30 p-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black font-mono text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              {item.timeFormatted}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-mono">
                              {item.timestamp}
                            </span>
                            {item.corner === "red" ? (
                              <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold text-[11px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                MERAH • {item.teamName}
                              </span>
                            ) : item.corner === "blue" ? (
                              <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 font-bold text-[11px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                BIRU • {item.teamName}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-[11px]">
                                SYSTEM
                              </span>
                            )}
                            <span className="text-zinc-200 font-medium">
                              {item.actionLabel}
                            </span>
                          </div>
                          {item.delta !== 0 && (
                            <span
                              className={`px-2.5 py-0.5 rounded-lg font-black text-xs font-mono border shrink-0 ${
                                item.delta > 0
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                              }`}
                            >
                              {item.delta > 0 ? `+${item.delta}` : item.delta} PTS
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* DUA KOLOM PER TIM PADA 1X MAIN */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* TIM A (MERAH) */}
                <div className="bg-zinc-950/70 border border-rose-500/30 rounded-2xl p-4 flex flex-col space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                    <span className="font-mono font-black text-rose-400 text-sm tracking-wide">
                      🔴 SUDUT MERAH • {match.teamA}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-mono font-bold">
                      {matchHistory.filter((i) => i.corner === "red" || i.teamName === match.teamA).length} Log
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1 font-mono text-xs divide-y divide-zinc-800/50 flex-1">
                    {matchHistory
                      .filter((i) => i.corner === "red" || i.teamName === match.teamA)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="pt-2 first:pt-0 flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-zinc-800/30"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[11px]">
                              {item.timeFormatted}
                            </span>
                            <span className="text-zinc-300">{item.actionLabel}</span>
                          </div>
                          <span className={`font-mono font-bold ${item.delta > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {item.delta > 0 ? `+${item.delta}` : item.delta} PTS
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* TIM B (BIRU) */}
                <div className="bg-zinc-950/70 border border-blue-500/30 rounded-2xl p-4 flex flex-col space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                    <span className="font-mono font-black text-blue-400 text-sm tracking-wide">
                      🔵 SUDUT BIRU • {match.teamB}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[11px] font-mono font-bold">
                      {matchHistory.filter((i) => i.corner === "blue" || i.teamName === match.teamB).length} Log
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1 font-mono text-xs divide-y divide-zinc-800/50 flex-1">
                    {matchHistory
                      .filter((i) => i.corner === "blue" || i.teamName === match.teamB)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="pt-2 first:pt-0 flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-zinc-800/30"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[11px]">
                              {item.timeFormatted}
                            </span>
                            <span className="text-zinc-300">{item.actionLabel}</span>
                          </div>
                          <span className={`font-mono font-bold ${item.delta > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {item.delta > 0 ? `+${item.delta}` : item.delta} PTS
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )
          ) : (
            /* TAMPILAN GABUNGAN KRONOLOGIS */
            <div className="max-h-72 overflow-y-auto space-y-2 pr-2 font-mono text-xs divide-y divide-zinc-800/50">
              {matchHistory.map((item) => (
                <div
                  key={item.id}
                  className="pt-2 first:pt-0 flex flex-wrap items-center justify-between gap-3 hover:bg-zinc-800/30 p-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black font-mono text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {item.timeFormatted}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {item.timestamp}
                      </span>
                    </div>

                    {item.corner === "red" ? (
                      <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold text-[11px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        MERAH • {item.teamName}
                      </span>
                    ) : item.corner === "blue" ? (
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 font-bold text-[11px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        BIRU • {item.teamName}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-[11px]">
                        SYSTEM
                      </span>
                    )}

                    {is2x && (
                      <span className="text-[10px] text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                        P{item.leg}
                      </span>
                    )}

                    <span className="text-zinc-200 font-medium">
                      {item.actionLabel}
                    </span>
                  </div>

                  {item.delta !== 0 && (
                    <span
                      className={`px-2.5 py-0.5 rounded-lg font-black text-xs font-mono border shrink-0 ${
                        item.delta > 0
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      }`}
                    >
                      {item.delta > 0 ? `+${item.delta}` : item.delta} PTS
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* FOOTER BAR */}
      <footer className="px-6 py-3 bg-[#060e1c] border-t border-cyan-900/40 flex flex-wrap items-center justify-between text-xs text-zinc-500 font-mono">
        <div className="flex items-center gap-3">
          <span>NEXT ARENA COMPETITION SYSTEM</span>
          <span>•</span>
          <span className="text-cyan-400">{match.matchLabel}</span>
        </div>
        <div>
          Status: <strong className="text-zinc-300">{match.status}</strong>
        </div>
      </footer>

      {/* MODAL TRANSISI PUTARAN 1 KE PUTARAN 2 (TINJAU & REVISI LOG SEBELUM ACC) */}
      {showLeg1Modal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#0a172c] border-2 border-cyan-500/80 rounded-3xl p-6 sm:p-8 max-w-3xl w-full text-center space-y-5 shadow-[0_0_80px_rgba(0,163,255,0.35)] animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 via-sky-400 to-amber-400 flex items-center justify-center text-zinc-950 shadow-lg shadow-cyan-500/25 shrink-0">
                  <ClipboardCheck className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-400 block">
                    SESI TINJAUAN RESMI • 2X MAIN (TUKAR SISI)
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Rekap &amp; Verifikasi Log Putaran 1
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLeg1Modal(false)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Tutup (Belum ACC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 text-left -mt-2">
              Periksa riwayat poin dan lakukan revisi skor di bawah jika ada kesalahan penilaian sebelum melanjutkan ke Putaran 2.
            </p>

            {/* Rekap & Revisi Skor Putaran 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {/* TIM A (SUDUT MERAH DI PUTARAN 1) */}
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-rose-400 font-bold uppercase tracking-wider">
                    🔴 SUDUT MERAH (PUTARAN 1)
                  </span>
                  {finishedCorners.p1Red ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      Finish: {finishedCorners.p1Red}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      Waktu Habis
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-base font-black text-white truncate">{match.teamA}</h4>
                  <p className="text-xs text-zinc-400 truncate">{instA || "Tim A"}</p>
                </div>

                {/* Score Controls */}
                <div className="pt-2 border-t border-rose-500/20 flex flex-col gap-2">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                    Revisi Skor Putaran 1:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRevisedLeg1ScoreA((prev) => Math.max(0, Number((prev - 5).toFixed(2))))}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevisedLeg1ScoreA((prev) => Math.max(0, Number((prev - 1).toFixed(2))))}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      -1
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      value={revisedLeg1ScoreA}
                      onChange={(e) => setRevisedLeg1ScoreA(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-24 px-2 py-1.5 text-center font-mono text-xl font-black rounded-xl bg-zinc-950 border border-rose-500/50 text-amber-400 focus:outline-none focus:border-rose-400"
                    />
                    <button
                      type="button"
                      onClick={() => setRevisedLeg1ScoreA((prev) => Number((prev + 1).toFixed(2)))}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevisedLeg1ScoreA((prev) => Number((prev + 5).toFixed(2)))}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      +5
                    </button>
                  </div>
                  {revisedLeg1ScoreA !== (match.scoreALeg1 || 0) && (
                    <span className="text-[10px] text-amber-400">
                      *Skor direvisi dari {match.scoreALeg1 || 0} PTS
                    </span>
                  )}
                </div>

                {renderLeg1CategoryBreakdown("A")}
              </div>

              {/* TIM B (SUDUT BIRU DI PUTARAN 1) */}
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-blue-400 font-bold uppercase tracking-wider">
                    🔵 SUDUT BIRU (PUTARAN 1)
                  </span>
                  {finishedCorners.p1Blue ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      Finish: {finishedCorners.p1Blue}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      Waktu Habis
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-base font-black text-white truncate">{match.teamB}</h4>
                  <p className="text-xs text-zinc-400 truncate">{instB || "Tim B"}</p>
                </div>

                {/* Score Controls */}
                <div className="pt-2 border-t border-blue-500/20 flex flex-col gap-2">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                    Revisi Skor Putaran 1:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRevisedLeg1ScoreB((prev) => Math.max(0, Number((prev - 5).toFixed(2))))}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevisedLeg1ScoreB((prev) => Math.max(0, Number((prev - 1).toFixed(2))))}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      -1
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      value={revisedLeg1ScoreB}
                      onChange={(e) => setRevisedLeg1ScoreB(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-24 px-2 py-1.5 text-center font-mono text-xl font-black rounded-xl bg-zinc-950 border border-blue-500/50 text-amber-400 focus:outline-none focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => setRevisedLeg1ScoreB((prev) => Number((prev + 1).toFixed(2)))}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevisedLeg1ScoreB((prev) => Number((prev + 5).toFixed(2)))}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      +5
                    </button>
                  </div>
                  {revisedLeg1ScoreB !== (match.scoreBLeg1 || 0) && (
                    <span className="text-[10px] text-amber-400">
                      *Skor direvisi dari {match.scoreBLeg1 || 0} PTS
                    </span>
                  )}
                </div>

                {renderLeg1CategoryBreakdown("B")}
              </div>
            </div>

            {/* Tab Log Riwayat Putaran 1 */}
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-left space-y-3 font-mono">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Log Aktivitas Putaran 1 ({p1History.length} Event):
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setLeg1LogFilter("all")}
                    className={`px-2 py-0.5 rounded-md cursor-pointer ${
                      leg1LogFilter === "all" ? "bg-cyan-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Semua ({p1History.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeg1LogFilter("A")}
                    className={`px-2 py-0.5 rounded-md cursor-pointer ${
                      leg1LogFilter === "A" ? "bg-rose-500 text-white font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {match.teamA} ({p1History.filter((i) => i.teamName === match.teamA || i.corner === "red").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeg1LogFilter("B")}
                    className={`px-2 py-0.5 rounded-md cursor-pointer ${
                      leg1LogFilter === "B" ? "bg-blue-500 text-white font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {match.teamB} ({p1History.filter((i) => i.teamName === match.teamB || i.corner === "blue").length})
                  </button>
                </div>
              </div>

              {/* Log List */}
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 divide-y divide-zinc-900 text-xs">
                {(() => {
                  const filteredLogs = p1History.filter((item) => {
                    if (leg1LogFilter === "A") return item.teamName === match.teamA || item.corner === "red";
                    if (leg1LogFilter === "B") return item.teamName === match.teamB || item.corner === "blue";
                    return true;
                  });

                  if (filteredLogs.length === 0) {
                    return (
                      <p className="text-xs text-zinc-500 py-4 text-center">
                        Belum ada aktivitas poin pada Putaran 1
                      </p>
                    );
                  }

                  return filteredLogs.map((item) => (
                    <div
                      key={item.id}
                      className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 hover:bg-zinc-900/60 p-1.5 rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-amber-300 font-mono text-[10px] shrink-0">
                          {item.timeFormatted}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            item.corner === "red"
                              ? "bg-rose-500"
                              : item.corner === "blue"
                              ? "bg-blue-500"
                              : "bg-zinc-500"
                          }`}
                        />
                        <span className="text-zinc-300 text-[11px] truncate">
                          <strong className="text-white mr-1.5">{item.teamName}:</strong>
                          {item.actionLabel}
                        </span>
                      </div>
                      <span
                        className={`font-mono text-xs font-bold shrink-0 ${
                          item.delta > 0
                            ? "text-emerald-400"
                            : item.delta < 0
                            ? "text-rose-400"
                            : "text-zinc-400"
                        }`}
                      >
                        {item.delta > 0 ? `+${item.delta}` : item.delta !== 0 ? item.delta : ""} PTS
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Info Posisi Putaran 2 (Tukar Sisi Arena) */}
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-left space-y-1.5 font-mono text-xs">
              <span className="text-cyan-400 font-black uppercase text-[11px] block">
                🔁 Posisi Baru Setelah ACC (Putaran 2 Tukar Sisi):
              </span>
              <div className="grid grid-cols-2 gap-2 text-zinc-300">
                <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <span className="text-[10px] text-rose-400 block font-bold">🔴 SUDUT MERAH:</span>
                  <strong className="text-white text-xs truncate block">{match.teamB}</strong>
                </div>
                <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <span className="text-[10px] text-blue-400 block font-bold">🔵 SUDUT BIRU:</span>
                  <strong className="text-white text-xs truncate block">{match.teamA}</strong>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 pt-1">
                ⏱️ <em>Catatan:</em> Timer Putaran 2 akan dalam status <strong>STOP / IDLE</strong>. Pertandingan tidak langsung berjalan otomatis sampai Anda menekan tombol Mulai.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLeg1Modal(false)}
                className="w-full sm:w-1/3 py-3.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs font-mono transition-all cursor-pointer"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={handleConfirmAccLeg1}
                className="w-full sm:w-2/3 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-zinc-950 font-black text-sm hover:brightness-110 shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>Lanjut</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WINNER CELEBRATION MODAL */}
      {showWinnerModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0a172c] border-2 border-cyan-500/80 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[92vh] overflow-y-auto text-center space-y-5 shadow-[0_0_80px_rgba(0,163,255,0.4)] animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 via-sky-400 to-amber-400 flex items-center justify-center text-zinc-950 shadow-xl shadow-cyan-500/30 shrink-0">
                <Trophy className="w-8 h-8 fill-current" />
              </div>
              <div className="text-left space-y-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-cyan-400 block">
                  HASIL RESMI PERTANDINGAN
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {winnerTeamName ? (
                    <>
                      <span className="text-amber-400">{winnerTeamName}</span> MENANG!
                    </>
                  ) : (
                    "PERTANDINGAN SERI!"
                  )}
                </h2>
                <p className="text-xs text-zinc-400">
                  {winnerResolution.decidedBy === "finish_time" && winnerTeamName
                    ? `Poin sama (${match.scoreA} - ${match.scoreB}) — ${winnerTeamName} menang lewat waktu finish lebih cepat!`
                    : is2x
                    ? "Nilai akhir dihitung dari rata-rata Putaran 1 & Putaran 2."
                    : "Skor resmi telah terkunci dan peringkat klasemen diperbarui."}
                </p>
              </div>
            </div>

            {/* Score Summary + Final Average Box */}
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-4 font-mono">
              <div className={`grid gap-3 text-left ${isSingle ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                {(
                  [
                    {
                      key: "A" as const,
                      name: match.teamA,
                      leg1: match.scoreALeg1 || 0,
                      leg2: match.scoreALeg2 || 0,
                      leg1Time: winnerResolution.teamALeg1Formatted,
                      leg2Time: winnerResolution.teamALeg2Formatted,
                      finalScore: match.scoreA || 0,
                      finishTimeFormatted: winnerResolution.teamAFinishFormatted,
                      label: is2x ? "Tim A" : "Sudut Merah",
                      accentBorder: "border-rose-500/30 bg-rose-500/5",
                      accentText: "text-rose-400",
                    },
                    ...(!isSingle
                      ? [
                          {
                            key: "B" as const,
                            name: match.teamB,
                            leg1: match.scoreBLeg1 || 0,
                            leg2: match.scoreBLeg2 || 0,
                            leg1Time: winnerResolution.teamBLeg1Formatted,
                            leg2Time: winnerResolution.teamBLeg2Formatted,
                            finalScore: match.scoreB || 0,
                            finishTimeFormatted: winnerResolution.teamBFinishFormatted,
                            label: is2x ? "Tim B" : "Sudut Biru",
                            accentBorder: "border-blue-500/30 bg-blue-500/5",
                            accentText: "text-blue-400",
                          },
                        ]
                      : []),
                  ]
                ).map((teamInfo) => {
                  const rows = getScoreCategoryBreakdown(
                    is2x ? winnerBreakdownLeg : "all",
                    teamInfo.key
                  );
                  return (
                    <div
                      key={teamInfo.key}
                      className={`p-3.5 rounded-2xl border space-y-3 ${teamInfo.accentBorder}`}
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
                        <div className="min-w-0">
                          <span className={`text-[10px] uppercase font-bold block ${teamInfo.accentText}`}>
                            {teamInfo.label}
                          </span>
                          <span className="text-sm font-black text-white block truncate">
                            {teamInfo.name}
                          </span>
                        </div>
                        {!is2x ? (
                          <div className="text-right shrink-0">
                            <span className="text-[9px] uppercase text-zinc-400 block">
                              Nilai Akhir
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-amber-400">
                              {teamInfo.finalScore} PTS
                            </span>
                            {teamInfo.finishTimeFormatted && (
                              <span className="block text-[10px] text-emerald-300 font-bold mt-0.5">
                                ⏱ Finish: {teamInfo.finishTimeFormatted}
                              </span>
                            )}
                          </div>
                        ) : (
                          teamInfo.finishTimeFormatted && (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold shrink-0">
                              ⏱ Tercepat: {teamInfo.finishTimeFormatted}
                            </span>
                          )
                        )}
                      </div>

                      {/* Ringkasan Besar Skor Tiap Putaran & Rata-Rata Akhir (2x Main) */}
                      {is2x && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-center">
                            <span className="text-[9px] uppercase text-zinc-400 font-bold block">
                              Putaran 1
                            </span>
                            <span className="text-base sm:text-lg font-black text-white block leading-tight mt-0.5">
                              {teamInfo.leg1}
                            </span>
                            <span className="text-[9px] text-zinc-500 block">
                              {teamInfo.leg1Time ? `⏱ ${teamInfo.leg1Time}` : "PTS"}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-zinc-900/90 border border-cyan-500/30 text-center">
                            <span className="text-[9px] uppercase text-cyan-300 font-bold block">
                              Putaran 2
                            </span>
                            <span className="text-base sm:text-lg font-black text-cyan-300 block leading-tight mt-0.5">
                              {teamInfo.leg2}
                            </span>
                            <span className="text-[9px] text-cyan-400/70 block">
                              {teamInfo.leg2Time ? `⏱ ${teamInfo.leg2Time}` : "PTS"}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/40 text-center">
                            <span className="text-[9px] uppercase text-amber-300 font-bold block leading-tight">
                              Nilai Akhir (Rata-Rata)
                            </span>
                            <span className="text-base sm:text-lg font-black text-amber-400 block leading-tight mt-0.5">
                              {teamInfo.finalScore}
                            </span>
                            <span className="text-[9px] text-amber-300/80 block">PTS</span>
                          </div>
                        </div>
                      )}

                      {/* Rincian Per Kategori Skor (Point, Cekpoint, Finish, Bonus, Retry) */}
                      <div className="space-y-1">
                        {rows.map((row) => {
                          const subtotalText =
                            row.totalPts > 0 ? `+${row.totalPts}` : `${row.totalPts}`;
                          return (
                            <div
                              key={row.key}
                              className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-zinc-950/60 border border-zinc-800/70 text-[11px]"
                            >
                              <span className="font-bold text-zinc-200">{row.label}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px]">
                                  {row.count}x
                                </span>
                                <span
                                  className={`min-w-[52px] text-right font-black ${
                                    row.totalPts > 0
                                      ? "text-emerald-400"
                                      : row.totalPts < 0
                                      ? "text-rose-400"
                                      : "text-zinc-500"
                                  }`}
                                >
                                  {subtotalText} PTS
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {is2x && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                  <span className="text-zinc-400 font-bold">
                    Tampilan Rincian Per Skor:
                  </span>
                  <div className="inline-flex p-1 rounded-xl bg-zinc-900 border border-zinc-800 gap-1">
                    {(
                      [
                        { id: 2 as const, label: "Putaran 2" },
                        { id: 1 as const, label: "Putaran 1" },
                        { id: "all" as const, label: "Gabungan" },
                      ]
                    ).map((tab) => (
                      <button
                        key={String(tab.id)}
                        type="button"
                        onClick={() => setWinnerBreakdownLeg(tab.id)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                          winnerBreakdownLeg === tab.id
                            ? "bg-cyan-500 text-zinc-950"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-1">
              <Link
                href="/?tab=bracket"
                onClick={() => clearLiveTicker(true)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 text-zinc-950 font-black text-xs sm:text-sm hover:brightness-110 shadow-lg shadow-cyan-500/25 text-center flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Kembali ke Bagan</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESET PERTANDINGAN */}
      {showResetMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0a172c] border-2 border-rose-500/40 rounded-3xl shadow-[0_0_60px_rgba(244,63,94,0.3)] overflow-hidden p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                <RotateCcw className="w-6 h-6 stroke-[2.3]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-wide">
                  Reset Pertandingan {match.matchLabel}?
                </h3>
                <p className="text-xs font-mono text-zinc-400 mt-0.5">
                  {match.teamA} vs {match.teamB} • {match.round}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 space-y-3 text-xs text-zinc-300">
              <p className="leading-relaxed">
                Skor seluruh putaran akan dikembalikan ke <strong className="text-rose-400 font-mono font-bold">0 PTS</strong>, status laga kembali ke <strong className="text-emerald-400 font-bold">"Siap Tanding"</strong>, dan stopwatch kembali ke standby persiapan.
              </p>
              <label className="flex items-center gap-3 pt-3 border-t border-zinc-800/80 cursor-pointer text-zinc-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={resetWithLogs}
                  onChange={(e) => setResetWithLogs(e.target.checked)}
                  className="w-4 h-4 rounded accent-rose-500 cursor-pointer"
                />
                <span className="font-semibold text-zinc-300">
                  Bersihkan juga seluruh catatan riwayat poin laga ini
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetMatchModal(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetCurrentMatch}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ya, Reset Pertandingan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Participant,
  TournamentStage,
  getParticipantStageRawScore,
  calculateParticipantScoreInStage,
  resolveStageIndex,
} from "@/data/mockCompetition";
import {
  Trophy,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  X,
  Crown,
  Layers,
} from "lucide-react";
import {
  FastestFinishEntry,
  getParticipantFastestFinishMs,
} from "@/lib/tieBreaker";

interface ViewRankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  stages: TournamentStage[];
  activeRound?: string;
  roundTitle?: string;
  initialStage?: number | "all";
  fastestFinishMap?: Record<string, FastestFinishEntry>;
}

export function ViewRankingModal({
  isOpen,
  onClose,
  participants,
  stages,
  activeRound = "babak1",
  roundTitle = "KLASEMEN PERTANDINGAN",
  initialStage,
  fastestFinishMap = {},
}: ViewRankingModalProps) {
  const [isAutoScrollActive, setIsAutoScrollActive] = useState<boolean>(true);
  const [isManualScrollPaused, setIsManualScrollPaused] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");

  // Default stage resolution: use initialStage if provided, else resolve activeRound index or 0
  const defaultStageIdx = React.useMemo(() => {
    if (initialStage !== undefined) return initialStage;
    if (!stages || stages.length === 0) return "all";
    return resolveStageIndex(activeRound, stages);
  }, [initialStage, activeRound, stages]);

  const [selectedStage, setSelectedStage] = useState<number | "all">(defaultStageIdx);

  // Sync selected stage whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedStage(defaultStageIdx);
    }
  }, [isOpen, defaultStageIdx]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollDirectionRef = useRef<"down" | "up">("down");
  const userScrollDirectionRef = useRef<"down" | "up">("down");
  const scrollPosRef = useRef<number>(0);
  const edgePauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userResumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedAtEdgeRef = useRef<boolean>(false);
  const isUserInteractingRef = useRef<boolean>(false);
  const isMouseDownRef = useRef<boolean>(false);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const lastUserScrollTopRef = useRef<number>(0);

  // Extract unique categories
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    participants.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["Semua", ...Array.from(set)];
  }, [participants]);

  // Current active stage object when a specific round is selected
  const currentStageObj = React.useMemo(() => {
    if (typeof selectedStage === "number" && stages[selectedStage]) {
      return stages[selectedStage];
    }
    return null;
  }, [selectedStage, stages]);

  // Filter participants by category and stage, and sort strictly by stage/global points descending
  const rankedParticipants = React.useMemo(() => {
    const isAll = selectedStage === "all" || currentStageObj === null;

    // 1. Filter by category
    let pool =
      selectedCategory === "Semua"
        ? [...participants]
        : participants.filter((p) => p.category === selectedCategory);

    // 2. Filter by stage qualification if viewing a specific round > 0
    if (!isAll && typeof selectedStage === "number" && selectedStage > 0) {
      pool = pool.filter((p) => {
        const hasAdvanced = (p.currentStageIdx ?? 0) >= selectedStage;
        const stageRaw = getParticipantStageRawScore(
          p.scores,
          selectedStage,
          currentStageObj || undefined
        );
        return hasAdvanced || stageRaw > 0;
      });
    }

    // 3. Map with stage-specific score & raw score
    const withScores = pool.map((p) => {
      const stageRaw = isAll
        ? (p.scores?.babak1 || 0) + (p.scores?.babak2 || 0) + (p.scores?.babak3 || 0)
        : getParticipantStageRawScore(
            p.scores,
            selectedStage as number,
            currentStageObj || undefined
          );

      const stageScore = isAll
        ? (p.totalPoints ||
            calculateParticipantScoreInStage(
              p.scores,
              stages.length > 0 ? stages.length - 1 : 0,
              stages
            ))
        : calculateParticipantScoreInStage(p.scores, selectedStage as number, stages);

      return {
        ...p,
        stageRawScore: stageRaw,
        displayPoints: stageScore,
      };
    });

    // 4. Sort participants descending by display points, then raw score, then fastest finish time, then name
    return withScores.sort((a, b) => {
      if (b.displayPoints !== a.displayPoints) {
        return b.displayPoints - a.displayPoints;
      }
      if (b.stageRawScore !== a.stageRawScore) {
        return b.stageRawScore - a.stageRawScore;
      }
      const finishA = getParticipantFastestFinishMs(a.name, fastestFinishMap);
      const finishB = getParticipantFastestFinishMs(b.name, fastestFinishMap);
      if (finishA !== finishB) {
        return finishA - finishB;
      }
      return a.name.localeCompare(b.name);
    });
  }, [participants, selectedCategory, selectedStage, currentStageObj, stages, fastestFinishMap]);

  // Handle ESC key to exit & spacebar to toggle auto-scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === " " || e.code === "Space") {
        // Spacebar toggles auto-scroll pause/play
        e.preventDefault();
        setIsAutoScrollActive((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Toggle fullscreen mode
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

  // Reset scroll position when modal opens, category changes, or round tab switches
  useEffect(() => {
    if (isOpen) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      scrollPosRef.current = 0;
      scrollDirectionRef.current = "down";
      userScrollDirectionRef.current = "down";
      isPausedAtEdgeRef.current = false;
      isUserInteractingRef.current = false;
      setIsManualScrollPaused(false);
      isMouseDownRef.current = false;
      isProgrammaticScrollRef.current = false;
      lastUserScrollTopRef.current = 0;
      if (edgePauseTimeoutRef.current) clearTimeout(edgePauseTimeoutRef.current);
      if (userResumeTimeoutRef.current) clearTimeout(userResumeTimeoutRef.current);
    }
  }, [isOpen, selectedCategory, selectedStage]);

  // Auto-scroll loop with smooth pause at top & bottom
  useEffect(() => {
    if (!isOpen || !isAutoScrollActive) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let lastTimestamp = performance.now();

    // Calibrate starting position
    scrollPosRef.current = container.scrollTop;
    isPausedAtEdgeRef.current = false;
    isUserInteractingRef.current = false;

    const scrollStep = (currentTimestamp: number) => {
      const elapsed = Math.min(Math.max(currentTimestamp - lastTimestamp, 0), 40);
      lastTimestamp = currentTimestamp;

      // Only scroll if container has overflow and not paused by user interaction or edge pause
      if (
        container &&
        !isUserInteractingRef.current &&
        !isPausedAtEdgeRef.current &&
        container.scrollHeight > container.clientHeight
      ) {
        const speed = 0.75; // Consistent, smooth auto-scroll speed
        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);

        if (maxScroll <= 0) {
          animationFrameId = requestAnimationFrame(scrollStep);
          return;
        }

        if (scrollDirectionRef.current === "down") {
          scrollPosRef.current += speed * (elapsed / 16);

          // Reached bottom
          if (scrollPosRef.current >= maxScroll - 1) {
            scrollPosRef.current = maxScroll;
            isProgrammaticScrollRef.current = true;
            container.scrollTop = maxScroll;
            isPausedAtEdgeRef.current = true;

            if (edgePauseTimeoutRef.current) clearTimeout(edgePauseTimeoutRef.current);
            // 3-second pause at bottom so viewers can inspect lower ranks
            edgePauseTimeoutRef.current = setTimeout(() => {
              scrollDirectionRef.current = "up";
              userScrollDirectionRef.current = "up";
              isPausedAtEdgeRef.current = false;
              lastTimestamp = performance.now();
            }, 3000);
          } else {
            isProgrammaticScrollRef.current = true;
            container.scrollTop = scrollPosRef.current;
          }
        } else {
          // Scrolling back up
          scrollPosRef.current -= speed * 1.1 * (elapsed / 16);

          // Reached top
          if (scrollPosRef.current <= 1) {
            scrollPosRef.current = 0;
            isProgrammaticScrollRef.current = true;
            container.scrollTop = 0;
            isPausedAtEdgeRef.current = true;

            if (edgePauseTimeoutRef.current) clearTimeout(edgePauseTimeoutRef.current);
            // 3-second pause at top so viewers can inspect top 1-3
            edgePauseTimeoutRef.current = setTimeout(() => {
              scrollDirectionRef.current = "down";
              userScrollDirectionRef.current = "down";
              isPausedAtEdgeRef.current = false;
              lastTimestamp = performance.now();
            }, 3000);
          } else {
            isProgrammaticScrollRef.current = true;
            container.scrollTop = scrollPosRef.current;
          }
        }
      }

      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (edgePauseTimeoutRef.current) clearTimeout(edgePauseTimeoutRef.current);
      if (userResumeTimeoutRef.current) clearTimeout(userResumeTimeoutRef.current);
    };
  }, [isOpen, isAutoScrollActive, rankedParticipants]);

  // Global pointer/mouse up listener to resume auto-scroll when user finishes dragging scrollbar
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerUp = () => {
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        handleUserInteraction();
      }
    };

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("mouseup", handlePointerUp);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [isOpen]);

  // Handle user manual interaction (wheel, trackpad, touch, scrollbar drag, keyboard)
  const handleUserInteraction = (delta?: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    isUserInteractingRef.current = true;
    setIsManualScrollPaused(true);

    // Cancel any active edge pause (so it won't reverse or trigger unexpectedly)
    if (edgePauseTimeoutRef.current) {
      clearTimeout(edgePauseTimeoutRef.current);
      edgePauseTimeoutRef.current = null;
    }
    isPausedAtEdgeRef.current = false;

    // Track user direction if delta is provided or can be determined
    const currentScroll = container.scrollTop;
    if (delta !== undefined && Math.abs(delta) > 0.5) {
      userScrollDirectionRef.current = delta > 0 ? "down" : "up";
    } else {
      const scrollDiff = currentScroll - lastUserScrollTopRef.current;
      if (Math.abs(scrollDiff) > 1) {
        userScrollDirectionRef.current = scrollDiff > 0 ? "down" : "up";
      }
    }
    lastUserScrollTopRef.current = currentScroll;
    scrollPosRef.current = currentScroll;

    // Clear previous resume timer and schedule smooth resume 1.5s after user stops
    if (userResumeTimeoutRef.current) clearTimeout(userResumeTimeoutRef.current);
    userResumeTimeoutRef.current = setTimeout(() => {
      if (!scrollContainerRef.current) return;
      const c = scrollContainerRef.current;
      const maxScroll = Math.max(0, c.scrollHeight - c.clientHeight);
      const pos = Math.max(0, Math.min(maxScroll, c.scrollTop));

      scrollPosRef.current = pos;

      // Intelligently decide direction upon resume
      if (pos >= maxScroll - 10) {
        scrollDirectionRef.current = "up";
        userScrollDirectionRef.current = "up";
      } else if (pos <= 10) {
        scrollDirectionRef.current = "down";
        userScrollDirectionRef.current = "down";
      } else if (userScrollDirectionRef.current) {
        scrollDirectionRef.current = userScrollDirectionRef.current;
      }

      isUserInteractingRef.current = false;
      setIsManualScrollPaused(false);
      isPausedAtEdgeRef.current = false;
    }, 1500);
  };

  const handleScroll = () => {
    // If the scroll event was triggered by our own auto-scroller, ignore it
    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false;
      return;
    }
    // Genuine user-initiated scroll (scrollbar drag, keyboard, mouse wheel, or touch)
    handleUserInteraction();
  };

  const handleUserWheel = (
    e?: React.WheelEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    const delta = e && "deltaY" in e ? e.deltaY : undefined;
    handleUserInteraction(delta);
  };

  const handlePointerDown = () => {
    isMouseDownRef.current = true;
    handleUserInteraction();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#040813] text-white flex flex-col overflow-hidden animate-in fade-in duration-300 font-sans">
      {/* Top Ambient Glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-cyan-500/20 via-sky-600/10 to-transparent blur-3xl" />

      {/* HEADER SECTION (TV / BROADCAST STYLE) */}
      <header className="relative z-10 shrink-0 border-b border-cyan-900/40 bg-[#060e1c]/90 backdrop-blur-md px-6 py-3.5 shadow-2xl">
        <div className="max-w-[1700px] mx-auto space-y-3">
          {/* Top Row: Title, Subtitle, and Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left Title & Status */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-amber-400 p-[2px] shadow-lg shadow-cyan-500/25 shrink-0 flex items-center justify-center">
                <div className="w-full h-full bg-[#060e1c] rounded-[14px] flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-black uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    SESI JEDA / BREAK MATCH
                  </span>
                  <span className="text-zinc-500 text-xs">•</span>
                  <span className="text-cyan-200/80 font-mono text-xs font-semibold uppercase tracking-wider">
                    {selectedStage === "all"
                      ? "KLASEMEN KESELURUHAN"
                      : currentStageObj?.name || roundTitle}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                  KLASEMEN{" "}
                  <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400 bg-clip-text text-transparent">
                    {selectedStage === "all"
                      ? "SEMUA BABAK"
                      : currentStageObj?.name?.toUpperCase() || "NEXT ARENA"}
                  </span>
                </h1>
              </div>
            </div>

            {/* Right Controls: Auto-Scroll Toggle, Fullscreen, Close */}
            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
              {/* Auto-Scroll Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  if (isManualScrollPaused) {
                    setIsManualScrollPaused(false);
                    isUserInteractingRef.current = false;
                  }
                  setIsAutoScrollActive((prev) => !prev);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                  !isAutoScrollActive
                    ? "bg-[#0a172c] border-cyan-900/40 text-zinc-400 hover:text-white"
                    : isManualScrollPaused
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm animate-pulse"
                    : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm"
                }`}
                title="Aktifkan atau jeda auto-scrolling otomatis (Spasi)"
              >
                {isAutoScrollActive ? (
                  isManualScrollPaused ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      <span>Auto-Scroll: Jeda Manual (1.5s)</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                      <span>Auto-Scroll: ON</span>
                    </>
                  )
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-zinc-400 fill-current" />
                    <span>Auto-Scroll: PAUSED</span>
                  </>
                )}
              </button>

              {/* Toggle Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Layar Penuh (F11)"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-lg shadow-rose-950/20"
                title="Tutup Tampilan Ranking (ESC)"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Tutup</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Round Switcher Tabs & Category Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2.5 border-t border-cyan-900/30">
            {/* ROUND / STAGE TABS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 shrink-0 mr-1 hidden sm:inline-flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                PILIH BABAK:
              </span>

              {stages.map((st, sIdx) => {
                const isSelected = selectedStage === sIdx;
                const stageNumber = sIdx + 1;
                const displayName = st.name.toLowerCase().startsWith("babak")
                  ? st.name
                  : `Babak ${stageNumber} • ${st.name}`;
                return (
                  <button
                    key={st.id || sIdx}
                    type="button"
                    onClick={() => setSelectedStage(sIdx)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 shadow-md shadow-cyan-500/25 ring-1 ring-cyan-300/40"
                        : "bg-[#0a172c]/90 border-cyan-900/40 text-zinc-400 hover:text-white hover:border-cyan-700/60"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? "bg-white" : "bg-cyan-400"
                      }`}
                    />
                    <span>{displayName}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isSelected
                          ? "bg-black/30 text-white font-black"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {st.resetPoints ? "Reset 0" : "Akumulasi"}
                    </span>
                  </button>
                );
              })}

              {/* SEMUA BABAK (TOTAL) TAB */}
              <button
                type="button"
                onClick={() => setSelectedStage("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer whitespace-nowrap ${
                  selectedStage === "all"
                    ? "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white border-cyan-400/50 shadow-md shadow-cyan-500/25 ring-1 ring-cyan-400/40"
                    : "bg-[#0a172c]/90 border-cyan-900/40 text-zinc-400 hover:text-white hover:border-cyan-700/60"
                }`}
              >
                <span>Semua Babak (Total)</span>
              </button>
            </div>

            {/* CATEGORY FILTER PILLS */}
            {categories.length > 2 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 shrink-0 mr-1 hidden sm:inline">
                  KATEGORI:
                </span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                        : "bg-[#0a172c]/80 border border-cyan-900/40 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* TABLE COLUMN HEADER (STICKY) */}
      <div className="relative z-10 shrink-0 bg-zinc-950/95 border-b border-zinc-800 px-6 py-3">
        <div className="max-w-[1700px] mx-auto grid grid-cols-12 gap-4 items-center text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
          <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
          <div className="col-span-2 sm:col-span-1 text-center">Kode</div>
          <div className="col-span-5 sm:col-span-4">Peserta / Tim & Instansi</div>
          <div className="hidden sm:block sm:col-span-2 text-center">Kategori</div>
          <div className="hidden md:block md:col-span-2 text-center">
            {selectedStage === "all"
              ? "Skor Tiap Babak"
              : `Skor ${currentStageObj?.name || "Babak"}`}
          </div>
          <div className="col-span-3 sm:col-span-2 text-right pr-2">
            {selectedStage === "all"
              ? "Total Point"
              : `Poin ${currentStageObj?.name || "Babak"}`}
          </div>
        </div>
      </div>

      {/* AUTO-SCROLLING RANKING LIST CONTAINER */}
      <div
        ref={scrollContainerRef}
        onWheel={handleUserWheel}
        onTouchMove={handleUserWheel}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5 relative select-none sm:select-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#00a3ff44 #060d1a",
          scrollBehavior: "auto",
        }}
      >
        <div className="max-w-[1700px] mx-auto space-y-2.5">
          {rankedParticipants.length === 0 ? (
            <div className="py-24 text-center text-zinc-500 space-y-3 font-mono">
              <Trophy className="w-12 h-12 text-zinc-700 mx-auto" />
              <p className="text-base font-bold text-zinc-300">
                {selectedStage === "all"
                  ? "Belum ada data peserta yang terdaftar"
                  : `Belum ada peserta di ${currentStageObj?.name || "babak ini"}`}
              </p>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                {selectedStage === "all"
                  ? "Daftar peserta akan otomatis tampil setelah didaftarkan."
                  : "Peserta yang diloloskan dari babak sebelumnya akan otomatis tampil pada papan peringkat babak ini."}
              </p>
            </div>
          ) : (
            rankedParticipants.map((p, index) => {
              const rank = index + 1;
              const isFirst = rank === 1;
              const isSecond = rank === 2;
              const isThird = rank === 3;
              const isTop3 = isFirst || isSecond || isThird;

              return (
                <div
                  key={p.id}
                  className={`grid grid-cols-12 gap-4 items-center px-4 py-3.5 rounded-2xl border transition-all duration-300 ${
                    isFirst
                      ? "bg-gradient-to-r from-amber-500/15 via-[#0c1a30] to-[#060e1c] border-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.15)]"
                      : isSecond
                      ? "bg-gradient-to-r from-cyan-500/15 via-[#0c1a30] to-[#060e1c] border-cyan-400/40 shadow-[0_0_20px_rgba(0,163,255,0.15)]"
                      : isThird
                      ? "bg-gradient-to-r from-sky-500/15 via-[#0c1a30] to-[#060e1c] border-sky-400/35"
                      : "bg-[#0a172c]/70 hover:bg-[#0e213e] border-cyan-900/30"
                  }`}
                >
                  {/* RANK BADGE */}
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                    <div
                      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl font-mono font-black text-sm sm:text-base flex items-center justify-center shadow-md ${
                        isFirst
                          ? "bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-zinc-950 shadow-amber-500/25 ring-2 ring-amber-400/40"
                          : isSecond
                          ? "bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-500 text-white ring-1 ring-cyan-400/30"
                          : isThird
                          ? "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white ring-1 ring-sky-400/30"
                          : "bg-[#060e1c] border border-cyan-900/40 text-cyan-200/80"
                      }`}
                    >
                      {isFirst ? (
                        <Crown className="w-5 h-5 fill-current text-zinc-950" />
                      ) : (
                        `#${rank}`
                      )}
                    </div>
                  </div>

                  {/* KODE TIM */}
                  <div className="col-span-2 sm:col-span-1 text-center">
                    <span className="font-mono text-xs sm:text-sm font-bold text-zinc-400 bg-zinc-900/90 px-2 py-1 rounded-lg border border-zinc-800">
                      {p.code}
                    </span>
                  </div>

                  {/* NAMA TIM & INSTANSI */}
                  <div className="col-span-5 sm:col-span-4 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-black text-white truncate block">
                        {p.name}
                      </span>
                      {p.status === "Gugur" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                          Gugur
                        </span>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm text-zinc-400 font-medium truncate block mt-0.5">
                      {p.institution} {p.city ? `• ${p.city}` : ""}
                    </span>
                  </div>

                  {/* KATEGORI */}
                  <div className="hidden sm:block sm:col-span-2 text-center">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-900/90 border border-zinc-800 text-zinc-300">
                      {p.category}
                    </span>
                  </div>

                  {/* SKOR (TIAP BABAK / SKOR BABAK TERPILIH) */}
                  <div className="hidden md:flex md:col-span-2 items-center justify-center font-mono">
                    {selectedStage === "all" ? (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap font-mono text-xs">
                        {stages.length === 0 ? (
                          <span className="text-zinc-600">-</span>
                        ) : (
                          stages.map((st, sIdx) => {
                            const score = getParticipantStageRawScore(p.scores, sIdx, st);
                            return (
                              <span
                                key={st.id || sIdx}
                                className="px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800/80 text-zinc-300 text-[11px]"
                                title={st.name}
                              >
                                <span className="text-zinc-500 mr-1">
                                  {st.name.replace(/^Babak\s+/i, "")}:
                                </span>
                                <strong className="text-white">{score}</strong>
                              </span>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1">
                          <span className="text-base sm:text-lg font-black text-amber-400">
                            {p.stageRawScore.toLocaleString("id-ID")}
                          </span>
                          <span className="text-[11px] text-zinc-400">Pts</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                          RAW {currentStageObj?.name?.replace(/^Babak\s+/i, "") || `B${(selectedStage as number) + 1}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* TOTAL / STAGE RANKING POINT */}
                  <div className="col-span-3 sm:col-span-2 text-right pr-2">
                    <div className="flex flex-col items-end">
                      <span
                        className={`font-mono text-xl sm:text-2xl font-black ${
                          isTop3
                            ? "bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400 bg-clip-text text-transparent"
                            : "text-white"
                        }`}
                      >
                        {p.displayPoints.toLocaleString("id-ID")}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                        {selectedStage === "all"
                          ? "TOTAL RANKING PTS"
                          : currentStageObj?.resetPoints
                          ? "POIN RESET BABAK"
                          : "AKUMULASI PTS"}
                      </span>
                      {fastestFinishMap[(p.name || "").trim().toLowerCase()] && (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 mt-0.5">
                          ⏱ {fastestFinishMap[(p.name || "").trim().toLowerCase()].bestFormatted}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FOOTER TICKER BAR */}
      <footer className="relative z-10 shrink-0 border-t border-zinc-900 bg-[#060608] px-6 py-2.5 text-xs text-zinc-500 font-mono">
        <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-400 font-semibold">
              Menampilkan {rankedParticipants.length} Peserta (
              {selectedStage === "all"
                ? "Semua Babak"
                : currentStageObj?.name || "Babak Terpilih"}
              {selectedCategory !== "Semua" ? ` • ${selectedCategory}` : ""}
              )
            </span>
            <span className="text-zinc-600">•</span>
            <span>Auto-scrolling lambat aktif (Berhenti sejenak di atas & bawah)</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>
              Tekan{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-mono text-[10px]">
                SPASI
              </kbd>{" "}
              untuk Jeda
            </span>
            <span>
              Tekan{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-mono text-[10px]">
                ESC
              </kbd>{" "}
              untuk Kembali
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

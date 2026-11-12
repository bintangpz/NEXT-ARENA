"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Participant,
  TournamentStage,
  getParticipantStageRawScore,
} from "@/data/mockCompetition";
import {
  Trophy,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  X,
  Flame,
  Crown,
  RotateCcw,
} from "lucide-react";

interface ViewRankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  stages: TournamentStage[];
  activeRound?: string;
  roundTitle?: string;
}

export function ViewRankingModal({
  isOpen,
  onClose,
  participants,
  stages,
  activeRound = "babak1",
  roundTitle = "KLASEMEN PERTANDINGAN",
}: ViewRankingModalProps) {
  const [isAutoScrollActive, setIsAutoScrollActive] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollDirectionRef = useRef<"down" | "up">("down");
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef<boolean>(false);
  const scrollPosRef = useRef<number>(0);

  // Extract unique categories
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    participants.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["Semua", ...Array.from(set)];
  }, [participants]);

  // Filter participants by category and sort strictly by total points descending
  const rankedParticipants = React.useMemo(() => {
    const filtered =
      selectedCategory === "Semua"
        ? [...participants]
        : participants.filter((p) => p.category === selectedCategory);

    return filtered.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [participants, selectedCategory]);

  // Handle ESC key to exit
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

  // Reset posisi scroll saat modal dibuka atau kategori diubah
  useEffect(() => {
    if (isOpen) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      scrollPosRef.current = 0;
      scrollDirectionRef.current = "down";
      isHoldingRef.current = false;
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    }
  }, [isOpen, selectedCategory]);

  // Auto-scroll loop with pause at top & bottom
  useEffect(() => {
    if (!isOpen || !isAutoScrollActive) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let lastTimestamp = performance.now();

    // Kalibrasi posisi awal dari container
    scrollPosRef.current = container.scrollTop;

    const scrollStep = (currentTimestamp: number) => {
      const elapsed = Math.min(Math.max(currentTimestamp - lastTimestamp, 0), 40);
      lastTimestamp = currentTimestamp;

      // Only scroll if container has overflow and not temporarily paused
      if (
        container &&
        !isHoldingRef.current &&
        container.scrollHeight > container.clientHeight
      ) {
        const speed = 0.75; // Kecepatan scroll konsisten, halus & langsung lancar sejak awal
        const maxScroll = container.scrollHeight - container.clientHeight;

        if (scrollDirectionRef.current === "down") {
          scrollPosRef.current += speed * (elapsed / 16);

          // Reached bottom
          if (scrollPosRef.current >= maxScroll - 1) {
            scrollPosRef.current = maxScroll;
            container.scrollTop = maxScroll;
            isHoldingRef.current = true;
            // Jeda 3 detik di bawah agar penonton sempat melihat peringkat bawah
            pauseTimeoutRef.current = setTimeout(() => {
              scrollDirectionRef.current = "up";
              isHoldingRef.current = false;
              lastTimestamp = performance.now();
            }, 3000);
          } else {
            container.scrollTop = scrollPosRef.current;
          }
        } else {
          // Scrolling back up
          scrollPosRef.current -= speed * 1.2 * (elapsed / 16);

          // Reached top
          if (scrollPosRef.current <= 1) {
            scrollPosRef.current = 0;
            container.scrollTop = 0;
            isHoldingRef.current = true;
            // Jeda 3 detik di atas agar penonton melihat peringkat 1-3
            pauseTimeoutRef.current = setTimeout(() => {
              scrollDirectionRef.current = "down";
              isHoldingRef.current = false;
              lastTimestamp = performance.now();
            }, 3000);
          } else {
            container.scrollTop = scrollPosRef.current;
          }
        }
      }

      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, [isOpen, isAutoScrollActive, rankedParticipants]);

  // Pause momentarily on user manual scroll
  const handleUserWheel = () => {
    isHoldingRef.current = true;
    if (scrollContainerRef.current) {
      scrollPosRef.current = scrollContainerRef.current.scrollTop;
    }
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollPosRef.current = scrollContainerRef.current.scrollTop;
      }
      isHoldingRef.current = false;
    }, 4000); // 4 detik setelah interaksi pengguna, lanjutkan auto-scroll
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#07070a] text-white flex flex-col overflow-hidden animate-in fade-in duration-300 font-sans">
      {/* Top Ambient Glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-orange-500/20 via-red-600/10 to-transparent blur-3xl" />

      {/* HEADER SECTION (TV / BROADCAST STYLE) */}
      <header className="relative z-10 shrink-0 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-6 py-4 shadow-2xl">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Title & Status */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 p-[2px] shadow-lg shadow-orange-500/25 shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-black uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  SESI JEDA / BREAK MATCH
                </span>
                <span className="text-zinc-500 text-xs">•</span>
                <span className="text-zinc-400 font-mono text-xs font-semibold uppercase tracking-wider">
                  {roundTitle || "PAPAN KLASEMEN ARENA"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                KLASEMEN SEMENTARA{" "}
                <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 bg-clip-text text-transparent">
                  NEXT ARENA
                </span>
              </h1>
            </div>
          </div>

          {/* Center Category Filter Pills */}
          {categories.length > 2 && (
            <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 p-1 rounded-xl self-start md:self-auto overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-zinc-950 shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Right Controls: Auto-Scroll Toggle, Fullscreen, Close */}
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
            {/* Auto-Scroll Toggle Button */}
            <button
              type="button"
              onClick={() => setIsAutoScrollActive((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                isAutoScrollActive
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
              title="Aktifkan atau jeda auto-scrolling otomatis (Spasi)"
            >
              {isAutoScrollActive ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                  <span>Auto-Scroll: ON</span>
                </>
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
      </header>

      {/* TABLE COLUMN HEADER (STICKY) */}
      <div className="relative z-10 shrink-0 bg-zinc-950/95 border-b border-zinc-800 px-6 py-3">
        <div className="max-w-[1700px] mx-auto grid grid-cols-12 gap-4 items-center text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
          <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
          <div className="col-span-2 sm:col-span-1 text-center">Kode</div>
          <div className="col-span-5 sm:col-span-4">Peserta / Tim & Instansi</div>
          <div className="hidden sm:block sm:col-span-2 text-center">Kategori</div>
          <div className="hidden md:block md:col-span-2 text-center">Skor Babak</div>
          <div className="col-span-3 sm:col-span-2 text-right pr-2">Total Point</div>
        </div>
      </div>

      {/* AUTO-SCROLLING RANKING LIST CONTAINER */}
      <div
        ref={scrollContainerRef}
        onWheel={handleUserWheel}
        onTouchMove={handleUserWheel}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5 relative"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#27272a #09090b", scrollBehavior: "auto" }}
      >
        <div className="max-w-[1700px] mx-auto space-y-2.5">
          {rankedParticipants.length === 0 ? (
            <div className="py-24 text-center text-zinc-500 space-y-2 font-mono">
              <Trophy className="w-12 h-12 text-zinc-700 mx-auto" />
              <p className="text-base font-bold text-zinc-400">Belum ada data peserta yang terdaftar</p>
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
                      ? "bg-gradient-to-r from-yellow-500/15 via-[#181512] to-[#121216] border-yellow-500/50 shadow-[0_0_25px_rgba(250,204,21,0.12)]"
                      : isSecond
                      ? "bg-gradient-to-r from-orange-500/15 via-[#181412] to-[#121216] border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.10)]"
                      : isThird
                      ? "bg-gradient-to-r from-red-500/15 via-[#181214] to-[#121216] border-red-500/35 shadow-[0_0_15px_rgba(239,68,68,0.08)]"
                      : "bg-[#111116]/80 hover:bg-[#15151c] border-zinc-800/80"
                  }`}
                >
                  {/* RANK BADGE */}
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                    <div
                      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl font-mono font-black text-sm sm:text-base flex items-center justify-center shadow-md ${
                        isFirst
                          ? "bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500 text-zinc-950 shadow-yellow-500/25 ring-2 ring-yellow-400/40"
                          : isSecond
                          ? "bg-gradient-to-br from-zinc-200 via-orange-300 to-orange-500 text-zinc-950 ring-1 ring-orange-400/30"
                          : isThird
                          ? "bg-gradient-to-br from-amber-600 via-red-500 to-rose-700 text-white ring-1 ring-red-400/30"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-300"
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

                  {/* SKOR TIAP BABAK */}
                  <div className="hidden md:flex md:col-span-2 items-center justify-center gap-1.5 flex-wrap font-mono text-xs">
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
                            <span className="text-zinc-500 mr-1">{st.name.replace(/^Babak\s+/i, "")}:</span>
                            <strong className="text-white">{score}</strong>
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* TOTAL RANKING POINT */}
                  <div className="col-span-3 sm:col-span-2 text-right pr-2">
                    <div className="flex flex-col items-end">
                      <span
                        className={`font-mono text-xl sm:text-2xl font-black ${
                          isTop3
                            ? "bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 bg-clip-text text-transparent"
                            : "text-white"
                        }`}
                      >
                        {p.totalPoints.toLocaleString("id-ID")}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                        RANKING PTS
                      </span>
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
              Menampilkan {rankedParticipants.length} Peserta
            </span>
            <span className="text-zinc-600">•</span>
            <span>Auto-scrolling lambat aktif (Berhenti sejenak di atas & bawah)</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>Tekan <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-mono text-[10px]">SPASI</kbd> untuk Jeda</span>
            <span>Tekan <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-mono text-[10px]">ESC</kbd> untuk Kembali</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


"use client";

import React, { useEffect, useState, useRef } from "react";
import { ArenaLogo } from "@/components/ArenaLogo";
import { Zap, Swords } from "lucide-react";

interface ArenaShutterTransitionProps {
  isActive: boolean;
  mode?: "close" | "reveal";
  matchLabel?: string;
  category?: string;
  teamA?: string;
  teamB?: string;
  round?: string;
  onComplete?: () => void;
}

export function ArenaShutterTransition({
  isActive,
  mode = "close",
  matchLabel = "Laga Pertandingan",
  category = "Transporter SMP",
  teamA = "Tim Sudut Merah",
  teamB = "Tim Sudut Biru",
  round = "Babak Penyisihan",
  onComplete,
}: ArenaShutterTransitionProps) {
  const [phase, setPhase] = useState<"idle" | "closing" | "closed" | "opening">("idle");
  const onCompleteRef = useRef(onComplete);
  const isRunningRef = useRef(false);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isActive) {
      isRunningRef.current = false;
      hasCompletedRef.current = false;
      setPhase("idle");
      return;
    }

    // Hindari reset animasi / re-trigger jika animasi sedang berjalan dalam siklus yang sama
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    if (mode === "reveal") {
      setPhase("closed");
      const t1 = setTimeout(() => {
        setPhase("opening");
      }, 120);

      const t2 = setTimeout(() => {
        setPhase("idle");
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onCompleteRef.current?.();
        }
      }, 680);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setPhase("closing");
      // Closed at center after 420ms
      const t1 = setTimeout(() => {
        setPhase("closed");
      }, 420);

      // Trigger navigation / completion at 1150ms tepat 1x
      const t2 = setTimeout(() => {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onCompleteRef.current?.();
        }
      }, 1150);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isActive, mode]);

  if (phase === "idle" && !isActive) return null;

  const isClosed = phase === "closing" || phase === "closed";

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-auto overflow-hidden flex flex-col justify-between">
      {/* Top Shutter (Slides Down from Top) */}
      <div
        className={`w-full h-1/2 bg-gradient-to-b from-[#040812] via-[#09152b] to-[#040812] border-b-4 border-cyan-400 shadow-[0_15px_50px_rgba(0,163,255,0.4)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] relative overflow-hidden flex flex-col justify-end items-center pb-8 ${
          isClosed ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#00a3ff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Hazard warning stripes on bottom border */}
        <div className="absolute bottom-0 inset-x-0 h-2 bg-[repeating-linear-gradient(45deg,#00a3ff,#00a3ff_12px,#071224_12px,#071224_24px)] opacity-90" />

        <div
          className={`transition-all duration-300 transform ${
            phase === "closed" ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95"
          }`}
        >
          <span className="px-3.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-bold uppercase tracking-widest inline-flex items-center gap-1.5 shadow-lg">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-current animate-bounce" />
            MEMASUKI ARENA TANDING • {round.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Center Slam Impact & Logo Banner */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-center transition-all duration-300 transform pointer-events-none ${
          phase === "closed" ? "scale-100 opacity-100" : "scale-75 opacity-0"
        }`}
      >
        <div className="p-8 rounded-3xl bg-[#060e1c]/95 border-2 border-cyan-400 shadow-[0_0_80px_rgba(0,163,255,0.6)] backdrop-blur-2xl flex flex-col items-center space-y-4 max-w-xl mx-auto">
          {/* Logo with energetic pulsating glow */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 via-sky-400 to-amber-500 rounded-full blur-2xl opacity-75 animate-pulse" />
            <ArenaLogo size="lg" showTagline={false} />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold tracking-widest uppercase">
              <Swords className="w-4 h-4 text-amber-400" />
              <span>{matchLabel} • {category}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
              ARENA PERTANDINGAN DIBUKA
            </h2>
          </div>

          {/* Versus Duel Banner */}
          <div className="grid grid-cols-2 gap-4 w-full pt-2 border-t border-cyan-900/50">
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-center">
              <span className="text-[10px] font-mono font-bold text-rose-400 uppercase block">SUDUT MERAH</span>
              <span className="text-sm font-black text-white truncate block">{teamA}</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/40 text-center">
              <span className="text-[10px] font-mono font-bold text-blue-400 uppercase block">SUDUT BIRU</span>
              <span className="text-sm font-black text-white truncate block">{teamB}</span>
            </div>
          </div>

          <p className="text-[11px] font-mono text-cyan-200/70 animate-pulse">
            Memuat Arena Stopwatch & Kontrol Hotkey Pertandingan...
          </p>
        </div>
      </div>

      {/* Bottom Shutter (Slides Up from Bottom) */}
      <div
        className={`w-full h-1/2 bg-gradient-to-t from-[#040812] via-[#09152b] to-[#040812] border-t-4 border-cyan-400 shadow-[0_-15px_50px_rgba(0,163,255,0.4)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] relative overflow-hidden flex flex-col justify-start items-center pt-8 ${
          isClosed ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#00a3ff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Hazard warning stripes on top border */}
        <div className="absolute top-0 inset-x-0 h-2 bg-[repeating-linear-gradient(45deg,#00a3ff,#00a3ff_12px,#071224_12px,#071224_24px)] opacity-90" />

        <div
          className={`transition-all duration-300 transform ${
            phase === "closed" ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
          }`}
        >
          <span className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest">
            NUSANTARA NEXT 2026 • ARENA COMPETITION SYSTEM
          </span>
        </div>
      </div>
    </div>
  );
}


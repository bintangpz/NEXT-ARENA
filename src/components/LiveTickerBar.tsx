"use client";

import React from "react";
import { Megaphone, Swords, Flag, Trophy } from "lucide-react";
import { DEFAULT_TICKER_TEXT, type LiveTickerMode } from "@/lib/liveTicker";

interface LiveTickerBarProps {
  text: string;
  mode?: LiveTickerMode;
  rightSlot?: React.ReactNode;
}

export function LiveTickerBar({
  text,
  mode = "default",
  rightSlot,
}: LiveTickerBarProps) {
  const displayText = text || DEFAULT_TICKER_TEXT;

  const badgeConfig =
    mode === "welcome"
      ? {
          label: "LIVE ARENA",
          wrapperClass:
            "bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]",
          textClass: "text-emerald-200 font-bold",
          starLeftClass: "text-emerald-400",
          starRightClass: "text-cyan-400",
          barBgClass: "bg-[#06131f]/95 border-emerald-500/30",
          fadeFromClass: "from-[#06131f]",
          Icon: Swords,
        }
      : mode === "leg1_result"
        ? {
            label: "POIN PUTARAN 1",
            wrapperClass:
              "bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
            textClass: "text-amber-200 font-bold",
            starLeftClass: "text-amber-400",
            starRightClass: "text-cyan-400",
            barBgClass: "bg-[#12100a]/95 border-amber-500/30",
            fadeFromClass: "from-[#12100a]",
            Icon: Flag,
          }
        : mode === "finished"
          ? {
              label: "HASIL LAGA",
              wrapperClass:
                "bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
              textClass: "text-amber-200 font-bold",
              starLeftClass: "text-amber-400",
              starRightClass: "text-emerald-400",
              barBgClass: "bg-[#101018]/95 border-amber-500/30",
              fadeFromClass: "from-[#101018]",
              Icon: Trophy,
            }
          : {
              label: "INFO ARENA",
              wrapperClass: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm",
              textClass: "text-zinc-300 font-medium",
              starLeftClass: "text-cyan-400",
              starRightClass: "text-amber-400",
              barBgClass: "bg-[#060e1c]/95 border-cyan-900/40",
              fadeFromClass: "from-[#060e1c]",
              Icon: Megaphone,
            };

  const { Icon } = badgeConfig;

  return (
    <div
      className={`${badgeConfig.barBgClass} backdrop-blur-xl border-b px-4 sm:px-6 lg:px-8 py-2 transition-colors duration-300`}
    >
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider shrink-0 ${badgeConfig.wrapperClass}`}
          >
            <Icon className="w-3 h-3 shrink-0" />
            <span>{badgeConfig.label}</span>
          </span>
          <div className="group relative flex-1 min-w-0 overflow-hidden select-none py-0.5 leading-none">
            {/* Fade Gradient Edges for Smooth Entry/Exit */}
            <div
              className={`pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r ${badgeConfig.fadeFromClass} to-transparent z-10`}
            />
            <div
              className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l ${badgeConfig.fadeFromClass} to-transparent z-10`}
            />

            {/* Running Text: 1 teks berjalan tuntas dari kanan ke kiri sebelum mengulang */}
            <div className="gap-4 animate-marquee">
              <span className={`${badgeConfig.starLeftClass} font-bold text-xs shrink-0 select-none`}>
                ✦
              </span>
              <span className={`text-xs whitespace-nowrap ${badgeConfig.textClass}`}>
                {displayText}
              </span>
              <span className={`${badgeConfig.starRightClass} font-bold text-xs shrink-0 select-none`}>
                ✦
              </span>
            </div>
          </div>
        </div>
        {rightSlot}
      </div>
    </div>
  );
}

export default LiveTickerBar;

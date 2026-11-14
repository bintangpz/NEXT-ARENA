import React from "react";

interface ArenaLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

export function ArenaLogo({ size = "md", showTagline = true, className = "" }: ArenaLogoProps) {
  const dimensions = {
    sm: "w-9 h-9",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }[size];

  const titleSize = {
    sm: "text-lg sm:text-xl",
    md: "text-xl sm:text-2xl",
    lg: "text-2xl sm:text-3xl",
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none group ${className}`}>
      {/* Cybernetic Mascot Emblem in Glowing Tech Frame */}
      <div className={`relative ${dimensions} flex items-center justify-center shrink-0`}>
        {/* Outer Cyan & Amber Tech Glow */}
        <div
          className="absolute inset-0 rounded-2xl opacity-80 blur-md transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(135deg, rgba(0, 163, 255, 0.75) 0%, rgba(2, 132, 199, 0.4) 40%, rgba(245, 158, 11, 0.75) 100%)",
          }}
        />
        {/* Frame Base */}
        <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#0c1c38] via-[#071326] to-[#040914] border border-cyan-400/40 p-1 flex items-center justify-center shadow-[inset_0_0_12px_rgba(0,163,255,0.25)]">
          {/* Subtle Cyber Corner Accents */}
          <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t-2 border-l-2 border-cyan-400" />
          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t-2 border-r-2 border-amber-400" />
          <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b-2 border-l-2 border-cyan-400" />
          <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b-2 border-r-2 border-amber-400" />

          {/* Official Cyber Hornbill Mascot */}
          <img
            src="/nusantara-next-mascot.png"
            alt="Nusantara Next Mascot"
            className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(0,163,255,0.6)] transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </div>

      {/* Cyber Circuit Vertical Divider */}
      <div className="h-10 w-[2px] bg-gradient-to-b from-cyan-500/20 via-cyan-400/80 to-amber-500/30 rounded-full" />

      {/* Brand Typography */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-[0.24em] uppercase px-1.5 py-0.5 rounded bg-gradient-to-r from-cyan-500/15 via-[#0B2046]/40 to-amber-500/15 text-cyan-300 border border-cyan-400/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,163,255,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            NUSANTARA NEXT
            <span className="text-amber-400 font-extrabold">2026</span>
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className={`${titleSize} font-black tracking-[0.28em] text-white uppercase leading-none drop-shadow-[0_0_12px_rgba(0,163,255,0.3)]`}>
            ARENA
          </span>
          {showTagline && (
            <span className="hidden md:inline-block text-[10px] font-semibold tracking-[0.18em] uppercase bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400 bg-clip-text text-transparent">
              NEW ERA OF EXPERIENCE AND TECHNOLOGY
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


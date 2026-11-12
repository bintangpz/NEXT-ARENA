import React from "react";

interface ArenaLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

export function ArenaLogo({ size = "md", showTagline = true }: ArenaLogoProps) {
  const dimensions = {
    sm: "w-9 h-9",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }[size];

  return (
    <div className="flex items-center gap-3.5 select-none group">
      {/* 3D Hexagonal Cube with Glowing Yellow-Orange-Red 'A' Star */}
      <div className={`relative ${dimensions} flex items-center justify-center shrink-0`}>
        {/* Outer Multi-Tone Neon Glow matching reference logo */}
        <div
          className="absolute inset-0 rounded-xl opacity-80 blur-md transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(180deg, rgba(250,204,21,0.65) 0%, rgba(249,115,22,0.55) 55%, rgba(239,68,68,0.75) 100%)",
          }}
        />
        <svg
          viewBox="0 0 100 112"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative w-full h-full drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"
        >
          <defs>
            <linearGradient id="hexBorderGrad" x1="50" y1="2" x2="50" y2="110" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="topFaceGrad" x1="50" y1="6" x2="50" y2="56" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#27272a" />
              <stop offset="100%" stopColor="#09090b" />
            </linearGradient>
            <linearGradient id="leftFaceGrad" x1="8" y1="30" x2="50" y2="106" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#09090b" />
              <stop offset="100%" stopColor="#18181b" />
            </linearGradient>
            <linearGradient id="rightFaceGrad" x1="92" y1="30" x2="50" y2="106" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#18181b" />
              <stop offset="100%" stopColor="#050507" />
            </linearGradient>
            <linearGradient id="laserGrad" x1="50" y1="6" x2="50" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Hexagon Base */}
          <polygon
            points="50,4 94,29 94,83 50,108 6,83 6,29"
            fill="#09090b"
            stroke="url(#hexBorderGrad)"
            strokeWidth="2.5"
          />

          {/* 3D Cube Faces */}
          {/* Top Face */}
          <polygon points="50,4 94,29 50,55 6,29" fill="url(#topFaceGrad)" />
          {/* Left Face */}
          <polygon points="6,29 50,55 50,108 6,83" fill="url(#leftFaceGrad)" />
          {/* Right Face */}
          <polygon points="94,29 94,83 50,108 50,55" fill="url(#rightFaceGrad)" />

          {/* Subtle Cube Seam Lines */}
          <line x1="6" y1="29" x2="50" y2="55" stroke="#27272a" strokeWidth="1" />
          <line x1="94" y1="29" x2="50" y2="55" stroke="#27272a" strokeWidth="1" />
          <line x1="50" y1="55" x2="50" y2="108" stroke="#27272a" strokeWidth="1" />

          {/* Glowing 'A' / Delta Apex Lines matching the NEXT Arena Emblem */}
          <g filter="url(#neonGlow)">
            {/* Left & Right Diagonal Rays from Top Apex to Bottom Corners */}
            <path
              d="M50 7 L8 82 L50 61 L92 82 Z"
              stroke="url(#laserGrad)"
              strokeWidth="3.2"
              strokeLinejoin="round"
              fill="rgba(239, 68, 68, 0.08)"
            />
            {/* Inner Chevron Highlight */}
            <path
              d="M9 82 L50 59 L91 82"
              stroke="#ef4444"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Top Apex Bright Core */}
            <path
              d="M32 38 L50 7 L68 38"
              stroke="#fde047"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>

      {/* Vertical Divider */}
      <div className="h-10 w-[1px] bg-gradient-to-b from-zinc-600/30 via-zinc-400/70 to-zinc-600/30" />

      {/* Brand Typography */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-[0.28em] uppercase px-1.5 py-0.5 rounded bg-gradient-to-r from-red-500/20 via-orange-500/20 to-yellow-500/20 text-orange-400 border border-orange-500/30">
            NUSANTARA NEXT
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-xl sm:text-2xl font-light tracking-[0.32em] text-white uppercase leading-none">
            ARENA
          </span>
          {showTagline && (
            <span className="hidden md:inline-block text-[11px] font-medium tracking-[0.22em] uppercase bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              THE PLACE TO PLAY
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


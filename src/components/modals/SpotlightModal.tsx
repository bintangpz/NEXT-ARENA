"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Participant } from "@/data/mockCompetition";
import { Crown } from "lucide-react";

interface SpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  topParticipants: Participant[];
}

export function SpotlightModal({
  isOpen,
  onClose,
  topParticipants,
}: SpotlightModalProps) {
  const top3 = topParticipants.slice(0, 3);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      className="bg-gradient-to-b from-[#091833] via-[#060e1c] to-[#040812] border-amber-400/50 text-center shadow-[0_0_80px_rgba(245,158,11,0.25)]"
    >
      <div className="space-y-8 py-2">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-widest shadow-sm">
            <Crown className="w-4 h-4 text-amber-400" />
            NUSANTARA NEXT 2026 • OFFICIAL PODIUM SPOTLIGHT
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            TOP 3 CHAMPIONS OF{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400 bg-clip-text text-transparent">
              NEXT ARENA
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
          {top3.map((champ, i) => {
            const pos = i + 1;
            return (
              <div
                key={champ.id}
                className={`rounded-2xl border p-6 space-y-3 transition-transform ${
                  pos === 1
                    ? "bg-gradient-to-b from-amber-500/20 via-[#0c1a30] to-[#060e1c] border-amber-400/70 md:scale-105 shadow-[0_0_35px_rgba(245,158,11,0.25)] order-first md:order-none"
                    : pos === 2
                    ? "bg-gradient-to-b from-cyan-500/15 via-[#0c1a30] to-[#060e1c] border-cyan-400/50 shadow-[0_0_25px_rgba(0,163,255,0.15)]"
                    : "bg-gradient-to-b from-sky-500/10 via-[#0c1a30] to-[#060e1c] border-sky-400/40"
                }`}
              >
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                    pos === 1
                      ? "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
                      : pos === 2
                      ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-md shadow-cyan-500/20"
                      : "bg-gradient-to-r from-sky-400 to-blue-600 text-white"
                  }`}
                >
                  JUARA #{pos}
                </span>
                <h3 className="text-xl font-extrabold text-white truncate">{champ.name}</h3>
                <p className="text-xs text-zinc-400 truncate">{champ.institution}</p>
                <div className="pt-2">
                  <span className={`font-mono text-3xl font-black ${
                    pos === 1 ? "text-amber-400" : pos === 2 ? "text-cyan-400" : "text-sky-300"
                  }`}>
                    {champ.totalPoints.toLocaleString("id-ID")}
                  </span>
                  <span className="text-xs text-zinc-400 ml-1">PTS</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#0a172c] hover:bg-[#0e213e] text-zinc-300 hover:text-white border border-cyan-800/40 text-xs font-semibold transition-colors"
          >
            Tutup Spotlight
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default SpotlightModal;


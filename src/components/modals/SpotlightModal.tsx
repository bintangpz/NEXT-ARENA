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
      className="bg-gradient-to-b from-[#1a1510] via-[#121216] to-[#09090b] border-yellow-500/40 text-center shadow-[0_0_80px_rgba(250,204,21,0.2)]"
    >
      <div className="space-y-8 py-2">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 text-xs font-bold uppercase tracking-widest">
            <Crown className="w-4 h-4 text-yellow-400" />
            NUSANTARA NEXT 2026 • OFFICIAL PODIUM SPOTLIGHT
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            TOP 3 CHAMPIONS OF{" "}
            <span className="bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 bg-clip-text text-transparent">
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
                    ? "bg-gradient-to-b from-yellow-500/20 to-zinc-950 border-yellow-400/60 md:scale-105 shadow-2xl order-first md:order-none"
                    : "bg-zinc-900/90 border-zinc-800"
                }`}
              >
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                    pos === 1
                      ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-zinc-950 shadow"
                      : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  JUARA #{pos}
                </span>
                <h3 className="text-xl font-extrabold text-white truncate">{champ.name}</h3>
                <p className="text-xs text-zinc-400 truncate">{champ.institution}</p>
                <div className="pt-2">
                  <span className="font-mono text-3xl font-black text-yellow-400">
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
            className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold transition-colors"
          >
            Tutup Spotlight
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default SpotlightModal;


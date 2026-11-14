"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Participant } from "@/data/mockCompetition";
import { ClipboardCheck, Trash2, Edit3, Building2, MapPin } from "lucide-react";

interface ParticipantDetailModalProps {
  isOpen: boolean;
  participant: Participant | null;
  onClose: () => void;
  onEdit: (participant: Participant) => void;
  onDelete: (participant: Participant) => void;
}

export function ParticipantDetailModal({
  isOpen,
  participant,
  onClose,
  onEdit,
  onDelete,
}: ParticipantDetailModalProps) {
  if (!participant) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      badge={
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold">
            {participant.category}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
            Status: {participant.status}
          </span>
        </div>
      }
      title={participant.name}
      subtitle={participant.institution}
      icon={
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${participant.avatarColor} flex items-center justify-center text-zinc-950 font-black text-sm`}
        >
          #{participant.previousRank || 1}
        </div>
      }
      footer={
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(participant);
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profil & Skor</span>
            </button>
            <button
              onClick={() => onDelete(participant)}
              className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Tim</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
          >
            Tutup Detail
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Rincian Skor Babak 1, 2, 3 */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
            <span className="text-[11px] text-zinc-400 block">Babak 1 (Penyisihan)</span>
            <span className="font-mono text-base font-bold text-white">
              {participant.scores.babak1}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
            <span className="text-[11px] text-zinc-400 block">Babak 2 (Semifinal)</span>
            <span className="font-mono text-base font-bold text-white">
              {participant.scores.babak2}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/90 border border-cyan-500/30">
            <span className="text-[11px] text-cyan-400 block">Babak 3 (Final)</span>
            <span className="font-mono text-base font-bold text-cyan-300">
              {participant.scores.babak3}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-amber-500/20 border border-cyan-500/40">
            <span className="text-[11px] text-amber-300 block font-semibold">
              Total Poin
            </span>
            <span className="font-mono text-lg font-black text-amber-400">
              {participant.totalPoints.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* Breakdown Kriteria Juri */}
        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-cyan-400" />
            <span>Rincian Kriteria Juri (Babak 3)</span>
          </h4>
          <div className="space-y-2 text-xs">
            {[
              { label: "Eksekusi Teknis", val: participant.criteria?.teknis ?? 200 },
              { label: "Inovasi & Solusi", val: participant.criteria?.inovasi ?? 200 },
              { label: "Kecepatan & Akurasi", val: participant.criteria?.kecepatan ?? 200 },
              { label: "Presentasi & Strategi", val: participant.criteria?.presentasi ?? 200 },
            ].map((c) => (
              <div key={c.label} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-300">{c.label}</span>
                  <span className="font-mono font-bold text-cyan-400">{c.val} / 250</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-amber-400"
                    style={{ width: `${Math.min(100, (c.val / 250) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default ParticipantDetailModal;


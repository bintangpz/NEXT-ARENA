"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Participant, ParticipantStatus } from "@/data/mockCompetition";
import { Edit3, Trash2 } from "lucide-react";

interface ParticipantEditModalProps {
  isOpen: boolean;
  participant: Participant | null;
  categories: string[];
  onClose: () => void;
  onSave: (updated: Participant, note?: string) => Promise<void> | void;
  onDelete: (participant: Participant) => Promise<void> | void;
}

export function ParticipantEditModal({
  isOpen,
  participant,
  categories,
  onClose,
  onSave,
  onDelete,
}: ParticipantEditModalProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    institution: "",
    city: "",
    category: "",
    status: "Aktif" as ParticipantStatus,
    babak1: 0,
    babak2: 0,
    babak3: 0,
    note: "Update Data & Skor Peserta",
  });

  useEffect(() => {
    if (participant) {
      setFormData({
        code: participant.code,
        name: participant.name,
        institution: participant.institution,
        city: participant.city,
        category: participant.category,
        status: participant.status,
        babak1: participant.scores.babak1,
        babak2: participant.scores.babak2,
        babak3: participant.scores.babak3,
        note: "Update Data & Skor Peserta",
      });
    }
  }, [participant]);

  if (!participant) return null;

  const totalPointsNew =
    Number(formData.babak1) + Number(formData.babak2) + Number(formData.babak3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: Participant = {
      ...participant,
      code: formData.code.trim() || participant.code,
      name: formData.name.trim() || participant.name,
      institution: formData.institution.trim() || participant.institution,
      city: formData.city.trim() || participant.city,
      category: formData.category || participant.category,
      status: formData.status,
      scores: {
        babak1: Number(formData.babak1),
        babak2: Number(formData.babak2),
        babak3: Number(formData.babak3),
      },
      totalPoints: totalPointsNew,
      lastUpdated: "Baru saja",
    };

    onSave(updated, formData.note);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      icon={<Edit3 className="w-5 h-5 text-cyan-400" />}
      title={`Kelola Data Tim: ${participant.name}`}
      subtitle="Ubah profil tim, kategori lomba, dan skor babak 1-3"
      footer={
        <div className="w-full flex items-center justify-between">
          <button
            type="button"
            onClick={() => onDelete(participant)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Peserta</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold hover:bg-zinc-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold hover:brightness-110 transition-all shadow-md shadow-cyan-500/20"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Nama Tim */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Nama Peserta / Tim *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Row 2: Instansi & Kota */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Asal Instansi / Kampus</label>
            <input
              type="text"
              required
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Kota / Provinsi</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Row 3: Kategori & Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Kategori Lomba</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Status Peserta</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as ParticipantStatus,
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="Finalis">Finalis</option>
              <option value="Aktif">Aktif</option>
              <option value="Gugur">Gugur</option>
            </select>
          </div>
        </div>

        {/* Row 4: Skor Babak 1, 2, 3 */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Skor Babak 1</label>
            <input
              type="number"
              min={0}
              max={1000}
              value={formData.babak1}
              onChange={(e) =>
                setFormData({ ...formData, babak1: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Skor Babak 2</label>
            <input
              type="number"
              min={0}
              max={1000}
              value={formData.babak2}
              onChange={(e) =>
                setFormData({ ...formData, babak2: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-cyan-400 font-medium mb-1">
              Skor Babak 3
            </label>
            <input
              type="number"
              min={0}
              max={1000}
              value={formData.babak3}
              onChange={(e) =>
                setFormData({ ...formData, babak3: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-cyan-500/50 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Total Akumulasi Preview */}
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Total Akumulasi Poin Baru:</span>
          <span className="font-mono text-lg font-extrabold text-cyan-400">
            {totalPointsNew.toLocaleString("id-ID")} PTS
          </span>
        </div>
      </form>
    </Modal>
  );
}

export default ParticipantEditModal;


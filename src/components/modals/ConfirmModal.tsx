"use client";

import React from "react";
import { AlertTriangle, Trash2, HelpCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  subMessage?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Tindakan",
  message,
  subMessage,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      size="md"
      title={title}
      icon={
        isDanger ? (
          <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
            <Trash2 className="w-4 h-4" />
          </div>
        ) : isWarning ? (
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <HelpCircle className="w-4 h-4" />
          </div>
        )
      }
    >
      <div className="py-2 space-y-3">
        <p className="text-sm sm:text-base font-semibold text-zinc-100 leading-relaxed">
          {message}
        </p>

        {subMessage && (
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            {subMessage}
          </p>
        )}

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800/80">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              onConfirm();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-lg disabled:opacity-50 ${
              isDanger
                ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-500/20"
                : isWarning
                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-orange-500/20 text-zinc-950 font-extrabold"
                : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-cyan-500/20"
            }`}
          >
            {isLoading ? "Memproses..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}


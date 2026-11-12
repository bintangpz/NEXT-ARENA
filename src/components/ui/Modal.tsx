"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full";
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  className?: string;
}

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  full: "max-w-[95vw] w-[95vw]",
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  icon,
  size = "md",
  children,
  footer,
  closeOnOverlayClick = true,
  className = "",
}: ModalProps) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop with Blur */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative z-10 w-full ${sizeClasses[size]} bg-[#141419] border border-zinc-800/90 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header (Rendered if title, badge, or close button needed) */}
        {(title || subtitle || badge || icon) && (
          <div className="flex items-start justify-between gap-4 px-6 py-4 sm:py-5 border-b border-zinc-800/80 shrink-0 bg-zinc-950/40">
            <div className="flex items-start gap-3 min-w-0">
              {icon && (
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {badge && <div className="mb-1">{badge}</div>}
                {title && (
                  <h3 className="text-lg font-bold text-white tracking-tight truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{subtitle}</p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-colors shrink-0"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* If no header was rendered, still give an absolute close button */}
        {!title && !subtitle && !badge && !icon && (
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 z-20 p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Modal Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">{children}</div>

        {/* Modal Footer (Optional) */}
        {footer && (
          <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-950/40 shrink-0 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;


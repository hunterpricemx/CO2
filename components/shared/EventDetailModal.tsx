"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { formatSchedule } from "@/modules/events/types";
import type { EventRow } from "@/modules/events/types";

export interface ModalLabels {
  schedule: string;
  description: string;
  rewards: string;
  close: string;
}

interface Props {
  event: EventRow;
  locale: string;
  labels: ModalLabels;
  onClose: () => void;
}

function evLocale(es: string | null, en: string | null, pt: string | null, locale: string): string {
  if (locale === "en") return en ?? es ?? "";
  if (locale === "pt") return pt ?? es ?? "";
  return es ?? "";
}

export function EventDetailModal({ event, locale, labels, onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const title = evLocale(event.title_es, event.title_en, event.title_pt, locale);
  const description = evLocale(event.description_es ?? null, event.description_en ?? null, event.description_pt ?? null, locale);
  const rewards = evLocale(event.rewards_es ?? null, event.rewards_en ?? null, event.rewards_pt ?? null, locale);
  const scheduleText = formatSchedule(event.schedule, locale as "es" | "en" | "pt");

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #1a1320 0%, #0f0e1a 100%)",
          border: "2px solid rgba(243,156,18,0.5)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Featured image */}
        {event.featured_image && (
          <div className="relative h-48 w-full shrink-0">
            <Image
              src={event.featured_image}
              alt={title}
              fill
              className="object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 40%, #1a1320 100%)",
              }}
            />
          </div>
        )}

        <div className="p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
            style={{ background: "rgba(255,255,255,0.1)" }}
            aria-label={labels.close}
          >
            ✕
          </button>

          {/* Title */}
          <h3 className="font-bebas text-2xl text-[#f39c12] uppercase tracking-wider mb-4 pr-10">
            {title}
          </h3>

          {/* Schedule */}
          {scheduleText && (
            <div className="mb-4">
              <p className="font-poppins text-xs font-semibold text-[#f39c12] uppercase tracking-wider mb-1">
                📅 {labels.schedule}
              </p>
              <p className="font-poppins text-sm text-[#e0e0f0]">{scheduleText}</p>
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="mb-4">
              <p className="font-poppins text-xs font-semibold text-[#f39c12] uppercase tracking-wider mb-1">
                📝 {labels.description}
              </p>
              <p className="font-poppins text-sm text-[#c8c8e0] leading-relaxed whitespace-pre-line">
                {description}
              </p>
            </div>
          )}

          {/* Rewards */}
          {rewards && (
            <div>
              <p className="font-poppins text-xs font-semibold text-[#f39c12] uppercase tracking-wider mb-1">
                🏆 {labels.rewards}
              </p>
              <p className="font-poppins text-sm text-[#c8c8e0] leading-relaxed whitespace-pre-line">
                {rewards}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

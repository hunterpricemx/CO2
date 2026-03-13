"use client";

import { useState, useEffect } from "react";
import { getNextOccurrenceMs, formatSchedule } from "@/modules/events/types";
import type { EventRow } from "@/modules/events/types";
import { EventDetailModal } from "./EventDetailModal";
import type { ModalLabels } from "./EventDetailModal";

interface Props {
  events: EventRow[];
  locale: string;
  noEventsLabel: string;
  live: string;
  soon: string;
  modalLabels: ModalLabels;
}

function evTitle(ev: EventRow, locale: string): string {
  if (locale === "en") return ev.title_en;
  if (locale === "pt") return ev.title_pt;
  return ev.title_es;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}h ${mm}m ${ss}s`;
  return `${mm}m ${ss}s`;
}

export function HeroNextEvent({ events, locale, noEventsLabel, live, soon, modalLabels }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, []);

  const refDate = now ?? new Date();

  const nextEvent =
    events.length === 0
      ? null
      : [...events].sort(
          (a, b) =>
            getNextOccurrenceMs(a.schedule, refDate) -
            getNextOccurrenceMs(b.schedule, refDate),
        )[0];

  const ms = nextEvent ? getNextOccurrenceMs(nextEvent.schedule, refDate) : Infinity;
  const scheduleText = nextEvent
    ? formatSchedule(nextEvent.schedule, locale as "es" | "en" | "pt")
    : "";

  function getBadge(): { text: string; color: string; bg: string } {
    if (ms <= 0)
      return { text: live, color: "#ff4444", bg: "rgba(255,68,68,0.15)" };
    if (ms < 30 * 60 * 1000)
      return { text: soon, color: "#f39c12", bg: "rgba(243,156,18,0.15)" };
    return { text: formatCountdown(ms), color: "#ffd700", bg: "rgba(255,215,0,0.1)" };
  }

  const badge = nextEvent ? getBadge() : null;

  return (
    <>
      <div className="overflow-hidden">
        {!nextEvent ? (
          <p className="text-sm text-gray-400">{noEventsLabel}</p>
        ) : (
          <div
            className="flex items-start justify-between gap-2 cursor-pointer group"
            onClick={() => setOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
          >
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              {/* Badge */}
              {badge && (
                <span
                  className="font-mono text-[10px] font-bold self-start px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{ color: badge.color, background: badge.bg }}
                  suppressHydrationWarning
                >
                  {badge.text}
                </span>
              )}
              {/* Name */}
              <span className="font-poppins text-[#f39c12] text-sm font-semibold leading-tight group-hover:text-[#ffd700] transition-colors">
                {evTitle(nextEvent, locale)}
              </span>
              {/* Schedule + starts-in */}
              {scheduleText && (
                <span className="font-poppins text-[#e0e0e0] text-[11px] opacity-90 line-clamp-2">
                  {scheduleText}
                </span>
              )}
            </div>
            <span className="shrink-0 text-base text-[#f39c12] opacity-50 group-hover:opacity-100 transition-opacity leading-none mt-0.5">
              ›
            </span>
          </div>
        )}
      </div>

      {open && nextEvent && (
        <EventDetailModal
          event={nextEvent}
          locale={locale}
          labels={modalLabels}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

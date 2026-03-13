"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatSchedule, getNextOccurrenceMs } from "@/modules/events/types";
import type { EventRow } from "@/modules/events/types";
import { EventDetailModal } from "./EventDetailModal";
import type { ModalLabels } from "./EventDetailModal";

interface Props {
  events: EventRow[];
  locale: string;
  eventsUrl: string;
  /** Translated labels passed from the server component */
  labels: {
    title: string;
    viewAll: string;
    noEvents: string;
    live: string;
    soon: string;
    startsIn: string;
  };
  modalLabels: ModalLabels;
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

function evTitle(ev: EventRow, locale: string): string {
  if (locale === "en") return ev.title_en;
  if (locale === "pt") return ev.title_pt;
  return ev.title_es;
}

export function EventsCountdownSidebar({ events, locale, eventsUrl, labels, modalLabels }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 1000);
    tick(); // initial tick inside the callback — avoids cascading render warning
    return () => clearInterval(id);
  }, []);

  // Before hydration show events in their original order (no countdown yet)
  const refDate = now ?? new Date();

  const sorted = [...events]
    .map((ev) => ({ ev, ms: getNextOccurrenceMs(ev.schedule, refDate) }))
    .sort((a, b) => a.ms - b.ms)
    .slice(0, 6);

  function getBadge(ms: number): { text: string; color: string; bg: string } {
    if (ms <= 0)
      return { text: labels.live, color: "#ff4444", bg: "rgba(255,68,68,0.15)" };
    if (ms < 30 * 60 * 1000)
      return { text: labels.soon, color: "#f39c12", bg: "rgba(243,156,18,0.15)" };
    return {
      text: formatCountdown(ms),
      color: "#ffd700",
      bg: "rgba(255,215,0,0.1)",
    };
  }

  return (
    <>
      <div className="flex flex-col gap-2 mb-4">
        {sorted.length === 0 ? (
          <p className="font-poppins text-sm text-[#b4b4c8]">{labels.noEvents}</p>
        ) : (
          sorted.map(({ ev, ms }) => {
            const badge = getBadge(ms);
            const scheduleText = formatSchedule(
              ev.schedule,
              locale as "es" | "en" | "pt",
            );
            return (
              <div
                key={ev.id}
                className="rounded-xl p-3 hover:translate-x-1 transition-transform duration-300 cursor-pointer group"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(40,40,60,0.5), rgba(30,30,50,0.6))",
                  borderLeft: "3px solid #ffd700",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderLeftWidth: "3px",
                  borderLeftColor: "#ffd700",
                  borderLeftStyle: "solid",
                }}
                onClick={() => setSelectedEvent(ev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelectedEvent(ev)}
              >
                {/* Name + badge row */}
                <div className="flex items-center justify-between gap-2">
                  <p className="font-poppins text-sm font-semibold text-[#e0e0f0] truncate flex-1 group-hover:text-[#ffd700] transition-colors">
                    {evTitle(ev, locale)}
                  </p>
                  <span
                    className="font-mono text-[10px] font-bold shrink-0 px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{ color: badge.color, background: badge.bg }}
                    suppressHydrationWarning
                  >
                    {badge.text}
                  </span>
                </div>

                {/* Schedule + starts-in row */}
                {scheduleText && (
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <p className="font-poppins text-[11px] text-[#8888a8] truncate">
                      {scheduleText}
                    </p>
                    {ms > 0 && now && (
                      <p className="font-mono text-[11px] text-[#b4b4c8] shrink-0">
                        {labels.startsIn}{" "}
                        <span style={{ color: badge.color }}>
                          {formatCountdown(ms)}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Link
        href={eventsUrl}
        className="block text-center py-3 rounded-lg font-poppins font-bold text-black text-sm transition-all hover:brightness-110"
        style={{
          background: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
        }}
      >
        📅 {labels.viewAll}
      </Link>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          locale={locale}
          labels={modalLabels}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}

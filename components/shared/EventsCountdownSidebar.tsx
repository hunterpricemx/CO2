"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  formatSchedule,
  getNextOccurrenceMs,
  type ScheduleEntry,
} from "@/modules/events/types";
import type { EventRow } from "@/modules/events/types";
import { EventDetailModal } from "./EventDetailModal";
import type { ModalLabels } from "./EventDetailModal";
import { toServerTz } from "@/lib/server-tz";

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

/** Ventana LIVE: si el evento arrancó hace menos de esto, se considera en curso */
const LIVE_WINDOW_MS = 30 * 60 * 1000;

function getNextOccurrenceDate(
  schedule: ScheduleEntry[] | string | unknown,
  now: Date,
): Date | null {
  let entries: unknown = schedule;
  if (typeof entries === "string") {
    try {
      entries = JSON.parse(entries);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(entries) || entries.length === 0) return null;

  const dayToDow: Record<string, number | "daily" | "first_of_month"> = {
    daily: "daily",
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
    first_of_month: "first_of_month",
  };

  const nowTz = toServerTz(now);
  let next: Date | null = null;

  for (const entry of entries as ScheduleEntry[]) {
    const [h, m] = entry.time.split(":").map(Number);
    const dow = dayToDow[entry.day];
    if (dow === undefined || Number.isNaN(h) || Number.isNaN(m)) continue;

    const candidate = new Date(nowTz);
    candidate.setSeconds(0, 0);
    candidate.setHours(h, m, 0, 0);

    if (dow === "daily") {
      if (candidate.getTime() < nowTz.getTime() - LIVE_WINDOW_MS)
        candidate.setDate(candidate.getDate() + 1);
    } else if (dow === "first_of_month") {
      candidate.setDate(1);
      if (candidate.getTime() < nowTz.getTime() - LIVE_WINDOW_MS) {
        candidate.setMonth(candidate.getMonth() + 1);
        candidate.setDate(1);
      }
    } else {
      const currentDow = nowTz.getDay();
      let daysUntil = ((dow as number) - currentDow + 7) % 7;
      if (daysUntil === 0 && candidate.getTime() < nowTz.getTime() - LIVE_WINDOW_MS)
        daysUntil = 7;
      candidate.setDate(candidate.getDate() + daysUntil);
    }

    if (!next || candidate.getTime() < next.getTime()) {
      next = candidate;
    }
  }

  return next;
}

function formatEventTime(date: Date | null): string {
  if (!date) return "--:--";
  // date está en espacio fake-local del servidor, getHours/getMinutes dan hora servidor
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
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

  function getBadge(ms: number, nextAt: Date | null): { text: string; color: string; bg: string } {
    const isLive = ms <= 0;
    const isSoon = ms > 0 && ms < 30 * 60 * 1000;

    return {
      text: isLive ? `${formatEventTime(nextAt)} ●` : formatEventTime(nextAt),
      color: isLive ? "#ff4444" : isSoon ? "#f39c12" : "#ffd700",
      bg: isLive
        ? "rgba(255,68,68,0.15)"
        : isSoon
          ? "rgba(243,156,18,0.15)"
          : "rgba(255,215,0,0.1)",
    };
  }

  return (
    <>
      <div className="flex flex-col gap-2 mb-4">
        {sorted.length === 0 ? (
          <p className="font-poppins text-sm text-[#b4b4c8]">{labels.noEvents}</p>
        ) : (
          sorted.map(({ ev, ms }) => {
            const nextAt = getNextOccurrenceDate(ev.schedule, refDate);
            const badge = getBadge(ms, nextAt);
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
                    {now && ms <= 0 ? (
                      <p className="font-mono text-[11px] font-bold shrink-0" style={{ color: "#ff4444" }}>
                        EN VIVO
                      </p>
                    ) : ms > 0 && now ? (
                      <p className="font-mono text-[11px] text-[#b4b4c8] shrink-0">
                        {labels.startsIn}{" "}
                        <span style={{ color: badge.color }}>
                          {formatCountdown(ms)}
                        </span>
                      </p>
                    ) : null}
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

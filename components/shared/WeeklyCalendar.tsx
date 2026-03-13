"use client";

import { useState } from "react";
import { Clock, Trophy, X, Star, ImageOff } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CalendarEvent = {
  id: string;
  title: string;
  time: string;
  version: string;
  description?: string | null;
  rewards?: string | null;
  featured_image?: string | null;
};

export type CalendarData = {
  daily: CalendarEvent[];
  byDay: Partial<Record<WeekDay, CalendarEvent[]>>;
  firstOfMonth: CalendarEvent[];
};

export type WeekDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type CalendarLabels = {
  daily_events: string;
  first_of_month_events: string;
  no_events_day: string;
  schedule: string;
  rewards: string;
  description: string;
  close: string;
  view_details: string;
  empty: string;
};

const WEEK_DAYS: WeekDay[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

// JS getDay() → 0=Sun
const DOW_INDEX: Record<WeekDay, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// ── Version badge ──────────────────────────────────────────────────────────────

function VersionBadge({ version }: { version: string }) {
  const label =
    version === "both" ? "1.0 + 2.0" : version === "1.0" ? "1.0" : "2.0";
  return (
    <span className="text-[9px] bg-gold/10 border border-gold/20 text-gold rounded-full px-1.5 py-0.5 font-semibold shrink-0">
      {label}
    </span>
  );
}

// ── Event chip (inside a day column) ─────────────────────────────────────────

function EventChip({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: (e: CalendarEvent) => void;
}) {
  return (
    <button
      onClick={() => onClick(event)}
      className="w-full text-left group flex flex-col gap-1 bg-surface/60 hover:bg-surface border border-surface/50 hover:border-gold/30 rounded-lg px-2.5 py-2 transition-all duration-150 cursor-pointer"
    >
      <div className="flex items-center gap-1.5">
        <Clock className="h-2.5 w-2.5 text-gold shrink-0" />
        <span className="text-[10px] font-bold text-gold tabular-nums">{event.time}</span>
        <VersionBadge version={event.version} />
      </div>
      <span className="text-xs text-foreground/90 font-medium leading-snug group-hover:text-gold transition-colors line-clamp-2">
        {event.title}
      </span>
    </button>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function EventModal({
  event,
  labels,
  onClose,
}: {
  event: CalendarEvent;
  labels: CalendarLabels;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-md bg-background border border-surface rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Featured image */}
        {event.featured_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.featured_image}
            alt={event.title}
            className="w-full h-44 object-cover"
          />
        ) : (
          <div className="w-full h-20 bg-surface/60 flex items-center justify-center border-b border-surface/50">
            <ImageOff className="h-6 w-6 text-white/20" />
          </div>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-full bg-background/80 border border-surface hover:border-gold/40 text-muted-foreground hover:text-gold transition-colors"
          aria-label={labels.close}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* Title + meta */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold text-base leading-snug">{event.title}</h2>
            <VersionBadge version={event.version} />
          </div>

          {/* Time */}
          <div className="flex items-center gap-1.5 text-sm text-gold">
            <Clock className="h-4 w-4" />
            <span className="tabular-nums font-semibold">{event.time}</span>
          </div>

          {/* Description */}
          {event.description && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {labels.description}
              </span>
              <div
                className="prose prose-sm prose-invert max-w-none text-sm text-foreground/80 leading-relaxed [&_strong]:text-gold [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:pl-4 [&_ol]:pl-4"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            </div>
          )}

          {/* Rewards */}
          {event.rewards && (
            <div className="flex flex-col gap-1.5 bg-gold/5 border border-gold/15 rounded-lg p-3">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-gold" />
                <span className="text-xs font-semibold text-gold uppercase tracking-wider">
                  {labels.rewards}
                </span>
              </div>
              <div
                className="text-xs text-foreground/80 leading-relaxed [&_ul]:pl-4 [&_ol]:pl-4 [&_strong]:text-gold"
                dangerouslySetInnerHTML={{ __html: event.rewards }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Calendar ─────────────────────────────────────────────────────────────

export function WeeklyCalendar({
  data,
  dayLabels,
  labels,
}: {
  data: CalendarData;
  dayLabels: Record<WeekDay, string>;
  labels: CalendarLabels;
}) {
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const todayDow = new Date().getDay(); // 0=Sun,1=Mon,...

  const hasAny =
    data.daily.length > 0 ||
    data.firstOfMonth.length > 0 ||
    WEEK_DAYS.some((d) => (data.byDay[d]?.length ?? 0) > 0);

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Star className="h-12 w-12 text-white/15" />
        <p className="text-muted-foreground">{labels.empty}</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Daily events banner ─────────────────────────────────────── */}
      {data.daily.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gold">
            {labels.daily_events}
          </h2>
          <div className="flex flex-wrap gap-3">
            {data.daily.map((ev) => (
              <button
                key={ev.id + "-" + ev.time + "-daily"}
                onClick={() => setSelected(ev)}
                className="flex items-center gap-2 bg-gold/10 border border-gold/25 hover:border-gold/50 rounded-full px-4 py-1.5 transition-colors cursor-pointer"
              >
                <Clock className="h-3 w-3 text-gold" />
                <span className="text-xs font-medium text-gold/90">{ev.time}</span>
                <span className="text-xs text-foreground/80 font-medium">{ev.title}</span>
                <VersionBadge version={ev.version} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Weekly grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {WEEK_DAYS.map((day) => {
          const dow = DOW_INDEX[day];
          const isToday = dow === todayDow;
          const events = data.byDay[day] ?? [];

          return (
            <div
              key={day}
              className={`flex flex-col gap-2 rounded-xl border p-3 min-h-36 transition-colors ${
                isToday
                  ? "border-gold/40 bg-gold/5"
                  : "border-surface/50 bg-surface/30"
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isToday ? "text-gold" : "text-muted-foreground"
                  }`}
                >
                  {dayLabels[day]}
                </span>
                {isToday && (
                  <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
                )}
              </div>

              {/* Events */}
              {events.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/40 italic text-center mt-2">
                  {labels.no_events_day}
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {events.map((ev) => (
                    <EventChip key={ev.id + "-" + day} event={ev} onClick={setSelected} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── First-of-month section ───────────────────────────────────── */}
      {data.firstOfMonth.length > 0 && (
        <div className="flex flex-col gap-3 mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gold">
            {labels.first_of_month_events}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.firstOfMonth.map((ev) => (
              <button
                key={ev.id + "-" + ev.time + "-monthly"}
                onClick={() => setSelected(ev)}
                className="flex flex-col gap-2 text-left bg-surface/40 border border-surface/50 hover:border-gold/30 rounded-xl p-4 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 text-gold" />
                  <span className="text-xs font-bold text-gold tabular-nums">{ev.time}</span>
                  <VersionBadge version={ev.version} />
                </div>
                <span className="text-sm font-medium leading-snug">{ev.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Detail modal ─────────────────────────────────────────────── */}
      {selected && (
        <EventModal
          event={selected}
          labels={labels}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

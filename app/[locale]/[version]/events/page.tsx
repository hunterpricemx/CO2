import Link from "next/link";
import { ChevronRight, CalendarDays } from "lucide-react";
import { getSiteSettings, getVersionAssets, buildPageSeo } from "@/lib/site-settings";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getPublishedEvents } from "@/modules/events/queries";
import type { EventRow, ScheduleEntry } from "@/modules/events/types";
import {
  WeeklyCalendar,
  type CalendarData,
  type CalendarEvent,
  type WeekDay,
} from "@/components/shared/WeeklyCalendar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}): Promise<Metadata> {
  void params;
  const settings = await getSiteSettings();
  return buildPageSeo(settings, "events", "Eventos");
}

// ── Build calendar data from events list ──────────────────────────────────────

function buildCalendarData(
  events: EventRow[],
  locale: string,
): CalendarData {
  const daily: CalendarEvent[] = [];
  const byDay: Partial<Record<WeekDay, CalendarEvent[]>> = {};
  const firstOfMonth: CalendarEvent[] = [];

  const weekDays: WeekDay[] = [
    "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
  ];
  for (const d of weekDays) byDay[d] = [];

  for (const ev of events) {
    const title =
      locale === "en" ? ev.title_en : locale === "pt" ? ev.title_pt : ev.title_es;
    const description =
      locale === "en"
        ? ev.description_en
        : locale === "pt"
        ? ev.description_pt
        : ev.description_es;
    const rewards =
      locale === "en"
        ? ev.rewards_en
        : locale === "pt"
        ? ev.rewards_pt
        : ev.rewards_es;

    let schedule: ScheduleEntry[] = [];
    if (typeof ev.schedule === "string") {
      try { schedule = JSON.parse(ev.schedule); } catch { schedule = []; }
    } else if (Array.isArray(ev.schedule)) {
      schedule = ev.schedule as ScheduleEntry[];
    }

    for (const entry of schedule) {
      const cal: CalendarEvent = {
        id: ev.id,
        title,
        time: entry.time,
        version: ev.version,
        description,
        rewards,
        featured_image: ev.featured_image,
      };

      if (entry.day === "daily") {
        // Deduplicate daily by event id+time
        if (!daily.find((d) => d.id === ev.id && d.time === entry.time)) {
          daily.push(cal);
        }
      } else if (entry.day === "first_of_month") {
        if (!firstOfMonth.find((d) => d.id === ev.id && d.time === entry.time)) {
          firstOfMonth.push(cal);
        }
      } else if (weekDays.includes(entry.day as WeekDay)) {
        byDay[entry.day as WeekDay]!.push(cal);
      }
    }
  }

  // Sort each day's events by time
  for (const d of weekDays) {
    byDay[d]!.sort((a, b) => a.time.localeCompare(b.time));
  }
  daily.sort((a, b) => a.time.localeCompare(b.time));
  firstOfMonth.sort((a, b) => a.time.localeCompare(b.time));

  return { daily, byDay, firstOfMonth };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}) {
  const { locale, version } = await params;
  const t = await getTranslations("events");

  const events = await getPublishedEvents({ version: version as "1.0" | "2.0" });
  const calendarData = buildCalendarData(events, locale);

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);

  const homeHref = locale === "es" ? `/${version}` : `/${locale}/${version}`;

  const dayLabels: Record<WeekDay, string> = {
    monday:    t("day_monday"),
    tuesday:   t("day_tuesday"),
    wednesday: t("day_wednesday"),
    thursday:  t("day_thursday"),
    friday:    t("day_friday"),
    saturday:  t("day_saturday"),
    sunday:    t("day_sunday"),
  };

  const calLabels = {
    daily_events:        t("daily_events"),
    first_of_month_events: t("first_of_month_events"),
    no_events_day:       t("no_events_day"),
    schedule:            t("schedule"),
    rewards:             t("rewards"),
    description:         t("description"),
    close:               t("close"),
    view_details:        t("view_details"),
    empty:               t("no_events"),
  };

  return (
    <div className="flex flex-col">

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section
        className="relative flex items-center justify-center"
        style={{
          minHeight: "40vh",
          backgroundImage: `url('${heroBg}')`,
          backgroundSize: "cover",
          backgroundPosition: "50% 24%",
          backgroundRepeat: "no-repeat",
          paddingTop: "4rem",
          paddingBottom: "4rem",
        }}
      >
        <div className="absolute inset-0 z-0" style={{ background: "rgba(0,0,0,0.80)" }} />

        <div className="relative z-10 flex flex-col items-center gap-5 text-center px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Logo" className="h-20 object-contain drop-shadow-lg" />

          <nav className="flex items-center gap-2 text-xs text-white/60">
            <Link href={homeHref} className="hover:text-gold transition-colors">
              {t("breadcrumb_home")}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gold font-medium">{t("breadcrumb_events")}</span>
          </nav>

          <h1
            className="font-bebas tracking-widest uppercase drop-shadow-lg"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
          >
            {t("title")}
          </h1>

          <p className="font-poppins text-base text-white/80 max-w-lg">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* ═══════════════════════ CALENDAR ═══════════════════════ */}
      <section className="px-4 py-12" style={{ background: "#080808" }}>
        <div className="container mx-auto max-w-7xl flex flex-col gap-6">

          {/* Section label */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-gold" />
            <span className="text-sm font-medium">{t("weekly_schedule")}</span>
          </div>

          <WeeklyCalendar
            data={calendarData}
            dayLabels={dayLabels}
            labels={calLabels}
          />
        </div>
      </section>
    </div>
  );
}

/**
 * Events Module — Types
 *
 * @module modules/events/types
 */

import { z } from "zod";
import type { ContentStatus, GameVersion } from "@/types";
import type { Database } from "@/lib/supabase/database.types";
import { toServerTz } from "@/lib/server-tz";

/** A row from the `events` table. */
export type EventRow = Database["public"]["Tables"]["events"]["Row"];

/** Days available for event scheduling. */
export const SCHEDULE_DAYS = [
  "daily",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "first_of_month",
] as const;

export type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

export const scheduleEntrySchema = z.object({
  day: z.enum(SCHEDULE_DAYS),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
});

export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;

/** Human-readable labels for schedule days (multilingual). */
export const SCHEDULE_DAY_LABELS: Record<ScheduleDay, { es: string; en: string; pt: string }> = {
  daily:          { es: "Todos los días",      en: "Every day",           pt: "Todos os dias" },
  monday:         { es: "Lunes",               en: "Monday",              pt: "Segunda" },
  tuesday:        { es: "Martes",              en: "Tuesday",             pt: "Terça" },
  wednesday:      { es: "Miércoles",           en: "Wednesday",           pt: "Quarta" },
  thursday:       { es: "Jueves",              en: "Thursday",            pt: "Quinta" },
  friday:         { es: "Viernes",             en: "Friday",              pt: "Sexta" },
  saturday:       { es: "Sábado",              en: "Saturday",            pt: "Sábado" },
  sunday:         { es: "Domingo",             en: "Sunday",              pt: "Domingo" },
  first_of_month: { es: "Primer día del mes",  en: "First day of month",  pt: "Primeiro dia do mês" },
};

/**
 * Formats a schedule array into a human-readable string.
 * @example formatSchedule([{day:"monday",time:"20:00"},{day:"wednesday",time:"20:00"}], "es")
 * // "Lunes 20:00 · Miércoles 20:00"
 */
export function formatSchedule(
  schedule: ScheduleEntry[] | string | unknown,
  locale: "es" | "en" | "pt" = "es",
): string {
  let entries: unknown = schedule;
  if (typeof entries === "string") {
    try { entries = JSON.parse(entries); } catch { return String(entries); }
  }
  if (!Array.isArray(entries) || entries.length === 0) return "";
  return (entries as ScheduleEntry[])
    .map((entry) => `${SCHEDULE_DAY_LABELS[entry.day]?.[locale] ?? entry.day} ${entry.time}`)
    .join(" · ");
}

/** Maps ScheduleDay to JS day-of-week index (0=Sun) or special values. */
const DAY_TO_DOW: Record<ScheduleDay, number | "daily" | "first_of_month"> = {
  daily:          "daily",
  monday:         1,
  tuesday:        2,
  wednesday:      3,
  thursday:       4,
  friday:         5,
  saturday:       6,
  sunday:         0,
  first_of_month: "first_of_month",
};

/**
 * Returns milliseconds until the next occurrence of any entry in `schedule`.
 * Pass `now` to override the reference time (useful in tests).
 */
export function getNextOccurrenceMs(
  schedule: ScheduleEntry[] | string | unknown,
  now: Date = new Date(),
): number {
  let entries: unknown = schedule;
  if (typeof entries === "string") {
    try { entries = JSON.parse(entries); } catch { return Infinity; }
  }
  if (!Array.isArray(entries) || entries.length === 0) return Infinity;

  // Interpretar los horarios en la timezone del servidor de juego
  const nowTz = toServerTz(now);

  let min = Infinity;
  for (const entry of entries as ScheduleEntry[]) {
    const [h, m] = entry.time.split(":").map(Number);
    const dow = DAY_TO_DOW[entry.day];
    const candidate = new Date(nowTz); // operar en el espacio de la timezone del servidor
    candidate.setSeconds(0, 0);
    candidate.setHours(h, m, 0, 0);

    if (dow === "daily") {
      if (candidate.getTime() <= nowTz.getTime()) candidate.setDate(candidate.getDate() + 1);
    } else if (dow === "first_of_month") {
      candidate.setDate(1);
      if (candidate.getTime() <= nowTz.getTime()) {
        candidate.setMonth(candidate.getMonth() + 1);
        candidate.setDate(1);
      }
    } else {
      const currentDow = nowTz.getDay(); // día de semana en timezone del servidor
      let daysUntil = ((dow as number) - currentDow + 7) % 7;
      if (daysUntil === 0 && candidate.getTime() <= nowTz.getTime()) daysUntil = 7;
      candidate.setDate(candidate.getDate() + daysUntil);
    }

    // La diferencia en el espacio fake-local == ms reales hasta el evento
    const ms = candidate.getTime() - nowTz.getTime();
    if (ms < min) min = ms;
  }
  return min;
}

/** Input for creating or updating an event (used in forms and Server Actions). */
export const eventSchema = z.object({
  title_es: z.string().min(1, "Título en español requerido"),
  title_en: z.string().min(1, "English title required"),
  title_pt: z.string().min(1, "Título em português obrigatório"),
  schedule: z.array(scheduleEntrySchema).min(1, "Al menos un horario requerido"),
  description_es: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  description_pt: z.string().optional().nullable(),
  rewards_es: z.string().optional().nullable(),
  rewards_en: z.string().optional().nullable(),
  rewards_pt: z.string().optional().nullable(),
  featured_image: z.string().url("URL inválida").optional().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  version: z.enum(["1.0", "2.0", "both"]),
});

export type CreateEventInput = z.infer<typeof eventSchema>;
export type UpdateEventInput = Partial<CreateEventInput>;
/** Alias used in form components. */
export type EventFormData = CreateEventInput;

/** Event with only the fields needed for a public listing card. */
export interface EventCardData {
  id: string;
  title: string;       // resolved for the current locale
  schedule: string;
  description: string | null;
  featured_image: string | null;
  status: ContentStatus;
  version: GameVersion;
}

/** Filters for querying events */
export interface EventFilters {
  status?: ContentStatus;
  version?: GameVersion;
  search?: string;
}

/**
 * server-tz.ts
 *
 * Convierte fechas a la timezone del servidor de juego para que los cálculos
 * de horarios de eventos sean correctos independientemente de la timezone del
 * browser o del servidor Node.js.
 *
 * Configura: NEXT_PUBLIC_SERVER_TIMEZONE en .env.local
 * Ejemplo:   NEXT_PUBLIC_SERVER_TIMEZONE=America/New_York
 * Default:   UTC
 *
 * Lista IANA: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
 */

export const SERVER_TZ: string =
  process.env.NEXT_PUBLIC_SERVER_TIMEZONE ?? "America/New_York";

/**
 * Devuelve un Date "fake-local" que representa la fecha real `date` pero con
 * los valores de hora/día/mes correspondientes a SERVER_TZ.
 *
 * Sus métodos .getHours(), .getDay(), .getDate(), etc. devuelven valores EN la
 * timezone del servidor, lo que permite comparaciones correctas de horarios.
 *
 * La diferencia en ms entre el fake-local y el Date real es equivalente al
 * countdown real hasta el evento:
 *   ms_until_event = candidateFake.getTime() - nowFake.getTime()
 */
export function toServerTz(date: Date): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: SERVER_TZ }));
}

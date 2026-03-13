"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface ClockInfo {
  label: string;
  timezone: string;
}

const SERVER_CLOCKS: ClockInfo[] = [
  { label: "US", timezone: "America/New_York" },
  { label: "EU", timezone: "Europe/Madrid" },
];

function formatTime(date: Date, timezone: string): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatLocalTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * ServerClock
 *
 * Displays live US, EU server clocks and local time updated every second.
 * Client component — uses setInterval internally.
 */
export function ServerClock() {
  const [times, setTimes] = useState<Record<string, string>>({});
  const [localTime, setLocalTime] = useState("--:--:--");

  useEffect(() => {
    function tick() {
      const now = new Date();
      const updated: Record<string, string> = {};
      for (const c of SERVER_CLOCKS) {
        updated[c.label] = formatTime(now, c.timezone);
      }
      setTimes(updated);
      setLocalTime(formatLocalTime(now));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground select-none">
      <Clock className="h-3.5 w-3.5 text-gold opacity-70" />
      {SERVER_CLOCKS.map((c) => (
        <span key={c.label} className="flex items-center gap-1">
          <span className="text-gold font-semibold">{c.label}</span>
          <span className="font-mono tracking-wide">
            {times[c.label] ?? "--:--:--"}
          </span>
        </span>
      ))}
      <span className="flex items-center gap-1 border-l border-surface/60 pl-3">
        <span className="text-muted-foreground/60 font-semibold">LOCAL</span>
        <span className="font-mono tracking-wide">{localTime}</span>
      </span>
    </div>
  );
}

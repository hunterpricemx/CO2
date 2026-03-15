"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface ClockInfo {
  label: string;
  timezone: string;
}

const SERVER_CLOCK: ClockInfo = {
  label: "SERVER",
  timezone: "America/New_York",
};

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
 * Displays live server time and local time updated every second.
 * Client component — uses setInterval internally.
 */
export function ServerClock() {
  const [serverTime, setServerTime] = useState("--:--:--");
  const [localTime, setLocalTime] = useState("--:--:--");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setServerTime(formatTime(now, SERVER_CLOCK.timezone));
      setLocalTime(formatLocalTime(now));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground select-none">
      <Clock className="h-3.5 w-3.5 text-gold opacity-70" />
      <span className="flex items-center gap-1">
        <span className="text-gold font-semibold">{SERVER_CLOCK.label}</span>
        <span className="font-mono tracking-wide">{serverTime}</span>
      </span>
      <span className="flex items-center gap-1 border-l border-surface/60 pl-3">
        <span className="text-muted-foreground/60 font-semibold">LOCAL</span>
        <span className="font-mono tracking-wide">{localTime}</span>
      </span>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

export type DropdownItem =
  | { href: string; label: string; action?: never }
  | { action: () => void | Promise<void>; label: string; href?: never };

export function NavDropdown({
  label,
  items,
  isActive = false,
}: {
  label: string;
  items: DropdownItem[];
  isActive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timerRef.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        className={[
          "flex items-center gap-0.5 px-3 py-1.5 text-sm rounded-md transition-colors font-medium",
          isActive ? "text-gold bg-surface/60" : "text-muted-foreground hover:text-gold hover:bg-surface/60",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <ChevronDown
          className={`h-3.5 w-3.5 ml-0.5 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-47.5 bg-background border border-surface rounded-md shadow-xl py-1 z-50">
          {items.map((item) =>
            item.action ? (
              <button
                key={item.label}
                onClick={() => { setOpen(false); item.action!(); }}
                className="block w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-gold hover:bg-surface/60 transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href!}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-muted-foreground hover:text-gold hover:bg-surface/60 transition-colors"
              >
                {item.label}
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}

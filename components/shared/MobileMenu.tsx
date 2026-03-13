"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, ChevronDown } from "lucide-react";
import type { NavItem } from "./Header";

/**
 * MobileMenu
 *
 * Renders a hamburger button that opens a side sheet with full navigation.
 * Supports flat links and collapsible dropdown groups.
 * Client component required for Sheet open state.
 */
export function MobileMenu({
  navItems,
  locale,
  version,
}: {
  navItems: NavItem[];
  locale: string;
  version: string;
}) {
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const lp = (path: string) => locale === "es" ? path : `/${locale}${path}`;

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="lg:hidden inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </SheetTrigger>
      <SheetContent side="right" className="w-72 bg-surface border-surface/50">
        <SheetHeader>
          <SheetTitle className="font-bebas text-2xl tracking-widest text-gold text-left">
            Conquer
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item, i) => {
            if (item.type === "link") {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={[
                    "px-3 py-2.5 text-sm rounded-md transition-colors font-medium",
                    pathname === item.href
                      ? "text-gold bg-background/50"
                      : "text-muted-foreground hover:text-gold hover:bg-background/50",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            }
            // dropdown group
            const isOpen = !!openGroups[item.label];
            return (
              <div key={`${item.label}-${i}`}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-muted-foreground hover:text-gold hover:bg-background/50 rounded-md transition-colors font-medium"
                  aria-expanded={isOpen}
                >
                  {item.label}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="ml-3 border-l border-surface/50 pl-3 mt-0.5 flex flex-col gap-0.5">
                    {item.items.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setOpen(false)}
                        className={[
                          "px-3 py-2 text-sm rounded-md transition-colors",
                          pathname === sub.href
                            ? "text-gold bg-background/50"
                            : "text-muted-foreground hover:text-gold hover:bg-background/50",
                        ].join(" ")}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="my-2 border-t border-surface/50" />
          <Link
            href={lp(`/${version}/login`)}
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 text-sm text-muted-foreground hover:text-gold hover:bg-background/50 rounded-md transition-colors font-medium"
          >
            Iniciar sesión
          </Link>
          <Link
            href={lp(`/${version}/register`)}
            onClick={() => setOpen(false)}
            className="mx-3 mt-1 py-2 text-sm text-center bg-gold hover:bg-gold-dark text-background font-semibold rounded-md transition-colors"
          >
            Registrarse
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

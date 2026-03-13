"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { NavDropdown } from "./NavDropdown";
import type { NavItem } from "./Header";

/**
 * NavLinks
 *
 * Client wrapper around the desktop nav so we can use `usePathname()`
 * to highlight the active route. The parent Header (server component)
 * builds the `navItems` array and passes it down here.
 */
export function NavLinks({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item, i) =>
        item.type === "link" ? (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "px-3 py-1.5 text-sm rounded-md transition-colors font-medium",
              pathname === item.href
                ? "text-gold bg-surface/60"
                : "text-muted-foreground hover:text-gold hover:bg-surface/60",
            ].join(" ")}
          >
            {item.label}
          </Link>
        ) : (
          <NavDropdown
            key={`${item.label}-${i}`}
            label={item.label}
            items={item.items}
            isActive={item.items.some((sub) => pathname === sub.href)}
          />
        )
      )}
    </>
  );
}

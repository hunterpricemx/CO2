"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";

/**
 * Client wrapper around the admin layout. Owns the mobile drawer state so
 * the sidebar can render as off-canvas on `< md` and the topbar can show a
 * hamburger button to toggle it. Closes automatically on route change.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer when navigating to a new admin page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open on mobile.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [drawerOpen]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0f0503]">
      <AdminTopBar onMenuToggle={() => setDrawerOpen(true)} />
      <div className="flex flex-1 overflow-hidden relative">
        <AdminSidebar isDrawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

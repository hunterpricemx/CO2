"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLogout, useGetIdentity } from "@refinedev/core";
import { hasPanelAccess, type AdminPanelPermission, type PanelPermissions } from "@/lib/admin/permissions";
import {
  CalendarDays,
  BookOpen,
  FolderTree,
  Wrench,
  CreditCard,
  Users,
  LayoutDashboard,
  LogOut,
  Shield,
  Server,
  Newspaper,
  Download,
  Star,
  Settings,
} from "lucide-react";

const NAV_CONTENT = [
  { href: "/admin/dashboard",        icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/events",           icon: CalendarDays,    label: "Eventos",            permission: "events"    as AdminPanelPermission },
  { href: "/admin/guides",           icon: BookOpen,        label: "Guías",              permission: "guides"    as AdminPanelPermission },
  { href: "/admin/guide-categories", icon: FolderTree,      label: "Categorías Guías",   permission: "guides"    as AdminPanelPermission },
  { href: "/admin/fixes",            icon: Wrench,          label: "Fixes",              permission: "fixes"     as AdminPanelPermission },
  { href: "/admin/fix-categories",   icon: FolderTree,      label: "Categorías Fixes",   permission: "fixes"     as AdminPanelPermission },
  { href: "/admin/news",             icon: Newspaper,       label: "Noticias",           permission: "news"      as AdminPanelPermission },
  { href: "/admin/news-categories",  icon: FolderTree,      label: "Categorías Noticias",permission: "news"      as AdminPanelPermission },
  { href: "/admin/downloads",        icon: Download,        label: "Descargas",          permission: "downloads" as AdminPanelPermission },
  { href: "/admin/influencers",       icon: Star,            label: "Influencers",        permission: "influencers" as AdminPanelPermission },
  { href: "/admin/settings",           icon: Settings,        label: "Ajustes del Sitio",  permission: "settings"    as AdminPanelPermission },
  { href: "/admin/donations",          icon: CreditCard,      label: "Donaciones",         permission: "donations" as AdminPanelPermission },
  { href: "/admin/donations/packages", icon: CreditCard,      label: "→ Paquetes",          permission: "donations" as AdminPanelPermission },
  { href: "/admin/users",            icon: Users,           label: "Administradores",    permission: "users"     as AdminPanelPermission },
];

const NAV_SYSTEM = [
  { href: "/admin/game-server", icon: Server,      label: "Game Server", permission: "gameServer" as AdminPanelPermission },
  { href: "/admin/payments",    icon: CreditCard,  label: "Pagos",       permission: "payments"   as AdminPanelPermission },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { mutate: logout } = useLogout();
  const { data: identity } = useGetIdentity<{ name: string; email: string; permissions?: PanelPermissions }>();
  const permissions = identity?.permissions;
  const visibleContent = NAV_CONTENT.filter((item) => !item.permission || hasPanelAccess(permissions, item.permission));
  const visibleSystem = NAV_SYSTEM.filter((item) => hasPanelAccess(permissions, item.permission));

  return (
    <aside className="w-56 shrink-0 bg-[#111] border-r border-[rgba(255,215,0,0.1)] flex flex-col h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-[rgba(255,215,0,0.1)]">
        <Shield className="h-5 w-5 text-[#f39c12]" />
        <span className="font-bebas text-xl tracking-widest text-[#f39c12]">
          Admin
        </span>
      </div>

      {/* Nav — Contenido */}
      <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
        {visibleContent.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-[rgba(243,156,18,0.15)] text-[#f39c12] font-medium"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* Separador — Sistema */}
        {visibleSystem.length > 0 && (
          <>
            <div className="mt-3 mb-1 px-3">
              <span className="text-[10px] text-gray-600 uppercase tracking-widest font-medium">
                Sistema
              </span>
            </div>

            {visibleSystem.map(({ href, icon: Icon, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-[rgba(243,156,18,0.15)] text-[#f39c12] font-medium"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-[rgba(255,215,0,0.1)]">
        {identity && (
          <p className="text-xs text-gray-500 px-3 pb-2 truncate">
            {identity.name}
          </p>
        )}
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/10 transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

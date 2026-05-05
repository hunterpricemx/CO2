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
  ScrollText,
  Gamepad2,
  TicketCheck,
  ShoppingBag,
  ShoppingCart,
  SearchCheck,
  Clapperboard,
  Share2,
  Camera,
  FolderTree as FolderTreeIcon,
  X as CloseIcon,
} from "lucide-react";

const NAV_CONTENT = [
  { href: "/admin/dashboard",        icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/events",           icon: CalendarDays,    label: "Eventos",            permission: "events"    as AdminPanelPermission },
  { href: "/admin/guides",           icon: BookOpen,        label: "Guías",              permission: "guides"    as AdminPanelPermission },
  { href: "/admin/tutorials",        icon: Clapperboard,    label: "Video Tutoriales",   permission: "guides"    as AdminPanelPermission },
  { href: "/admin/guide-categories", icon: FolderTree,      label: "Categorías Guías",   permission: "guides"    as AdminPanelPermission },
  { href: "/admin/fixes",            icon: Wrench,          label: "Fixes",              permission: "fixes"     as AdminPanelPermission },
  { href: "/admin/fix-categories",   icon: FolderTree,      label: "Categorías Fixes",   permission: "fixes"     as AdminPanelPermission },
  { href: "/admin/news",             icon: Newspaper,       label: "Noticias",           permission: "news"      as AdminPanelPermission },
  { href: "/admin/news-categories",  icon: FolderTree,      label: "Categorías Noticias",permission: "news"      as AdminPanelPermission },
  { href: "/admin/screenshots",        icon: Camera,          label: "Screenshots",        permission: "screenshots" as AdminPanelPermission },
  { href: "/admin/screenshot-categories", icon: FolderTreeIcon, label: "→ Categorías",     permission: "screenshots" as AdminPanelPermission },
  { href: "/admin/downloads",        icon: Download,        label: "Descargas",          permission: "downloads" as AdminPanelPermission },
  { href: "/admin/influencers",       icon: Star,            label: "Influencers",        permission: "influencers" as AdminPanelPermission },
  { href: "/admin/tickets",           icon: TicketCheck,     label: "Tickets",            permission: "tickets"   as AdminPanelPermission },
  { href: "/admin/garments",          icon: ShoppingBag,     label: "Garments",           permission: "garments"  as AdminPanelPermission },
  { href: "/admin/garments/orders",   icon: ShoppingBag,     label: "→ Órdenes",          permission: "garments"  as AdminPanelPermission },  { href: "/admin/garment-categories", icon: FolderTree,     label: "\u2192 Categorías",        permission: "garments"  as AdminPanelPermission },  { href: "/admin/accesory",          icon: ShoppingBag,     label: "Accesory",           permission: "garments"  as AdminPanelPermission },
  { href: "/admin/settings",           icon: Settings,        label: "Ajustes del Sitio",  permission: "settings"    as AdminPanelPermission },
  { href: "/admin/seo",                icon: SearchCheck,     label: "SEO",                permission: "settings"    as AdminPanelPermission },
  { href: "/admin/donations",          icon: CreditCard,      label: "Donaciones",         permission: "donations" as AdminPanelPermission },
  { href: "/admin/donations/packages", icon: CreditCard,      label: "→ Paquetes",          permission: "donations" as AdminPanelPermission },
  { href: "/admin/market-purchases",   icon: ShoppingCart,    label: "Compras Market",     permission: "donations" as AdminPanelPermission },
  { href: "/admin/users",            icon: Users,           label: "Administradores",    permission: "users"     as AdminPanelPermission },
  { href: "/admin/game-accounts",    icon: Gamepad2,        label: "Cuentas de Juego",   permission: "users"     as AdminPanelPermission },
  { href: "/admin/referrals",          icon: Share2,          label: "Referidos",          permission: "referrals" as AdminPanelPermission },
  { href: "/admin/referrals/settings", icon: Settings,        label: "→ Ajustes",          permission: "referrals" as AdminPanelPermission },
];

const NAV_SYSTEM = [
  { href: "/admin/game-server",                    icon: Server,      label: "Game Server",         permission: "gameServer" as AdminPanelPermission },
  { href: "/admin/game-server/test-market",        icon: ShoppingCart,label: "→ Mercado Pruebas",   permission: "gameServer" as AdminPanelPermission },
  { href: "/admin/game-server/purchase-history",   icon: ScrollText,  label: "→ Historial Compras", permission: "gameServer" as AdminPanelPermission },
  { href: "/admin/payments",      icon: CreditCard,  label: "Pagos",        permission: "payments"   as AdminPanelPermission },
  { href: "/admin/payment-logs",  icon: ScrollText,  label: "→ Logs Compras", permission: "payments" as AdminPanelPermission },
  { href: "/admin/settings-logs", icon: ScrollText,  label: "→ Log de Ajustes", permission: "settings" as AdminPanelPermission },
];

type AdminSidebarProps = {
  /** When true, the sidebar slides in as an off-canvas drawer on mobile. */
  isDrawerOpen?: boolean;
  /** Called when the user taps the backdrop or close button on mobile. */
  onClose?: () => void;
};

export function AdminSidebar({ isDrawerOpen = false, onClose }: AdminSidebarProps = {}) {
  const pathname = usePathname();
  const { mutate: logout } = useLogout();
  const { data: identity } = useGetIdentity<{ name: string; email: string; permissions?: PanelPermissions }>();
  const permissions = identity?.permissions;
  const visibleContent = NAV_CONTENT.filter((item) => !item.permission || hasPanelAccess(permissions, item.permission));
  const visibleSystem = NAV_SYSTEM.filter((item) => hasPanelAccess(permissions, item.permission));

  return (
    <>
      {/* Mobile backdrop — only rendered when drawer is open */}
      {isDrawerOpen && (
        <button
          type="button"
          onClick={onClose}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          aria-label="Cerrar menú"
        />
      )}

      <aside
        className={`
          bg-[#111] border-r border-[rgba(255,215,0,0.1)] flex flex-col h-screen w-64 md:w-56 shrink-0
          fixed md:static inset-y-0 left-0 z-50
          transition-transform duration-200 ease-out
          ${isDrawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        aria-label="Menú de administración"
      >
        {/* Logo + close (close visible solo en mobile) */}
        <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-[rgba(255,215,0,0.1)]">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#f39c12]" />
            <span className="font-bebas text-xl tracking-widest text-[#f39c12]">
              Admin
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Cerrar menú"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
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
    </>
  );
}

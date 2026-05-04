export const ADMIN_PANELS = [
  "events",
  "guides",
  "fixes",
  "donations",
  "users",
  "gameServer",
  "payments",
  "news",
  "downloads",
  "influencers",
  "settings",
  "tickets",
  "garments",
  "referrals",
  "screenshots",
] as const;

export type AdminPanelPermission = (typeof ADMIN_PANELS)[number];

export type PanelPermissions = Record<AdminPanelPermission, boolean>;

export const DEFAULT_ADMIN_PANEL_PERMISSIONS: PanelPermissions = {
  events: true,
  guides: true,
  fixes: true,
  donations: true,
  users: true,
  gameServer: true,
  payments: true,
  news: true,
  downloads: true,
  influencers: true,
  settings: true,
  tickets: true,
  garments: true,
  referrals: true,
  screenshots: true,
};

export const EMPTY_PANEL_PERMISSIONS: PanelPermissions = {
  events: false,
  guides: false,
  fixes: false,
  donations: false,
  users: false,
  gameServer: false,
  payments: false,
  news: false,
  downloads: false,
  influencers: false,
  settings: false,
  tickets: false,
  garments: false,
  referrals: false,
  screenshots: false,
};

export function normalizePanelPermissions(
  value: unknown,
  fallback: PanelPermissions = DEFAULT_ADMIN_PANEL_PERMISSIONS,
): PanelPermissions {
  const source = typeof value === "object" && value !== null ? value : {};

  return {
    events:     typeof Reflect.get(source, "events")     === "boolean" ? Reflect.get(source, "events")     as boolean : fallback.events,
    guides:     typeof Reflect.get(source, "guides")     === "boolean" ? Reflect.get(source, "guides")     as boolean : fallback.guides,
    fixes:      typeof Reflect.get(source, "fixes")      === "boolean" ? Reflect.get(source, "fixes")      as boolean : fallback.fixes,
    donations:  typeof Reflect.get(source, "donations")  === "boolean" ? Reflect.get(source, "donations")  as boolean : fallback.donations,
    users:      typeof Reflect.get(source, "users")      === "boolean" ? Reflect.get(source, "users")      as boolean : fallback.users,
    gameServer: typeof Reflect.get(source, "gameServer") === "boolean" ? Reflect.get(source, "gameServer") as boolean : fallback.gameServer,
    payments:   typeof Reflect.get(source, "payments")   === "boolean" ? Reflect.get(source, "payments")   as boolean : fallback.payments,
    news:       typeof Reflect.get(source, "news")       === "boolean" ? Reflect.get(source, "news")       as boolean : fallback.news,
    downloads:  typeof Reflect.get(source, "downloads")  === "boolean" ? Reflect.get(source, "downloads")  as boolean : fallback.downloads,
    influencers: typeof Reflect.get(source, "influencers") === "boolean" ? Reflect.get(source, "influencers") as boolean : fallback.influencers,
    settings: typeof Reflect.get(source, "settings") === "boolean" ? Reflect.get(source, "settings") as boolean : fallback.settings,
    tickets:  typeof Reflect.get(source, "tickets")  === "boolean" ? Reflect.get(source, "tickets")  as boolean : fallback.tickets,
    garments: typeof Reflect.get(source, "garments") === "boolean" ? Reflect.get(source, "garments") as boolean : fallback.garments,
    referrals: typeof Reflect.get(source, "referrals") === "boolean" ? Reflect.get(source, "referrals") as boolean : fallback.referrals,
    screenshots: typeof Reflect.get(source, "screenshots") === "boolean" ? Reflect.get(source, "screenshots") as boolean : fallback.screenshots,
  };
}

export function hasPanelAccess(
  permissions: unknown,
  panel: AdminPanelPermission,
): boolean {
  return normalizePanelPermissions(permissions)[panel];
}

"use client";

import { Refine } from "@refinedev/core";
import { DEFAULT_ADMIN_PANEL_PERMISSIONS, normalizePanelPermissions } from "@/lib/admin/permissions";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import routerProvider from "@refinedev/nextjs-router";
import { supabaseRefineClient } from "@/lib/supabase/refine-client";

export function RefineProvider({ children }: { children: React.ReactNode }) {
  return (
    <Refine
      routerProvider={routerProvider}
      dataProvider={dataProvider(supabaseRefineClient)}
      liveProvider={liveProvider(supabaseRefineClient)}
      authProvider={{
        login: async ({ email, password }) => {
          const { error } = await supabaseRefineClient.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            return { success: false, error };
          }
          // Verify admin role before allowing access.
          const { data: { user } } = await supabaseRefineClient.auth.getUser();
          const { data: profile } = user
            ? await supabaseRefineClient
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single()
            : { data: null };
          if (profile?.role !== "admin") {
            await supabaseRefineClient.auth.signOut();
            return {
              success: false,
              error: new Error("No tienes permisos de administrador."),
            };
          }
          return { success: true, redirectTo: "/admin" };
        },
        logout: async () => {
          await supabaseRefineClient.auth.signOut();
          return { success: true, redirectTo: "/admin/login" };
        },
        check: async () => {
          const { data } = await supabaseRefineClient.auth.getUser();
          if (!data.user) {
            return { authenticated: false, redirectTo: "/admin/login" };
          }
          const { data: profile } = await supabaseRefineClient
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();
          if (profile?.role !== "admin") {
            return { authenticated: false, redirectTo: "/admin/login" };
          }
          return { authenticated: true };
        },
        getPermissions: async () => {
          const { data } = await supabaseRefineClient.auth.getUser();
          if (!data.user) return null;
          const { data: profile } = await supabaseRefineClient
            .from("profiles")
            .select("role, panel_permissions")
            .eq("id", data.user.id)
            .single();
          if (!profile || profile.role !== "admin") return null;
          return normalizePanelPermissions(profile.panel_permissions, DEFAULT_ADMIN_PANEL_PERMISSIONS);
        },
        getIdentity: async () => {
          const { data } = await supabaseRefineClient.auth.getUser();
          if (!data.user) return null;
          const { data: profile } = await supabaseRefineClient
            .from("profiles")
            .select("username, email, panel_permissions")
            .eq("id", data.user.id)
            .single();
          return {
            id: data.user.id,
            email: profile?.email ?? data.user.email,
            name: profile?.username ?? data.user.user_metadata?.username ?? data.user.email,
            permissions: normalizePanelPermissions(
              profile?.panel_permissions,
              DEFAULT_ADMIN_PANEL_PERMISSIONS,
            ),
          };
        },
        onError: async (error) => {
          if (error?.status === 401 || error?.status === 403) {
            return { logout: true, redirectTo: "/admin/login" };
          }
          return { error };
        },
      }}
      resources={[
        {
          name: "events",
          list: "/admin/events",
          create: "/admin/events/create",
          edit: "/admin/events/edit/:id",
          show: "/admin/events/show/:id",
          meta: { label: "Eventos" },
        },
        {
          name: "guides",
          list: "/admin/guides",
          create: "/admin/guides/create",
          edit: "/admin/guides/edit/:id",
          meta: { label: "Guías" },
        },
        {
          name: "guide_categories",
          list: "/admin/guide-categories",
          create: "/admin/guide-categories/create",
          edit: "/admin/guide-categories/edit/:id",
          meta: { label: "Categorías de Guías" },
        },
        {
          name: "fixes",
          list: "/admin/fixes",
          create: "/admin/fixes/create",
          edit: "/admin/fixes/edit/:id",
          meta: { label: "Fixes" },
        },
        {
          name: "fix_categories",
          list: "/admin/fix-categories",
          create: "/admin/fix-categories/create",
          edit: "/admin/fix-categories/edit/:id",
          meta: { label: "Categorías de Fixes" },
        },
        {
          name: "donations",
          list: "/admin/donations",
          meta: { label: "Donaciones" },
        },
        {
          name: "profiles",
          list: "/admin/users",
          show: "/admin/users/show/:id",
          meta: { label: "Administradores" },
        },
        {
          name: "news_posts",
          list: "/admin/news",
          create: "/admin/news/create",
          edit: "/admin/news/edit",
          meta: { label: "Noticias" },
        },
        {
          name: "news_categories",
          list: "/admin/news-categories",
          create: "/admin/news-categories/create",
          edit: "/admin/news-categories/edit",
          meta: { label: "Categorías de Noticias" },
        },
        {
          name: "downloads",
          list: "/admin/downloads",
          create: "/admin/downloads/create",
          edit: "/admin/downloads/edit",
          meta: { label: "Descargas" },
        },
        {
          name: "influencers",
          list: "/admin/influencers",
          create: "/admin/influencers/create",
          edit: "/admin/influencers/edit/:id",
          meta: { label: "Influencers" },
        },
        {
          name: "garments",
          list: "/admin/garments",
          create: "/admin/garments/create",
          edit: "/admin/garments/edit/:id",
          meta: { label: "Garments" },
        },
        {
          name: "garment_orders",
          list: "/admin/garments/orders",
          meta: { label: "Órdenes de Garments" },
        },
        {
          name: "garment_categories",
          list: "/admin/garment-categories",
          create: "/admin/garment-categories/create",
          edit: "/admin/garment-categories/edit/:id",
          meta: { label: "Categorías de Garments" },
        },
        {
          name: "accesory",
          list: "/admin/accesory",
          create: "/admin/accesory/create",
          edit: "/admin/accesory/edit/:id",
          meta: { label: "Accesory" },
        },
      ]}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
        liveMode: "auto",
        disableTelemetry: true,
      }}
    >
      {children}
    </Refine>
  );
}

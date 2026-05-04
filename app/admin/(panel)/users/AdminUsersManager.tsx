"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle, KeyRound, Loader2, Save, Shield, ShieldAlert, Trash2, UserPlus, XCircle } from "lucide-react";
import {
  ADMIN_PANELS,
  DEFAULT_ADMIN_PANEL_PERMISSIONS,
  normalizePanelPermissions,
  type AdminPanelPermission,
  type PanelPermissions,
} from "@/lib/admin/permissions";
import type { ProfileRow } from "@/modules/users/types";
import {
  createAdminUser,
  deleteAdminUser,
  updateAdminPassword,
  updateAdminPermissions,
} from "@/modules/users/actions";

const PANEL_LABELS: Record<AdminPanelPermission, string> = {
  events: "Eventos",
  guides: "Guías",
  fixes: "Fixes",
  donations: "Donaciones",
  garments: "Atuendos",
  users: "Usuarios",
  gameServer: "Game Server",
  news: "Noticias",
  downloads: "Descargas",
  payments: "Pagos",
  influencers: "Influencers",
  settings: "Ajustes del Sitio",
  tickets: "Tickets de Soporte",
  referrals: "Referidos",
};

type Props = {
  admins: ProfileRow[];
  currentAdminId: string;
  isSuperAdmin: boolean;
};

type ResultState = {
  ok: boolean;
  message: string;
} | null;

export function AdminUsersManager({ admins, currentAdminId, isSuperAdmin }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ResultState>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null); // e.g. "create", "perm:<id>", "pass:<id>", "del:<id>"
  const [confirmDelete, setConfirmDelete] = useState<ProfileRow | null>(null);
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    permissions: { ...DEFAULT_ADMIN_PANEL_PERMISSIONS },
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [draftPermissions, setDraftPermissions] = useState<Record<string, PanelPermissions>>(
    Object.fromEntries(
      admins.map((admin) => [
        admin.id,
        normalizePanelPermissions(admin.panel_permissions, DEFAULT_ADMIN_PANEL_PERMISSIONS),
      ]),
    ),
  );
  const [draftPasswords, setDraftPasswords] = useState<Record<string, string>>(
    Object.fromEntries(admins.map((admin) => [admin.id, ""])),
  );

  const toggleCreatePermission = (panel: AdminPanelPermission) => {
    setCreateForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [panel]: !prev.permissions[panel] },
    }));
  };

  const toggleDraftPermission = (userId: string, panel: AdminPanelPermission) => {
    setDraftPermissions((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [panel]: !prev[userId][panel],
      },
    }));
  };

  const handleCreateAdmin = () => {
    setBusyAction("create");
    startTransition(async () => {
      const response = await createAdminUser(createForm);
      setBusyAction(null);
      setResult({
        ok: response.success,
        message: response.success ? `Administrador "${createForm.username}" creado.` : response.error,
      });

      if (!response.success) return;

      setCreateForm({
        username: "",
        email: "",
        password: "",
        permissions: { ...DEFAULT_ADMIN_PANEL_PERMISSIONS },
      });
      router.refresh();
    });
  };

  const handleSavePermissions = (userId: string) => {
    setBusyAction(`perm:${userId}`);
    startTransition(async () => {
      const response = await updateAdminPermissions(userId, draftPermissions[userId]);
      setBusyAction(null);
      setResult({
        ok: response.success,
        message: response.success ? "Permisos actualizados." : response.error,
      });

      if (response.success) router.refresh();
    });
  };

  const handleSavePassword = (userId: string) => {
    setBusyAction(`pass:${userId}`);
    startTransition(async () => {
      const response = await updateAdminPassword(userId, draftPasswords[userId] ?? "");
      setBusyAction(null);
      setResult({
        ok: response.success,
        message: response.success ? "Contraseña actualizada." : response.error,
      });

      if (!response.success) return;

      setDraftPasswords((prev) => ({
        ...prev,
        [userId]: "",
      }));
    });
  };

  const handleDeleteAdmin = (admin: ProfileRow) => {
    setBusyAction(`del:${admin.id}`);
    startTransition(async () => {
      const response = await deleteAdminUser(admin.id);
      setBusyAction(null);
      setConfirmDelete(null);
      setResult({
        ok: response.success,
        message: response.success ? `Administrador "${admin.username}" eliminado.` : response.error,
      });
      if (response.success) router.refresh();
    });
  };

  const isBusy = (key: string) => isPending && busyAction === key;

  const inputCls = "w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#121212] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[rgba(243,156,18,0.5)]";
  const checkboxCls = "h-4 w-4 rounded border border-[rgba(255,255,255,0.18)] bg-[#111] text-[#f39c12] focus:ring-[#f39c12]/30";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-bebas text-5xl tracking-wider text-white">Administradores</h1>
        <p className="mt-1 text-sm text-gray-500">Crea admins del panel y define a qué secciones pueden entrar.</p>
      </div>

      <section className="space-y-5 rounded-xl border border-[rgba(255,215,0,0.1)] bg-[#111] p-6">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-[#f39c12]" />
          <h2 className="text-xl font-bebas tracking-wider text-white">Nuevo administrador</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">Usuario</label>
            <input className={inputCls} value={createForm.username} onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">Email</label>
            <input className={inputCls} type="email" value={createForm.email} onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">Contraseña</label>
            <div className="flex gap-2">
              <input
                className={inputCls}
                type={showCreatePassword ? "text" : "password"}
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Mín. 8 caracteres"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowCreatePassword(s => !s)}
                className="px-3 rounded-lg border border-white/10 bg-white/5 text-xs text-gray-300 hover:bg-white/10"
                tabIndex={-1}
              >
                {showCreatePassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs uppercase tracking-wide text-gray-500">Accesos</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {ADMIN_PANELS.map((panel) => (
              <label key={panel} className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  className={checkboxCls}
                  type="checkbox"
                  checked={createForm.permissions[panel]}
                  onChange={() => toggleCreatePermission(panel)}
                />
                {PANEL_LABELS[panel]}
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateAdmin}
          disabled={isPending || !createForm.username.trim() || !createForm.email.trim() || createForm.password.length < 8}
          className="inline-flex items-center gap-2 rounded-lg border border-[rgba(243,156,18,0.3)] bg-[rgba(243,156,18,0.15)] px-4 py-2 text-sm text-[#f39c12] transition-colors hover:bg-[rgba(243,156,18,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBusy("create") ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {isBusy("create") ? "Creando..." : "Crear administrador"}
        </button>
      </section>

      {result && (
        <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${result.ok ? "border-green-800/40 bg-green-900/20 text-green-300" : "border-red-800/40 bg-red-900/20 text-red-300"}`}>
          {result.ok ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <p>{result.message}</p>
        </div>
      )}

      <section className="space-y-4">
        {admins.map((admin) => {
          const permissions = draftPermissions[admin.id] ?? DEFAULT_ADMIN_PANEL_PERMISSIONS;
          const canChangePassword = isSuperAdmin || admin.id === currentAdminId;
          const isSelf = admin.id === currentAdminId;
          const isSuperAdminTarget = (admin.email ?? "").trim().toLowerCase() === "mariano@hunterprice.mx";
          const canDelete = isSuperAdmin && !isSelf && !isSuperAdminTarget;

          return (
            <div key={admin.id} className="rounded-xl border border-[rgba(255,215,0,0.1)] bg-[#1a1a1a] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Shield className="h-4 w-4 text-[#f39c12]" />
                    <p className="text-lg font-semibold text-white">{admin.username}</p>
                    {isSuperAdminTarget && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/40 uppercase tracking-wider">
                        super admin
                      </span>
                    )}
                    {isSelf && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/40 uppercase tracking-wider">
                        tú
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-400">{admin.email}</p>
                  <p className="mt-2 text-xs text-gray-600">Alta: {new Date(admin.created_at).toLocaleDateString("es-ES")}</p>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(admin)}
                      disabled={isPending}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-700/40 bg-red-900/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/40 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar administrador
                    </button>
                  )}
                </div>

                <div className="min-w-[320px] space-y-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Permisos</p>
                  <div className="grid grid-cols-2 gap-3">
                    {ADMIN_PANELS.map((panel) => (
                      <label key={panel} className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          className={checkboxCls}
                          type="checkbox"
                          checked={permissions[panel]}
                          onChange={() => toggleDraftPermission(admin.id, panel)}
                        />
                        {PANEL_LABELS[panel]}
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSavePermissions(admin.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 transition-colors hover:bg-white/10 disabled:opacity-50"
                  >
                    {isBusy(`perm:${admin.id}`) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isBusy(`perm:${admin.id}`) ? "Guardando..." : "Guardar permisos"}
                  </button>

                  <div className="space-y-2 pt-2">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Cambiar contraseña</p>
                    <div className="flex gap-2">
                      <input
                        className={inputCls}
                        type="password"
                        placeholder="Nueva contraseña (mín. 8)"
                        value={draftPasswords[admin.id] ?? ""}
                        disabled={!canChangePassword || isPending}
                        onChange={(e) =>
                          setDraftPasswords((prev) => ({
                            ...prev,
                            [admin.id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => handleSavePassword(admin.id)}
                        disabled={!canChangePassword || isPending || (draftPasswords[admin.id] ?? "").length < 8}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 transition-colors hover:bg-white/10 disabled:opacity-50"
                      >
                        {isBusy(`pass:${admin.id}`) ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        {isBusy(`pass:${admin.id}`) ? "..." : "Actualizar"}
                      </button>
                    </div>
                    {!canChangePassword && (
                      <p className="text-xs text-gray-500">
                        Solo el super admin puede cambiar contraseñas de otros administradores.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {admins.length === 0 && (
          <div className="rounded-xl border border-[rgba(255,215,0,0.1)] bg-[#1a1a1a] px-6 py-10 text-center text-sm text-gray-500">
            No hay administradores creados.
          </div>
        )}
      </section>

      {/* ── Modal de confirmación de eliminación ── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !isPending && setConfirmDelete(null)}
        >
          <div
            className="max-w-md w-full rounded-2xl border border-red-700/40 bg-[#0f0503] p-6 space-y-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-900/30 border border-red-700/40 rounded-xl p-2.5">
                <ShieldAlert className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Eliminar administrador</h3>
                <p className="text-xs text-gray-500 mt-0.5">Esta acción es irreversible.</p>
              </div>
            </div>

            <div className="bg-red-900/10 border border-red-700/20 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2 text-sm text-red-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Vas a eliminar <strong className="text-white">{confirmDelete.username}</strong>
                  {" "}(<span className="text-gray-400">{confirmDelete.email}</span>).
                  Su sesión Supabase Auth se cerrará y no podrá entrar de nuevo.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={isPending}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-300 hover:bg-white/10 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAdmin(confirmDelete)}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-600/40 bg-red-700/30 text-sm text-red-100 hover:bg-red-700/50 disabled:opacity-50"
              >
                {isBusy(`del:${confirmDelete.id}`) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {isBusy(`del:${confirmDelete.id}`) ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
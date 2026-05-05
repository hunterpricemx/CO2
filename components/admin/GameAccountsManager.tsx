"use client";

import { Fragment, useState, useTransition, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Search, RefreshCw, Send, Mail, ChevronLeft, ChevronRight, AlertTriangle, Shield, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminSendRecoveryLinkAction, adminChangeGameEmailAction } from "@/modules/game-accounts/actions";
import { AccountActionLogsPanel } from "@/components/admin/AccountActionLogsPanel";
import type { GameAccountRow } from "@/modules/game-accounts/types";

interface Props {
  accounts: GameAccountRow[];
  total: number;
  page: number;
  pageSize: number;
  version: 1 | 2;
  search: string;
  bannedFilter: string;
  dbError: string | null;
  adminLocale: string;
}

export function GameAccountsManager({
  accounts,
  total,
  page,
  pageSize,
  version,
  search: initialSearch,
  bannedFilter,
  dbError,
  adminLocale,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [search, setSearch] = useState(initialSearch);
  const [selectedVersion, setSelectedVersion] = useState<string>(String(version));
  const [selectedBanned, setSelectedBanned] = useState<string>(bannedFilter);

  // Modal state
  const [recoveryTarget, setRecoveryTarget] = useState<GameAccountRow | null>(null);
  const [emailTarget, setEmailTarget] = useState<GameAccountRow | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [logsTarget, setLogsTarget] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildUrl(params: Record<string, string | number | undefined>) {
    const url = new URL(pathname, "http://x");
    const merged = {
      version: selectedVersion,
      search: search || undefined,
      banned: selectedBanned || undefined,
      page: String(page),
      ...params,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    return url.pathname + (url.search ? url.search : "");
  }

  function applyFilters() {
    startTransition(() => {
      router.push(
        buildUrl({
          version: selectedVersion,
          search: search || undefined,
          banned: selectedBanned || undefined,
          page: 1,
        }),
      );
    });
  }

  function goToPage(p: number) {
    startTransition(() => {
      router.push(buildUrl({ page: p }));
    });
  }

  const handleSendRecovery = useCallback(async () => {
    if (!recoveryTarget) return;
    startTransition(async () => {
      const res = await adminSendRecoveryLinkAction({
        username: recoveryTarget.Username,
        email: recoveryTarget.Email,
        version: Number(selectedVersion) as 1 | 2,
        locale: adminLocale,
      });
      if (res.success) {
        toast.success(`Link de recuperación enviado a ${recoveryTarget.Email}`);
        setRecoveryTarget(null);
      } else {
        toast.error(res.error ?? "Error enviando recovery.");
      }
    });
  }, [recoveryTarget, selectedVersion, adminLocale]);

  const handleChangeEmail = useCallback(async () => {
    if (!emailTarget) return;
    startTransition(async () => {
      const res = await adminChangeGameEmailAction({
        username: emailTarget.Username,
        newEmail,
        version: Number(selectedVersion) as 1 | 2,
      });
      if (res.success) {
        toast.success("Correo actualizado correctamente.");
        setEmailTarget(null);
        setNewEmail("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Error actualizando correo.");
      }
    });
  }, [emailTarget, newEmail, selectedVersion, router]);

  const isBanned = (row: GameAccountRow) => row.BannedID !== 2;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bebas tracking-widest text-gold">Cuentas de Juego</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total.toLocaleString()} cuenta{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* DB Error */}
      {dbError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-900/10 p-4 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {dbError}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Usuario o correo..."
            className="pl-9 bg-background border-surface/50"
          />
        </div>

        <Select value={selectedVersion} onValueChange={(v) => setSelectedVersion(v ?? selectedVersion)}>
          <SelectTrigger className="w-32 bg-background border-surface/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">v2.0</SelectItem>
            <SelectItem value="1">v1.0</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedBanned || "all"} onValueChange={(v) => setSelectedBanned(v === "all" || v === null ? "" : v)}>
          <SelectTrigger className="w-36 bg-background border-surface/50">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="false">Activos</SelectItem>
            <SelectItem value="true">Baneados</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={applyFilters} disabled={isPending} className="bg-gold hover:bg-gold-dark text-background font-bold">
          {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="ml-1">Buscar</span>
        </Button>
      </div>

      {/* Mobile: cards verticales (visible solo en <md) */}
      <div className="md:hidden space-y-3">
        {accounts.length === 0 ? (
          <div className="rounded-xl border border-gold/10 px-4 py-10 text-center text-muted-foreground text-sm">
            {dbError ? "No se pudo cargar la tabla." : "No se encontraron cuentas."}
          </div>
        ) : (
          accounts.map((row) => (
            <Fragment key={`m-${row.EntityID}`}>
              <div className="rounded-xl border border-gold/10 bg-surface/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setLogsTarget(logsTarget === row.Username ? null : row.Username)}
                  className="w-full text-left px-4 py-3 hover:bg-surface/30 transition-colors flex items-start justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground text-base">{row.Username}</p>
                      {isBanned(row) ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-300 border border-red-700/40">
                          <ShieldOff className="h-2.5 w-2.5" /> Baneado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-700/40">
                          <Shield className="h-2.5 w-2.5" /> Activo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{row.Email}</p>
                    <p className="text-[10px] text-gray-600 font-mono mt-0.5">ID {row.EntityID}</p>
                  </div>
                </button>
                <div className="grid grid-cols-2 border-t border-gold/5">
                  <button
                    type="button"
                    onClick={() => setRecoveryTarget(row)}
                    className="flex items-center justify-center gap-1.5 py-3 text-sm text-gold hover:bg-gold/10 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    Recovery
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmailTarget(row); setNewEmail(""); }}
                    className="flex items-center justify-center gap-1.5 py-3 text-sm text-gold hover:bg-gold/10 transition-colors border-l border-gold/5"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </button>
                </div>
              </div>
              {logsTarget === row.Username && (
                <div className="rounded-xl border border-gold/10 bg-surface/10 p-3">
                  <AccountActionLogsPanel username={row.Username} />
                </div>
              )}
            </Fragment>
          ))
        )}
      </div>

      {/* Desktop: tabla tradicional (oculta en <md) */}
      <div className="hidden md:block rounded-xl border border-gold/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/10 bg-surface/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Correo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    {dbError ? "No se pudo cargar la tabla." : "No se encontraron cuentas."}
                  </td>
                </tr>
              ) : (
                accounts.map((row) => (
                  <Fragment key={row.EntityID}>
                    <tr
                      className="border-b border-gold/5 hover:bg-surface/20 transition-colors cursor-pointer"
                      onClick={() => setLogsTarget(logsTarget === row.Username ? null : row.Username)}
                    >
                      <td className="px-4 py-3 text-muted-foreground font-mono">{row.EntityID}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{row.Username}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.Email}</td>
                      <td className="px-4 py-3">
                        {isBanned(row) ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-400">
                            <ShieldOff className="h-3 w-3" /> Baneado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <Shield className="h-3 w-3" /> Activo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Enviar link de recuperación"
                            className="h-7 px-2 text-xs hover:text-gold"
                            onClick={() => setRecoveryTarget(row)}
                          >
                            <Send className="h-3 w-3 mr-1" /> Recovery
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Cambiar correo"
                            className="h-7 px-2 text-xs hover:text-gold"
                            onClick={() => { setEmailTarget(row); setNewEmail(""); }}
                          >
                            <Mail className="h-3 w-3 mr-1" /> Email
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {logsTarget === row.Username && (
                      <tr className="bg-surface/10">
                        <td colSpan={5} className="px-4 py-3">
                          <AccountActionLogsPanel username={row.Username} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isPending}
              onClick={() => goToPage(page - 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isPending}
              onClick={() => goToPage(page + 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal: Send Recovery */}
      <Dialog open={!!recoveryTarget} onOpenChange={(o) => !o && setRecoveryTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar link de recuperación</DialogTitle>
            <DialogDescription>
              Se enviará un correo con link de reseteo de contraseña a{" "}
              <strong>{recoveryTarget?.Email}</strong> para el usuario{" "}
              <strong>{recoveryTarget?.Username}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecoveryTarget(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-gold hover:bg-gold-dark text-background font-bold"
              onClick={handleSendRecovery}
              disabled={isPending}
            >
              {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Change Email */}
      <Dialog open={!!emailTarget} onOpenChange={(o) => !o && setEmailTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar correo</DialogTitle>
            <DialogDescription>
              Cuenta: <strong>{emailTarget?.Username}</strong> — correo actual:{" "}
              <strong>{emailTarget?.Email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              type="email"
              placeholder="Nuevo correo electrónico"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="bg-background border-surface/50"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailTarget(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-gold hover:bg-gold-dark text-background font-bold"
              onClick={handleChangeEmail}
              disabled={isPending || !newEmail.trim()}
            >
              {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

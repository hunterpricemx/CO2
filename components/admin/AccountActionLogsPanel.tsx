"use client";

import { useEffect, useState } from "react";
import { getAccountActionLogsAction } from "@/modules/game-accounts/actions";
import { Loader2, History } from "lucide-react";
import type { AccountActionLog } from "@/modules/game-accounts/types";

const ACTION_LABELS: Record<string, string> = {
  recovery_sent: "Link de recuperación enviado",
  email_changed: "Correo cambiado",
};

interface Props {
  username: string;
}

export function AccountActionLogsPanel({ username }: Props) {
  const [logs, setLogs] = useState<AccountActionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAccountActionLogsAction(username).then((rows) => {
      if (!cancelled) {
        setLogs(rows);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Cargando logs...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <History className="h-3 w-3" /> Sin acciones registradas para esta cuenta.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        <History className="inline h-3 w-3 mr-1" />
        Log de ajustes — {username}
      </p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gold/5 text-muted-foreground">
            <th className="py-1 pr-4 text-left font-medium">Fecha</th>
            <th className="py-1 pr-4 text-left font-medium">Admin</th>
            <th className="py-1 pr-4 text-left font-medium">Acción</th>
            <th className="py-1 pr-4 text-left font-medium">V</th>
            <th className="py-1 text-left font-medium">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-gold/5 last:border-0">
              <td className="py-1 pr-4 text-muted-foreground whitespace-nowrap">
                {new Date(log.created_at).toLocaleString("es-MX", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </td>
              <td className="py-1 pr-4 text-muted-foreground">{log.admin_username ?? "—"}</td>
              <td className="py-1 pr-4">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 font-medium ${
                    log.action === "email_changed"
                      ? "bg-blue-900/30 text-blue-300"
                      : "bg-amber-900/30 text-amber-300"
                  }`}
                >
                  {ACTION_LABELS[log.action] ?? log.action}
                </span>
              </td>
              <td className="py-1 pr-4 text-muted-foreground">{log.version}.0</td>
              <td className="py-1 text-muted-foreground max-w-xs truncate">
                {log.action === "email_changed" ? (
                  <>
                    <span className="line-through opacity-60">{log.before_value}</span>
                    {" → "}
                    <span className="text-emerald-400">{log.after_value}</span>
                  </>
                ) : (
                  log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

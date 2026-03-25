"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ShoppingBag, ChevronRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ─── Datos de compose ────────────────────────────── */

const COMPOSE_TABLE: Record<string, number> = {
  "0-1": 20,
  "1-2": 20,
  "2-3": 80,
  "3-4": 240,
  "4-5": 720,
  "5-6": 2160,
  "6-7": 6480,
  "7-8": 19440,
  "8-9": 58320,
  "9-10": 2700,
  "10-11": 5500,
  "11-12": 9000,
};

const PLUS_OPTIONS = Array.from({ length: 13 }, (_, i) => i); // 0..12

/* ─── Tipos ──────────────────────────────────────── */

interface StepRow {
  from: number;
  to: number;
  needed: number;
}

interface CalcResult {
  steps: StepRow[];
  totalCompose: number;
  remaining: number;
  stones: number;
  cps: number;
}

interface Props {
  marketHref: string;
}

/* ─── Helpers ────────────────────────────────────── */

function calculate(from: number, to: number, progress: number, cpsPerStone: number): CalcResult | null {
  if (to <= from) return null;

  const steps: StepRow[] = [];
  let totalCompose = 0;

  for (let i = from; i < to; i++) {
    const needed = COMPOSE_TABLE[`${i}-${i + 1}`] ?? 0;
    steps.push({ from: i, to: i + 1, needed });
    totalCompose += needed;
  }

  const remaining = Math.max(0, totalCompose - progress);
  const stones = Math.ceil(remaining / 10);
  const cps = stones * cpsPerStone;

  return { steps, totalCompose, remaining, stones, cps };
}

function fmt(n: number) {
  return n.toLocaleString("es");
}

/* ─── Componente principal ───────────────────────── */

export function ComposeCalculator({ marketHref }: Props) {
  const [from, setFrom] = useState<number>(0);
  const [to, setTo] = useState<number>(5);
  const [progress, setProgress] = useState<string>("");
  const [cpsPerStone, setCpsPerStone] = useState<string>("8");

  const result = useMemo(() => {
    const prog = parseInt(progress || "0", 10);
    const cps = Math.max(1, parseInt(cpsPerStone || "8", 10));
    return calculate(from, to, prog, cps);
  }, [from, to, progress, cpsPerStone]);

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* ── Formulario (izquierda) ── */}
      <Card className="p-6 space-y-5 bg-card/80 backdrop-blur border border-border/60 shadow-lg">
        {/* Nivel actual */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Nivel actual
          </label>
          <Select
            value={String(from)}
            onValueChange={(v) => {
              const n = parseInt(v ?? "0", 10);
              setFrom(n);
              if (to <= n) setTo(n + 1);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLUS_OPTIONS.filter((p) => p <= 11).map((p) => (
                <SelectItem key={p} value={String(p)}>
                  +{p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Objetivo */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Objetivo
          </label>
          <Select
            value={String(to)}
            onValueChange={(v) => setTo(parseInt(v ?? "0", 10))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLUS_OPTIONS.filter((p) => p >= 1).map((p) => (
                <SelectItem key={p} value={String(p)} disabled={p <= from}>
                  +{p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Progreso actual */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Progreso actual (compose)
          </label>
          <input
            type="number"
            min={0}
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
            placeholder="0"
            className={cn(
              "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60",
              "transition-colors"
            )}
          />
        </div>

        {/* Precio piedra +1 */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Precio piedra +1 <span className="text-xs">(CPS c/u)</span>
          </label>
          <input
            type="number"
            min={1}
            value={cpsPerStone}
            onChange={(e) => setCpsPerStone(e.target.value)}
            placeholder="8"
            className={cn(
              "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60",
              "transition-colors"
            )}
          />
        </div>
      </Card>

      {/* ── Resultados (derecha) ── */}
      <div className="space-y-4">
        {result ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
          {/* Resumen principal */}
          <Card className="p-5 border border-border/60 shadow-lg bg-card/80 backdrop-blur">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="size-4 text-primary" />
              <h3 className="font-semibold text-sm">Resumen</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatBox
                label="Compose total"
                value={fmt(result.totalCompose)}
              />
              <StatBox
                label="Compose faltante"
                value={fmt(result.remaining)}
                highlight
              />
              <StatBox
                label="Piedras +1 necesarias"
                value={fmt(result.stones)}
                icon={<span className="text-base">🪨</span>}
              />
              <StatBox
                label="CPS necesarios"
                value={fmt(result.cps)}
                icon={<DiamondIcon />}
                highlight
              />
            </div>
          </Card>

          {/* Desglose por paso */}
          {result.steps.length > 1 && (
            <Card className="p-5 border border-border/60 shadow-lg bg-card/80 backdrop-blur">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <ChevronRight className="size-4 text-muted-foreground" />
                Desglose por nivel
              </h3>
              <div className="space-y-2">
                {result.steps.map((s) => (
                  <div
                    key={`${s.from}-${s.to}`}
                    className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0"
                  >
                    <span className="text-muted-foreground">
                      <Badge variant="secondary" className="mr-2 font-mono">
                        +{s.from} → +{s.to}
                      </Badge>
                    </span>
                    <span className="font-medium tabular-nums">
                      {fmt(s.needed)} compose
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Botón mercado vivo */}
          <Link
            href={marketHref}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg border px-2.5 h-9 text-sm font-medium transition-colors",
              "border-primary/40 hover:border-primary hover:bg-primary/5 bg-background text-foreground"
            )}
          >
            <ShoppingBag className="size-4" />
            Consultar mercado vivo
          </Link>
          </div>
        ) : (
          <div className="hidden md:flex h-full items-center justify-center rounded-xl border border-dashed border-border/50 min-h-65">
            <p className="text-sm text-muted-foreground text-center px-6">
              Selecciona los niveles y presiona <span className="font-medium text-foreground">Calcular</span> para ver los resultados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-componentes ────────────────────────────── */

function StatBox({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2.5 space-y-0.5">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p
        className={cn(
          "text-lg font-bold tabular-nums flex items-center gap-1",
          highlight && "text-primary"
        )}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}

function DiamondIcon() {
  return (
    <span
      className="inline-block size-3 rounded-xs bg-linear-to-br from-cyan-400 to-blue-500 rotate-45 shadow-[0_0_5px_rgba(0,180,255,0.7)]"
      aria-hidden
    />
  );
}

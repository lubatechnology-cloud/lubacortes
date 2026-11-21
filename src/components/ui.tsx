"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function Logo({ size = 40, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 select-none">
      <Image src="/icon.svg" alt="Lubacortes" width={size} height={size} priority />
      {withText && <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 bg-clip-text text-transparent">Lubacortes</span>}
    </Link>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;
  return (
    <button
      aria-label="Alternar tema"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="grid h-9 w-9 place-items-center rounded-xl border transition hover:bg-blue-500/10"
      style={{ borderColor: "var(--border)" }}
    >
      {resolvedTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" />;
}

export function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div className="w-full">
      {label && <div className="mb-1.5 flex justify-between text-xs muted"><span>{label}</span><span>{Math.round(value)}%</span></div>}
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: "Na fila", running: "Em processamento", succeeded: "Concluído", failed: "Falhado",
    ready: "Pronto", analyzing: "A analisar", importing: "A importar", created: "Criado",
    paid: "Pago", pending: "Pendente", expired: "Expirado", cancelled: "Cancelado", processing: "Em processamento",
  };
  const color = ["ready", "succeeded", "paid"].includes(status)
    ? "bg-emerald-500/12 text-emerald-500"
    : ["failed", "expired", "cancelled"].includes(status)
      ? "bg-rose-500/12 text-rose-500"
      : "bg-blue-500/12 text-blue-500";
  return <span className={`badge ${color}`}>{map[status] ?? status}</span>;
}

export function Alert({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "error" | "success" }) {
  const cls = tone === "error" ? "border-rose-500/30 bg-rose-500/10 text-rose-500" : tone === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : "border-blue-500/30 bg-blue-500/10 text-blue-500";
  return <div className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-500/10 text-2xl">🎬</div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-md text-sm muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { all, get } from "@/lib/db";
import { NewProjectBox } from "@/components/new-project-box";
import { EmptyState, StatusBadge } from "@/components/ui";
import { Film, Scissors, Unlock, Lock, Coins, ArrowRight, Crown } from "lucide-react";
import { formatKz, usage } from "@/lib/billing";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const projects = all<{ id: string; title: string; status: string; duration: number | null; created_at: string }>(
    "SELECT id,title,status,duration,created_at FROM projects WHERE user_id=? ORDER BY created_at DESC LIMIT 6", user.id);
  const n = (sql: string, ...p: unknown[]) => Number((get<{ c: number }>(sql, ...p)?.c ?? 0));
  const plan = usage(user.id);
  const metrics = [
    { label: "Vídeos analisados", value: n("SELECT COUNT(*) c FROM projects WHERE user_id=? AND status='ready'", user.id), icon: Film },
    { label: "Cortes gerados", value: n("SELECT COUNT(*) c FROM clips WHERE user_id=?", user.id), icon: Scissors },
    { label: "Cortes disponíveis", value: n("SELECT COUNT(*) c FROM clips WHERE user_id=? AND is_unlocked=1", user.id), icon: Unlock },
    { label: "Cortes bloqueados", value: n("SELECT COUNT(*) c FROM clips WHERE user_id=? AND is_unlocked=0", user.id), icon: Lock },
    { label: "Créditos", value: n("SELECT COALESCE(SUM(delta),0) c FROM credit_ledger WHERE user_id=?", user.id), icon: Coins },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Olá, {user.name.split(" ")[0]} 👋</h1>
        <p className="text-sm muted">Aqui está o resumo da sua actividade na Lubacortes.</p>
      </div>
      <NewProjectBox />
      <div className="card flex flex-wrap items-center gap-6 p-5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white"><Crown size={20} /></div>
        <div className="min-w-[150px]">
          <p className="text-xs muted">Plano actual</p>
          <p className="text-lg font-extrabold">{plan.plan.name}</p>
          <p className="text-[11px] muted">{formatKz(plan.plan.price_cents)}/mês</p>
        </div>
        <div className="min-w-[150px]">
          <p className="text-xs muted">Minutos disponíveis</p>
          <p className="text-lg font-extrabold text-blue-500">{plan.totalMinutesAvailable} min</p>
          <p className="text-[11px] muted">{Math.floor(plan.inputUsedSeconds / 60)} min consumidos este mês</p>
        </div>
        <div className="min-w-[150px]">
          <p className="text-xs muted">Cortes por exportar</p>
          <p className="text-lg font-extrabold text-cyan-500">{plan.exportsRemaining}</p>
          <p className="text-[11px] muted">{plan.exportsUsed} de {plan.exportsAllowed} utilizados</p>
        </div>
        <Link href="/faturacao" className="btn-ghost ml-auto !text-xs">Gerir plano / comprar minutos <ArrowRight size={14} /></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label} className="card p-4">
            <m.icon size={18} className="mb-3 text-blue-500" />
            <p className="text-2xl font-extrabold">{m.value}</p>
            <p className="text-[11px] muted">{m.label}</p>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Projectos recentes</h2>
          <Link href="/projectos" className="flex items-center gap-1 text-xs text-blue-500 hover:underline">Ver todos <ArrowRight size={13} /></Link>
        </div>
        {projects.length === 0 ? (
          <EmptyState title="Ainda não há projectos" description="Comece por importar o seu primeiro vídeo acima." />
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
              <Link key={p.id} href={`/projecto/${p.id}`} className="flex items-center gap-4 rounded-xl border px-4 py-3 transition hover:bg-blue-500/5" style={{ borderColor: "var(--border)" }}>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10 text-blue-500"><Film size={18} /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.title}</p>
                  <p className="text-[11px] muted">{p.duration ? `${Math.round(p.duration)}s` : "—"} · {new Date(p.created_at).toLocaleDateString("pt-AO")}</p>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

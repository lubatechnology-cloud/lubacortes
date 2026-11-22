"use client";

import { useEffect, useState } from "react";
import { api, put } from "@/lib/client/api";
import { Alert, Spinner, StatusBadge } from "@/components/ui";
import { Users, CreditCard, Settings2, ShieldAlert, BarChart3, Save, Wallet } from "lucide-react";
import { formatKz } from "@/lib/client/format";

type Overview = {
  stats: Record<string, number>;
  users: { id: string; email: string; name: string; role: string; is_active: number; created_at: string }[];
  payments: { id: string; provider_ref: string; email: string; amount_cents: number; status: string; mode: string; created_at: string }[];
  transactions: Record<string, unknown>[];
  errors: { id: string; message: string; created_at: string }[];
  jobs: { id: string; type: string; status: string; progress: number; error: string | null }[];
  apiUsage: { service: string; operation: string; units: number; calls: number }[];
  audit: { id: string; action: string; admin_email: string; created_at: string }[];
  plans: Record<string, unknown>[];
  packages: Record<string, unknown>[];
  publications: { id: string; platform: string; status: string; mode: string; clip_title: string; scheduled_at: string }[];
  brands: Record<string, unknown>[];
  finance: {
    revenuePaidCents: number; revenuePendingCents: number; measuredCostCents: number;
    byUser: Record<string, unknown>[]; byProject: Record<string, unknown>[]; byService: Record<string, unknown>[];
  };
};

const tabs = [
  { id: "geral", label: "Estatísticas", icon: BarChart3 },
  { id: "utilizadores", label: "Utilizadores", icon: Users },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "pagamentos", label: "Pagamentos", icon: CreditCard },
  { id: "config", label: "Configuração", icon: Settings2 },
  { id: "erros", label: "Erros e auditoria", icon: ShieldAlert },
];

export function AdminPanel() {
  const [data, setData] = useState<Overview | null>(null);
  const [tab, setTab] = useState("geral");
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<Overview>("/api/admin/overview").then(setData).catch((e) => setError((e as Error).message));
    api<{ settings: Record<string, unknown> }>("/api/admin/settings").then((r) => setSettings(r.settings)).catch(() => {});
  }, []);

  async function saveSettings() {
    setError(""); setMsg("");
    try { await put("/api/admin/settings", { settings }); setMsg("Configuração guardada e registada na auditoria."); }
    catch (e) { setError((e as Error).message); }
  }

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Painel administrativo</h1>
        <p className="text-sm muted">Gestão da plataforma. Todas as operações são registadas em auditoria.</p>
      </div>
      {msg && <Alert tone="success">{msg}</Alert>}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`btn ${tab === t.id ? "btn-primary" : "btn-ghost"} !text-xs`}><t.icon size={14} /> {t.label}</button>)}
      </div>

      {tab === "geral" && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Object.entries(data.stats).map(([k, v]) => (
              <div key={k} className="card p-4"><p className="text-2xl font-extrabold text-blue-500">{v}</p><p className="text-[11px] muted">{k.replace(/_/g, " ")}</p></div>
            ))}
          </div>
          <div className="card p-5">
            <h2 className="mb-3 font-bold">Consumo de APIs</h2>
            <div className="space-y-1 text-sm">
              {data.apiUsage.length === 0 ? <p className="muted">Sem dados.</p> : data.apiUsage.map((u, i) => (
                <div key={i} className="flex justify-between rounded-lg px-3 py-2" style={{ background: "var(--surface-2)" }}><span>{u.service} · {u.operation}</span><span>{u.units} unidades / {u.calls} chamadas</span></div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "utilizadores" && (
        <div className="card overflow-x-auto p-5">
          <h2 className="mb-3 font-bold">Utilizadores ({data.users.length})</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-xs muted"><tr><th className="py-2">Nome</th><th>E-mail</th><th>Função</th><th>Estado</th><th>Registo</th></tr></thead>
            <tbody>{data.users.map((u) => (
              <tr key={u.id} className="border-t text-xs" style={{ borderColor: "var(--border)" }}>
                <td className="py-2">{u.name}</td><td>{u.email}</td><td>{u.role}</td>
                <td><span className={`badge ${u.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>{u.is_active ? "Activo" : "Inactivo"}</span></td>
                <td>{new Date(u.created_at).toLocaleDateString("pt-AO")}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === "financeiro" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="card p-5"><p className="text-xs muted">Receita confirmada (teste)</p><p className="text-2xl font-extrabold text-emerald-500">{formatKz(data.finance.revenuePaidCents)}</p></div>
            <div className="card p-5"><p className="text-xs muted">Receita pendente (teste)</p><p className="text-2xl font-extrabold text-blue-500">{formatKz(data.finance.revenuePendingCents)}</p></div>
            <div className="card p-5"><p className="text-xs muted">Custo medido (tarifas configuradas)</p><p className="text-2xl font-extrabold text-cyan-500">{formatKz(data.finance.measuredCostCents)}</p></div>
          </div>
          <p className="text-xs muted">Receita e custo são apresentados separadamente. Não são apresentadas margens ou lucros estimados.</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="mb-3 font-bold">Custo por utilizador</h2>
              {data.finance.byUser.length === 0 ? <p className="text-sm muted">Sem custos registados.</p> : data.finance.byUser.map((r, i) => (
                <div key={i} className="flex justify-between rounded-lg px-3 py-2 text-xs" style={{ background: "var(--surface-2)" }}>
                  <span>{String(r.user_id)}</span><span>{formatKz(Number(r.cost))} · {String(r.records)} registos</span>
                </div>
              ))}
            </div>
            <div className="card p-5">
              <h2 className="mb-3 font-bold">Custo por serviço</h2>
              {data.finance.byService.length === 0 ? <p className="text-sm muted">Sem custos registados.</p> : (() => {
                const max = Math.max(1, ...data.finance.byService.map((r) => Number(r.cost)));
                return data.finance.byService.map((r, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between text-xs"><span>{String(r.service)} · {String(r.operation)}</span><span>{formatKz(Number(r.cost))}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${Math.round(Number(r.cost) / max * 100)}%` }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
          <div className="card overflow-x-auto p-5">
            <h2 className="mb-3 font-bold">Publicações agendadas (modo TESTE)</h2>
            {data.publications.length === 0 ? <p className="text-sm muted">Sem agendamentos.</p> : data.publications.map((p) => (
              <div key={p.id} className="flex flex-wrap gap-3 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)" }}>
                <strong>{p.platform}</strong><span>{p.clip_title}</span><span>{new Date(p.scheduled_at).toLocaleString("pt-AO")}</span>
                <span className="badge bg-cyan-500/10 text-cyan-500">{p.status} · {p.mode}</span>
              </div>
            ))}
          </div>
          <div className="card overflow-x-auto p-5">
            <h2 className="mb-3 font-bold">Planos e pacotes de minutos</h2>
            <div className="space-y-2 text-xs">
              {data.plans.map((p) => (
                <div key={String(p.id)} className="flex flex-wrap gap-4 rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)" }}>
                  <strong>{String(p.name)}</strong><span>{formatKz(Number(p.price_cents))}/mês</span>
                  <span>{String(p.max_video_minutes)} min/vídeo</span><span>{String(p.max_exports)} cortes</span>
                  <span>até {String(p.max_width)}p</span><span>autofoco: {String(p.autofocus_level)}</span>
                  <span>{Number(p.watermark) ? "com marca de água" : "sem marca de água"}</span>
                </div>
              ))}
              {data.packages.map((p) => (
                <div key={String(p.id)} className="flex flex-wrap gap-4 rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)" }}>
                  <strong>{String(p.name)}</strong><span>{formatKz(Number(p.price_cents))}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "pagamentos" && (
        <div className="card overflow-x-auto p-5">
          <h2 className="mb-3 font-bold">Pagamentos e transacções de teste</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-xs muted"><tr><th className="py-2">Referência</th><th>Utilizador</th><th>Valor</th><th>Estado</th><th>Modo</th><th>Data</th></tr></thead>
            <tbody>{data.payments.map((p) => (
              <tr key={p.id} className="border-t text-xs" style={{ borderColor: "var(--border)" }}>
                <td className="py-2 font-mono">{p.provider_ref}</td><td>{p.email}</td><td>{formatKz(p.amount_cents)}</td>
                <td><StatusBadge status={p.status} /></td><td>{p.mode}</td><td>{new Date(p.created_at).toLocaleDateString("pt-AO")}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === "config" && (
        <div className="card p-5">
          <h2 className="mb-1 font-bold">Preços, limites e motores de IA</h2>
          <p className="mb-4 text-xs muted">Valores em modo de teste. Alterações ficam registadas na auditoria.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.keys(settings).sort().map((key) => (
              <label key={key} className="block">
                <span className="label">{key}</span>
                <input className="input !py-2 !text-xs" value={typeof settings[key] === "object" ? JSON.stringify(settings[key]) : String(settings[key] ?? "")}
                  onChange={(e) => {
                    const raw = e.target.value;
                    let value: unknown = raw;
                    if (/^-?\d+(\.\d+)?$/.test(raw)) value = Number(raw);
                    else if (raw === "true" || raw === "false") value = raw === "true";
                    else if (raw.startsWith("[") || raw.startsWith("{")) { try { value = JSON.parse(raw); } catch { /* manter texto */ } }
                    setSettings({ ...settings, [key]: value });
                  }} />
              </label>
            ))}
          </div>
          <button className="btn-primary mt-5" onClick={saveSettings}><Save size={15} /> Guardar configuração</button>
        </div>
      )}

      {tab === "erros" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5"><h2 className="mb-3 font-bold">Erros de processamento</h2>
            {data.errors.length === 0 ? <p className="text-sm muted">Sem erros recentes.</p> : data.errors.map((e) => (
              <div key={e.id} className="mb-2 rounded-lg border p-3 text-xs" style={{ borderColor: "var(--border)" }}><p className="text-rose-400">{e.message}</p><p className="muted">{new Date(e.created_at).toLocaleString("pt-AO")}</p></div>
            ))}
          </div>
          <div className="card p-5"><h2 className="mb-3 font-bold">Registo de auditoria</h2>
            {data.audit.length === 0 ? <p className="text-sm muted">Sem operações registadas.</p> : data.audit.map((a) => (
              <div key={a.id} className="mb-2 rounded-lg border p-3 text-xs" style={{ borderColor: "var(--border)" }}><p>{a.action} <span className="muted">por {a.admin_email}</span></p><p className="muted">{new Date(a.created_at).toLocaleString("pt-AO")}</p></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { Fragment, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { Alert, Spinner, StatusBadge } from "@/components/ui";
import { Users, CreditCard, Settings2, ShieldAlert, BarChart3, Save, Wallet, ListTodo, Trash2, KeyRound, Clock3, Crown } from "lucide-react";
import { formatKz } from "@/lib/client/format";

type Overview = {
  stats: Record<string, number>;
  users: { id: string; email: string; name: string; role: string; is_active: number; plan_id: string; phone: string | null; created_at: string }[];
  payments: { id: string; provider_ref: string; email: string; amount_cents: number; status: string; mode: string; created_at: string }[];
  transactions: Record<string, unknown>[];
  errors: { id: string; message: string; created_at: string }[];
  jobs: { id: string; type: string; status: string; progress: number; stage: string | null; error: string | null; user_id: string; created_at: string }[];
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
  { id: "fila", label: "Fila de tarefas", icon: ListTodo },
  { id: "config", label: "Configuração", icon: Settings2 },
  { id: "erros", label: "Erros e auditoria", icon: ShieldAlert },
];

export function AdminPanel() {
  const [data, setData] = useState<Overview | null>(null);
  const [tab, setTab] = useState("geral");
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [planDrafts, setPlanDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const [packDrafts, setPackDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<{ amount: string; reason: string; password: string; planId: string }>({ amount: "1", reason: "", password: "", planId: "plan_free" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function recarregar() {
    const d = await api<Overview>("/api/admin/overview");
    setData(d);
    setPlanDrafts(Object.fromEntries((d.plans ?? []).map((p) => [String(p.id), { ...p }])));
    setPackDrafts(Object.fromEntries((d.packages ?? []).map((p) => [String(p.id), { ...p }])));
  }

  useEffect(() => {
    recarregar().catch((e) => setError((e as Error).message));
    api<{ settings: Record<string, unknown> }>("/api/admin/settings").then((r) => setSettings(r.settings)).catch(() => {});
  }, []);

  async function act(path: string, body: unknown, method = "PATCH", sucesso = "Operação concluída.") {
    setError(""); setMsg("");
    try {
      await api(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
      setMsg(sucesso);
      await recarregar();
    } catch (e) { setError((e as Error).message); }
  }

  async function saveSettings() {
    setError(""); setMsg("");
    try { await api("/api/admin/settings", { method: "PUT", body: JSON.stringify({ settings }) }); setMsg("Configuração guardada e registada na auditoria."); }
    catch (e) { setError((e as Error).message); }
  }

  function salvarPlano(id: string) {
    const p = { ...(data?.plans.find((x) => String(x.id) === id) ?? {}), ...planDrafts[id] };
    void act("/api/admin/plans", p, "POST", "Plano guardado.");
  }

  function salvarPacote(id: string) {
    const p = { ...(data?.packages.find((x) => String(x.id) === id) ?? {}), ...packDrafts[id] };
    void act("/api/admin/packages", p, "POST", "Pacote guardado.");
  }

  if (error) return <div className="space-y-3"><Alert tone="error">{error}</Alert><button className="btn-ghost" onClick={() => { setError(""); void recarregar(); }}>Tentar novamente</button></div>;
  if (!data) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Painel administrativo</h1>
        <p className="text-sm muted">Controlo total da plataforma. Todas as operações são registadas em auditoria.</p>
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
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Utilizadores ({data.users.length})</h2></div>
          <table className="w-full text-left text-sm">
            <thead className="text-xs muted"><tr><th className="py-2">Nome</th><th>E-mail</th><th>Plano</th><th>Função</th><th>Estado</th><th>Acções</th></tr></thead>
            <tbody>{data.users.map((u) => (
              <Fragment key={u.id}>
                <tr className="border-t text-xs" style={{ borderColor: "var(--border)" }}>
                  <td className="py-2">{u.name}<div className="muted">{u.phone || "sem telefone"}</div></td>
                  <td>{u.email}</td><td>{u.plan_id}</td><td>{u.role}</td>
                  <td><span className={`badge ${u.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>{u.is_active ? "Activo" : "Inactivo"}</span></td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <button className="btn-ghost !px-2 !py-1 !text-[10px]" onClick={() => void act(`/api/admin/users/${u.id}`, { action: "toggle" }, "PATCH", "Estado alterado.")}>{u.is_active ? "Desactivar" : "Activar"}</button>
                      <button className="btn-ghost !px-2 !py-1 !text-[10px]" onClick={() => void act(`/api/admin/users/${u.id}`, { action: "role", role: u.role === "admin" ? "user" : "admin" }, "PATCH", "Função alterada.")}>{u.role === "admin" ? "Tirar admin" : "Tornar admin"}</button>
                      <button className="btn-ghost !px-2 !py-1 !text-[10px]" onClick={() => setOpenUser(openUser === u.id ? null : u.id)}>Gerir</button>
                      {confirmDelete === u.id
                        ? <button className="btn-ghost !px-2 !py-1 !text-[10px] text-rose-400" onClick={() => { void act(`/api/admin/users/${u.id}`, undefined, "DELETE", "Utilizador eliminado."); setConfirmDelete(null); }}>Confirmar exclusão</button>
                        : <button className="btn-ghost !px-2 !py-1 !text-[10px] text-rose-400" onClick={() => setConfirmDelete(u.id)}><Trash2 size={11} /></button>}
                    </div>
                  </td>
                </tr>
                {openUser === u.id && (
                  <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td colSpan={6} className="bg-[var(--surface-2)] p-3">
                      <div className="grid gap-2 md:grid-cols-4">
                        <label className="block"><span className="label">Créditos / minutos</span><input className="input !py-1.5 !text-xs" value={userForm.amount} onChange={(e) => setUserForm({ ...userForm, amount: e.target.value })} /></label>
                        <label className="block"><span className="label">Motivo</span><input className="input !py-1.5 !text-xs" value={userForm.reason} onChange={(e) => setUserForm({ ...userForm, reason: e.target.value })} placeholder="Ajuste manual" /></label>
                        <label className="block"><span className="label">Plano</span><select className="input !py-1.5 !text-xs" value={userForm.planId} onChange={(e) => setUserForm({ ...userForm, planId: e.target.value })}>{(data.plans ?? []).map((p) => <option key={String(p.id)} value={String(p.id)}>{String(p.name)}</option>)}</select></label>
                        <label className="block"><span className="label">Nova palavra-passe</span><input className="input !py-1.5 !text-xs" type="text" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="mín. 8 caracteres" /></label>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button className="btn-primary !px-3 !py-1.5 !text-[11px]" onClick={() => void act(`/api/admin/users/${u.id}`, { action: "credits", amount: Number(userForm.amount), reason: userForm.reason }, "PATCH", "Créditos adicionados.")}><CreditCard size={12} /> Dar créditos</button>
                        <button className="btn-ghost !px-3 !py-1.5 !text-[11px]" onClick={() => void act(`/api/admin/users/${u.id}`, { action: "minutes", amount: Number(userForm.amount), reason: userForm.reason }, "PATCH", "Minutos adicionados.")}><Clock3 size={12} /> Dar minutos</button>
                        <button className="btn-ghost !px-3 !py-1.5 !text-[11px]" onClick={() => void act(`/api/admin/users/${u.id}`, { action: "plan", planId: userForm.planId }, "PATCH", "Plano atribuído.")}><Crown size={12} /> Atribuir plano</button>
                        <button className="btn-ghost !px-3 !py-1.5 !text-[11px]" onClick={() => void act(`/api/admin/users/${u.id}`, { action: "password", password: userForm.password }, "PATCH", "Palavra-passe redefinida; sessões revogadas.")}><KeyRound size={12} /> Redefinir senha</button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === "financeiro" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="card p-5"><p className="text-xs muted">Receita confirmada (teste)</p><p className="text-2xl font-extrabold text-emerald-500">{formatKz(data.finance.revenuePaidCents)}</p></div>
            <div className="card p-5"><p className="text-xs muted">Receita pendente (teste)</p><p className="text-2xl font-extrabold text-blue-500">{formatKz(data.finance.revenuePendingCents)}</p></div>
            <div className="card p-5"><p className="text-xs muted">Custo medido</p><p className="text-2xl font-extrabold text-cyan-500">{formatKz(data.finance.measuredCostCents)}</p></div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card overflow-x-auto p-5">
              <h2 className="mb-3 font-bold">Planos (editáveis)</h2>
              <div className="space-y-3">
                {(data.plans ?? []).map((p) => {
                  const d = planDrafts[String(p.id)] ?? {};
                  return (
                    <div key={String(p.id)} className="space-y-2 rounded-xl border p-3 text-xs" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center justify-between"><strong>{String(p.name)}</strong><span className="muted">{String(p.id)}</span></div>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {[
                          ["name", "Nome"], ["price_cents", "Preço (cêntimos)"], ["input_minutes", "Minutos/mês"],
                          ["max_video_minutes", "Min/vídeo"], ["max_exports", "Cortes"], ["max_width", "Largura máx."],
                          ["credits", "Créditos"], ["sort_order", "Ordem"],
                        ].map(([key, label]) => (
                          <label key={key} className="block"><span className="label !text-[10px]">{label}</span>
                            <input className="input !py-1.5 !text-xs" value={String(d[key] ?? "")} onChange={(e) => setPlanDrafts({ ...planDrafts, [String(p.id)]: { ...d, [key]: e.target.value } })} />
                          </label>
                        ))}
                      </div>
                      <label className="block"><span className="label !text-[10px]">Descrição</span><input className="input !py-1.5 !text-xs" value={String(d.description ?? "")} onChange={(e) => setPlanDrafts({ ...planDrafts, [String(p.id)]: { ...d, description: e.target.value } })} /></label>
                      <div className="flex flex-wrap gap-3">
                        {[["watermark", "Marca de água"], ["is_active", "Activo"], ["animated_subtitles", "Legendas animadas"], ["batch_export", "Exportação em lote"]].map(([key, label]) => (
                          <label key={key} className="flex items-center gap-1 text-[11px]"><input type="checkbox" className="accent-blue-500" checked={Boolean(Number(d[key] ?? 0))} onChange={(e) => setPlanDrafts({ ...planDrafts, [String(p.id)]: { ...d, [key]: e.target.checked ? 1 : 0 } })} /> {label}</label>
                        ))}
                      </div>
                      <button className="btn-primary !px-3 !py-1.5 !text-[11px]" onClick={() => salvarPlano(String(p.id))}><Save size={12} /> Guardar plano</button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card overflow-x-auto p-5">
              <h2 className="mb-3 font-bold">Pacotes de minutos (editáveis)</h2>
              <div className="space-y-3">
                {(data.packages ?? []).map((p) => {
                  const d = packDrafts[String(p.id)] ?? {};
                  return (
                    <div key={String(p.id)} className="space-y-2 rounded-xl border p-3 text-xs" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center justify-between"><strong>{String(p.name)}</strong><span className="muted">{String(p.id)}</span></div>
                      <div className="grid grid-cols-2 gap-2">
                        {[["name", "Nome"], ["minutes", "Minutos"], ["price_cents", "Preço (cêntimos)"], ["sort_order", "Ordem"]].map(([key, label]) => (
                          <label key={key} className="block"><span className="label !text-[10px]">{label}</span><input className="input !py-1.5 !text-xs" value={String(d[key] ?? "")} onChange={(e) => setPackDrafts({ ...packDrafts, [String(p.id)]: { ...d, [key]: e.target.value } })} /></label>
                        ))}
                      </div>
                      <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" className="accent-blue-500" checked={Number(d.is_active ?? 1) === 1} onChange={(e) => setPackDrafts({ ...packDrafts, [String(p.id)]: { ...d, is_active: e.target.checked ? 1 : 0 } })} /> Activo</label>
                      <button className="btn-primary !px-3 !py-1.5 !text-[11px]" onClick={() => salvarPacote(String(p.id))}><Save size={12} /> Guardar pacote</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="card p-5">
            <h2 className="mb-3 font-bold">Custo por serviço</h2>
            {data.finance.byService.length === 0 ? <p className="text-sm muted">Sem custos registados.</p> : data.finance.byService.map((r, i) => (
              <div key={i} className="flex justify-between py-1 text-xs"><span>{String(r.service)} · {String(r.operation)}</span><span>{formatKz(Number(r.cost))}</span></div>
            ))}
          </div>
        </div>
      )}

      {tab === "pagamentos" && (
        <div className="card overflow-x-auto p-5">
          <h2 className="mb-3 font-bold">Pagamentos e transacções de teste</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-xs muted"><tr><th className="py-2">Referência</th><th>Utilizador</th><th>Valor</th><th>Estado</th><th>Modo</th><th>Data</th><th>Acções</th></tr></thead>
            <tbody>{data.payments.map((p) => (
              <tr key={p.id} className="border-t text-xs" style={{ borderColor: "var(--border)" }}>
                <td className="py-2 font-mono">{p.provider_ref}</td><td>{p.email}</td><td>{formatKz(p.amount_cents)}</td>
                <td><StatusBadge status={p.status} /></td><td>{p.mode}</td><td>{new Date(p.created_at).toLocaleDateString("pt-AO")}</td>
                <td><div className="flex gap-1">
                  {p.status !== "paid" && <button className="btn-ghost !px-2 !py-1 !text-[10px] text-emerald-400" onClick={() => void act(`/api/admin/payments/${p.id}`, { action: "confirm" }, "PATCH", "Pagamento de teste confirmado.")}>Confirmar</button>}
                  {p.status !== "paid" && p.status !== "cancelled" && <button className="btn-ghost !px-2 !py-1 !text-[10px] text-rose-400" onClick={() => void act(`/api/admin/payments/${p.id}`, { action: "cancel" }, "PATCH", "Pagamento cancelado.")}>Cancelar</button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === "fila" && (
        <div className="card overflow-x-auto p-5">
          <h2 className="mb-3 font-bold">Fila de tarefas ({data.jobs.length})</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-xs muted"><tr><th className="py-2">ID</th><th>Tipo</th><th>Estado</th><th>Progresso</th><th>Erro</th><th>Acções</th></tr></thead>
            <tbody>{data.jobs.map((j) => (
              <tr key={j.id} className="border-t text-xs" style={{ borderColor: "var(--border)" }}>
                <td className="py-2 font-mono">{j.id}</td><td>{j.type}</td><td><StatusBadge status={j.status} /></td>
                <td>{j.progress}%</td><td className="max-w-[240px] truncate text-rose-400">{j.error ?? "—"}</td>
                <td><div className="flex gap-1">
                  <button className="btn-ghost !px-2 !py-1 !text-[10px] text-emerald-400" onClick={() => void act(`/api/admin/jobs/${j.id}`, { action: "retry" }, "PATCH", "Tarefa voltou à fila.")}>Repetir</button>
                  <button className="btn-ghost !px-2 !py-1 !text-[10px]" onClick={() => void act(`/api/admin/jobs/${j.id}`, { action: "cancel" }, "PATCH", "Tarefa cancelada.")}>Cancelar</button>
                  <button className="btn-ghost !px-2 !py-1 !text-[10px] text-rose-400" onClick={() => void act(`/api/admin/jobs/${j.id}`, { action: "fail" }, "PATCH", "Tarefa marcada como falhada.")}>Falhar</button>
                </div></td>
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

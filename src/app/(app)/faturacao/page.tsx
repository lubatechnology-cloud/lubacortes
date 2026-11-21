"use client";

import { useEffect, useState } from "react";
import { api, post } from "@/lib/client/api";
import { Alert, Spinner, StatusBadge } from "@/components/ui";
import { CreditCard, Coins, CheckCircle2, Crown, Clock, ShieldCheck } from "lucide-react";
import { formatKz } from "@/lib/client/format";

type Plan = { id: string; name: string; description: string; price_cents: number; input_minutes: number; max_exports: number; watermark: number };
type Pack = { id: string; name: string; minutes: number; price_cents: number };
type Usage = {
  plan: Plan; totalMinutesAvailable: number; inputUsedSeconds: number; exportsUsed: number;
  exportsAllowed: number; exportsRemaining: number; purchasedSeconds: number;
  periodStart: string | null; periodEnd: string | null;
};
type BillingOverview = { usage: Usage; plans: Plan[]; packages: Pack[]; history: Record<string, unknown>[] };
type Methods = {
  methods: { id: string; label: string }[];
  prices: { reference: number; express: number; transfer: number; currency: string };
  transfer: { iban: string; bank: string; accountName: string };
  creditsPerPurchase: number;
};
type Payment = { id: string; method: string; amount_cents: number; status: string; provider_ref: string; credits: number; created_at: string; kind: string };
type Selection = { kind: "plan" | "minute_pack" | "credits"; referenceId?: string; label: string; amountCents?: number };

export default function BillingPage() {
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [methods, setMethods] = useState<Methods | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [credits, setCredits] = useState(0);
  const [selection, setSelection] = useState<Selection>({ kind: "credits", label: "Créditos de desbloqueio" });
  const [method, setMethod] = useState<"reference" | "express" | "transfer">("reference");
  const [token, setToken] = useState("");
  const [pending, setPending] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const [b, m, p, a] = await Promise.all([
      api<BillingOverview>("/api/billing/overview"),
      api<Methods>("/api/payments/methods"),
      api<{ payments: Payment[] }>("/api/payments"),
      api<{ credits: number }>("/api/account"),
    ]);
    setOverview(b); setMethods(m); setPayments(p.payments); setCredits(a.credits);
  }
  useEffect(() => { load().catch((e) => setError((e as Error).message)); }, []);

  async function checkout() {
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await post<{ payment: Payment }>("/api/billing/checkout", {
        method, kind: selection.kind, referenceId: selection.referenceId,
      });
      setPending(r.payment);
      setMsg("Pagamento de teste criado. Introduza o token de teste para simular a confirmação.");
      await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function confirm() {
    if (!pending) return;
    setBusy(true); setError("");
    try {
      await post(`/api/payments/${pending.id}/confirm-test`, { testConfirmToken: token });
      setMsg("Pagamento de teste confirmado. O seu saldo foi actualizado.");
      setPending(null); setToken("");
      await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (!overview || !methods) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  const u = overview.usage;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Planos, minutos e pagamentos</h1>
        <p className="text-sm muted">Todos os valores em Kz. Renovação mensal sem cobrança automática.</p>
      </div>
      <Alert>
        <strong>AMBIENTE DE TESTE.</strong> Nenhuma cobrança real é efectuada e nenhuma funcionalidade é activada por clique num botão:
        a confirmação exige o token secreto definido no servidor (<code>PAYMENT_TEST_CONFIRM_TOKEN</code>).
      </Alert>
      {error && <Alert tone="error">{error}</Alert>}
      {msg && <Alert tone="success">{msg}</Alert>}

      <div className="card flex flex-wrap items-center gap-6 p-5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white"><Crown size={20} /></div>
        <div><p className="text-xs muted">Plano actual</p><p className="text-lg font-extrabold">{u.plan.name}</p></div>
        <div><p className="text-xs muted">Minutos disponíveis</p><p className="text-lg font-extrabold text-blue-500">{u.totalMinutesAvailable} min</p></div>
        <div><p className="text-xs muted">Consumidos no mês</p><p className="text-lg font-extrabold">{Math.floor(u.inputUsedSeconds / 60)} min</p></div>
        <div><p className="text-xs muted">Cortes restantes</p><p className="text-lg font-extrabold text-cyan-500">{u.exportsRemaining}</p></div>
        <div><p className="text-xs muted">Créditos de desbloqueio</p><p className="text-lg font-extrabold">{credits}</p></div>
        <p className="w-full text-[11px] muted">Os minutos não utilizados não acumulam para o mês seguinte.</p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold">Planos mensais</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {overview.plans.map((p) => (
            <button key={p.id} onClick={() => setSelection({ kind: "plan", referenceId: p.id, label: `Plano ${p.name}` })}
              className={`card p-5 text-left transition ${selection.kind === "plan" && selection.referenceId === p.id ? "border-blue-500 ring-2 ring-blue-500/30" : "card-hover"}`}>
              <p className="badge bg-blue-500/10 text-blue-500">{p.name}</p>
              <p className="mt-3 text-2xl font-extrabold">{formatKz(p.price_cents)}<span className="text-xs font-normal muted">/mês</span></p>
              <p className="mt-3 text-xs muted">{p.description}</p>
              <ul className="mt-3 space-y-1 text-[11px]">
                <li>✓ {p.input_minutes} min de vídeo de entrada</li>
                <li>✓ Até {p.max_exports} cortes exportados</li>
                <li>{p.watermark ? "• Com marca de água" : "✓ Sem marca de água"}</li>
              </ul>
              {u.plan.id === p.id && <p className="mt-3 text-[11px] font-bold text-emerald-500">Plano actual</p>}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Clock size={18} /> Pacotes adicionais de minutos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {overview.packages.map((p) => (
            <button key={p.id} onClick={() => setSelection({ kind: "minute_pack", referenceId: p.id, label: `Pacote ${p.name}` })}
              className={`card p-5 text-left transition ${selection.kind === "minute_pack" && selection.referenceId === p.id ? "border-cyan-500 ring-2 ring-cyan-500/30" : "card-hover"}`}>
              <p className="font-bold">{p.name}</p>
              <p className="mt-2 text-xl font-extrabold text-cyan-500">{formatKz(p.price_cents)}</p>
              <p className="mt-1 text-xs muted">Minutos adicionais, válidos até serem consumidos.</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><ShieldCheck size={19} /> Compra seleccionada</h2>
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/5 p-4 text-sm">
            <p className="font-bold">{selection.label}</p>
            <p className="mt-1 text-xs muted">Método: {methods.methods.find((m) => m.id === method)?.label}</p>
          </div>
          <button onClick={() => setSelection({ kind: "credits", label: `Créditos de desbloqueio (${methods.creditsPerPurchase} por compra)` })}
            className="btn-ghost mt-3 w-full !text-xs">Seleccionar créditos de desbloqueio</button>
          <p className="mt-3 text-xs muted">Cada desbloqueio de corte custa 1 crédito.</p>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><CreditCard size={19} /> Método de pagamento</h2>
          <div className="space-y-2">
            {methods.methods.map((m) => (
              <button key={m.id} onClick={() => setMethod(m.id as typeof method)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-xs transition ${method === m.id ? "border-blue-500 bg-blue-500/10" : ""}`}
                style={{ borderColor: method === m.id ? undefined : "var(--border)" }}>
                <span>{m.label}</span>
                <span className="font-bold">{formatKz(m.id === "reference" ? methods.prices.reference : m.id === "express" ? methods.prices.express : methods.prices.transfer)}</span>
              </button>
            ))}
          </div>
          {method === "transfer" && (
            <div className="mt-3 rounded-xl border border-dashed border-cyan-500/50 p-3 text-xs">
              <p className="mb-2 font-bold text-cyan-500">Dados bancários de TESTE — não efectuar transferência real</p>
              <p className="font-mono">IBAN: {methods.transfer.iban}</p>
              <p className="font-mono">Banco: {methods.transfer.bank}</p>
              <p className="font-mono">Nome: {methods.transfer.accountName}</p>
            </div>
          )}
          <button className="btn-primary mt-5 w-full" onClick={checkout} disabled={busy}>{busy ? <Spinner /> : "Criar pagamento de teste"}</button>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Coins size={19} /> Confirmação simulada</h2>
          {pending ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-dashed border-cyan-500/40 p-3 text-xs" style={{ borderColor: "var(--border)" }}>
                <p>Transacção: <code className="text-cyan-500">{pending.provider_ref}</code></p>
                <p>Valor: {formatKz(pending.amount_cents)} · <StatusBadge status={pending.status} /></p>
              </div>
              <label className="label">Token de confirmação de teste</label>
              <input className="input" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="PAYMENT_TEST_CONFIRM_TOKEN" />
              <button className="btn-primary w-full" onClick={confirm} disabled={busy || !token}><CheckCircle2 size={16} /> Confirmar simulação</button>
            </div>
          ) : <p className="text-sm muted">Crie um pagamento para ver a referência simulada e confirmar com o token de teste.</p>}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-bold">Histórico de pagamentos</h2>
        {payments.length === 0 ? <p className="text-sm muted">Sem pagamentos registados.</p> : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--border)" }}>
                <span className="font-mono text-xs">{p.provider_ref}</span>
                <span className="badge bg-blue-500/10 text-blue-500">{p.kind}</span>
                <span className="ml-auto font-bold">{formatKz(p.amount_cents)}</span>
                <span className="text-xs muted">+{p.credits} créditos</span>
                <StatusBadge status={p.status} />
                <span className="text-[11px] muted">{new Date(p.created_at).toLocaleDateString("pt-AO")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-bold">Histórico de consumo</h2>
        {overview.history.length === 0 ? <p className="text-sm muted">Sem consumo registado.</p> : (
          <div className="space-y-1">
            {overview.history.slice(0, 20).map((h, i) => (
              <div key={i} className="flex justify-between rounded-lg px-3 py-2 text-xs" style={{ background: "var(--surface-2)" }}>
                <span>{String(h.description)}</span><span>{String(h.kind)} · {String(h.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

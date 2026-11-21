import crypto from "node:crypto";
import { config } from "../config";
import { all, get, getDb, nowIso, run, setting, uid } from "../db";
import { ApiError } from "../http";
import { addCredits } from "./entitlements";
import { activatePlan, addMinutePack } from "../billing";

export type Payment = {
  id: string;
  user_id: string;
  method: "reference" | "express" | "transfer";
  amount_cents: number;
  currency: string;
  status: "pending" | "processing" | "paid" | "expired" | "cancelled" | "failed";
  provider_ref: string;
  idempotency_key: string;
  credits: number;
  description: string;
  mode: "test" | "live";
  confirmed_at: string | null;
  confirmed_by: string | null;
  kind: "credits" | "plan" | "minute_pack";
  reference_id: string | null;
  period_months: number;
  meta_json: string;
  created_at: string;
  updated_at: string;
};

/** Adaptadores independentes — substituíveis por integrações reais. */
export interface PaymentAdapter {
  id: "reference" | "express" | "transfer";
  label: string;
  create(input: { amount: number; currency: string; userId: string }): {
    providerRef: string;
    meta: Record<string, unknown>;
  };
}

class ReferenceAdapter implements PaymentAdapter {
  id = "reference" as const;
  label = "Pagamento por referência (TESTE)";
  create({ amount, currency }: { amount: number; currency: string; userId: string }) {
    const ref = `TEST-REF-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    return {
      providerRef: ref,
      meta: {
        mode: "TESTE — sem movimento de dinheiro",
        entity: "LUBACORTES-TESTE",
        reference: ref,
        amount,
        currency,
        expiresInMinutes: 30,
        instructions: "Simulação. Nenhum pagamento real é processado.",
      },
    };
  }
}

class ExpressAdapter implements PaymentAdapter {
  id = "express" as const;
  label = "Pagamento express (TESTE)";
  create({ amount, currency }: { amount: number; currency: string; userId: string }) {
    const checkout = `TEST-EXP-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    return {
      providerRef: checkout,
      meta: {
        mode: "TESTE — sem movimento de dinheiro",
        checkoutId: checkout,
        amount,
        currency,
        expiresInMinutes: 15,
        instructions: "Simulação. Nenhum pagamento real é processado.",
      },
    };
  }
}

class TransferAdapter implements PaymentAdapter {
  id = "transfer" as const;
  label = "Transferência IBAN (TESTE)";
  create({ amount, currency }: { amount: number; currency: string; userId: string }) {
    const ref = `TEST-IBAN-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    return {
      providerRef: ref,
      meta: {
        mode: "TESTE — NÃO efectuar transferência bancária real",
        iban: setting("payments.transfer_iban", "0040 0000 4040 6279 1012 5"),
        bank: setting("payments.transfer_bank", "BAI"),
        accountName: setting("payments.transfer_account_name", "Fausto Silva"),
        reference: ref,
        amount,
        currency,
        expiresInMinutes: 30,
        instructions: "Dados de teste. Nenhuma transferência real deve ser efectuada.",
      },
    };
  }
}

export const PAYMENT_ADAPTERS: Record<Payment["method"], PaymentAdapter> = {
  reference: new ReferenceAdapter(),
  express: new ExpressAdapter(),
  transfer: new TransferAdapter(),
};

export function availableMethods() {
  return (["reference", "express", "transfer"] as const)
    .filter((m) => {
      const enabled = setting(`payments.${m}_enabled`, true);
      const envEnabled = m === "reference" ? config.payments.referenceEnabled : config.payments.expressEnabled;
      return enabled && (envEnabled || m === "transfer");
    })
    .map((m) => ({ id: m, label: PAYMENT_ADAPTERS[m].label, mode: "test" }));
}

export function createPayment(
  userId: string,
  method: Payment["method"],
  description = "Créditos Lubacortes",
  options: { kind?: Payment["kind"]; referenceId?: string; amountCents?: number; months?: number; credits?: number } = {},
) {
  if (!availableMethods().some((m) => m.id === method)) throw new ApiError(400, "Método de pagamento indisponível.", "method_disabled");
  const kind = options.kind ?? "credits";
  const credits = options.credits ?? setting("pricing.credits_per_purchase", 3);
  const priceKey = method === "reference" ? "pricing.reference_price_cents" : method === "express" ? "pricing.express_price_cents" : "pricing.transfer_price_cents";
  const amount = options.amountCents ?? setting(priceKey, 1500);
  const currency = setting("pricing.currency", "AOA");
  const adapter = PAYMENT_ADAPTERS[method];
  const created = adapter.create({ amount, currency, userId });
  const id = uid("pay_");
  const idempotencyKey = `idem_${crypto.randomBytes(12).toString("hex")}`;
  const now = nowIso();
  run(
    "INSERT INTO payments (id,user_id,method,amount_cents,currency,status,provider_ref,idempotency_key,credits,description,mode,kind,reference_id,period_months,meta_json,created_at,updated_at) VALUES (?,?,?,?,?,'pending',?,?,?,?,'test',?,?,?,?,?,?)",
    id, userId, method, amount, currency, created.providerRef, idempotencyKey, credits, description,
    kind, options.referenceId ?? null, options.months ?? 1,
    JSON.stringify({ ...created.meta, adapter: adapter.id, kind: options.kind ?? "credits" }), now, now,
  );
  event(id, "payment.created", { method, amount, currency, mode: "test", kind }, "adapter");
  return getPayment(userId, id)!;
}

export function getPayment(userId: string, id: string): Payment | undefined {
  return get<Payment>("SELECT * FROM payments WHERE id=? AND user_id=?", id, userId);
}

export function listPayments(userId: string): Payment[] {
  return all<Payment>("SELECT * FROM payments WHERE user_id=? ORDER BY created_at DESC", userId);
}

export function event(paymentId: string, type: string, payload: Record<string, unknown>, source = "system") {
  run("INSERT INTO payment_events (id, payment_id, type, payload_json, source, created_at) VALUES (?,?,?,?,?,?)",
    uid("pev_"), paymentId, type, JSON.stringify(payload), source, nowIso());
}

/**
 * Confirmação SIMULADA controlada pelo ambiente de testes.
 * Nunca é chamada por um botão normal da UI: exige token secreto no backend.
 */
export function confirmTestPayment(paymentId: string, token: string, actor = "test-console") {
  const expected = config.payments.testConfirmToken;
  if (!expected || token !== expected) throw new ApiError(403, "Token de confirmação de teste inválido.", "invalid_test_token");
  const payment = get<Payment>("SELECT * FROM payments WHERE id=?", paymentId);
  if (!payment) throw new ApiError(404, "Pagamento não encontrado.", "not_found");
  if (payment.mode !== "test") throw new ApiError(400, "A confirmação simulada só é válida em modo de teste.", "not_test_mode");
  if (payment.status === "paid") return payment;

  const tx = getDb().transaction(() => {
    run("UPDATE payments SET status='paid', confirmed_at=?, confirmed_by=?, updated_at=? WHERE id=?",
      nowIso(), actor, nowIso(), payment.id);
    addCredits(payment.user_id, payment.credits, "Pagamento de teste confirmado", payment.id);
    if (payment.kind === "plan" && payment.reference_id) {
      activatePlan(payment.user_id, payment.reference_id, payment.id, payment.period_months || 1);
    }
    if (payment.kind === "minute_pack" && payment.reference_id) {
      addMinutePack(payment.user_id, payment.reference_id, payment.id);
    }
    run("INSERT INTO transactions (id, payment_id, user_id, kind, amount_cents, currency, status, external_ref, created_at) VALUES (?,?,?,?,?,?,'paid',?,?)",
      uid("txn_"), payment.id, payment.user_id, "charge", payment.amount_cents, payment.currency, payment.provider_ref, nowIso());
    event(payment.id, "payment.paid", { simulated: true, actor }, "test-console");
  });
  tx();
  return get<Payment>("SELECT * FROM payments WHERE id=?", payment.id)!;
}

/** Webhook preparado para integração futura. Em teste exige assinatura E token de confirmação. */
export function handleWebhook(rawBody: string, signature: string | null, payload: Record<string, unknown>) {
  const secret = config.payments.webhookSecret;
  if (!secret) throw new ApiError(503, "Webhook não configurado.", "webhook_disabled");
  if (!signature) throw new ApiError(401, "Assinatura ausente.", "missing_signature");
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new ApiError(401, "Assinatura inválida.", "invalid_signature");
  }
  const payment = get<Payment>("SELECT * FROM payments WHERE provider_ref=?", String(payload.providerRef ?? ""));
  if (!payment) throw new ApiError(404, "Pagamento não encontrado.", "not_found");
  event(payment.id, String(payload.type ?? "webhook.received"), payload, "webhook");
  if (payload.type === "payment.paid" && payment.mode === "test") {
    const token = String(payload.testConfirmToken ?? "");
    if (token && token === config.payments.testConfirmToken) return confirmTestPayment(payment.id, token, "webhook:test");
  }
  return payment;
}

export function expireOldPayments() {
  const cutoff = new Date(Date.now() - 30 * 60_000).toISOString();
  const rows = all<{ id: string }>("SELECT id FROM payments WHERE status IN ('pending','processing') AND created_at < ?", cutoff);
  for (const row of rows) {
    run("UPDATE payments SET status='expired', updated_at=? WHERE id=?", nowIso(), row.id);
    event(row.id, "payment.expired", {}, "system");
  }
  return rows.length;
}


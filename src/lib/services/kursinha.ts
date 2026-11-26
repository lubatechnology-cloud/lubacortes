import crypto from "node:crypto";
import { config } from "../config";
import { all, get, nowIso } from "../db";
import { confirmExternalPayment } from "./payments";
import { event } from "./payments";

type Produto = { id: string; url: string };
type Payload = {
  event: "sale.pending" | "sale.approved" | "sale.cancelled";
  timestamp?: string;
  data: {
    saleId: string;
    status?: string;
    product?: { id?: string; name?: string; price?: number; currency?: string };
    buyer?: { email?: string; name?: string; phone?: string };
    payment?: { method?: string; transactionId?: string };
  };
};

export function produtosKursinha(): Record<string, Produto> {
  try {
    const obj = JSON.parse(config.kursinha.products || "{}") as Record<string, Produto>;
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

/** HMAC SHA-256 sobre o corpo BRUTO, comparado em tempo constante. */
export function verifyKursinhaSignature(raw: string, header: string | null): boolean {
  const secret = config.kursinha.webhookSecret;
  if (!secret || !header) return false;
  const esperado = `sha256=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}`;
  const a = Buffer.from(esperado);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function parseKursinhaPayload(raw: string): Payload | null {
  try {
    const p = JSON.parse(raw) as Payload;
    return p?.data?.saleId ? p : null;
  } catch {
    return null;
  }
}

type Resultado = { ok: boolean; motivo: string };

/** Processa um evento com idempotência por event + saleId. */
export function processarEventoKursinha(payload: Payload): Resultado {
  const chave = `${payload.event}:${payload.data.saleId}`;
  const ja = get<{ id: string }>(
    "SELECT id FROM payment_events WHERE type='kursinha.webhook' AND payload_json LIKE ? LIMIT 1",
    `%${payload.data.saleId}%`,
  );
  if (ja) return { ok: true, motivo: "duplicado" };
  if (payload.event !== "sale.approved") return { ok: true, motivo: "evento ignorado" };

  const email = String(payload.data.buyer?.email ?? "").toLowerCase().trim();
  const productId = String(payload.data.product?.id ?? "");
  if (!email || !productId) return { ok: false, motivo: "dados de comprador/produto ausentes" };

  const mapa = produtosKursinha();
  const referencia = Object.entries(mapa).find(([, p]) => p.id === productId)?.[0];
  // Produtos alheios à Lubacortes são reconhecidos e ignorados (200) para não
  // provar retalhações desnecessárias da Kursinha nem poluir os logs.
  if (!referencia) return { ok: true, motivo: "produto alheio à Lubacortes — ignorado" };

  const usuario = get<{ id: string }>("SELECT id FROM users WHERE email=?", email);
  if (!usuario) return { ok: false, motivo: "comprador sem conta Lubacortes com esse e-mail" };

  const candidatos = all<{ id: string; amount_cents: number; meta_json: string }>(
    "SELECT id,amount_cents,meta_json FROM payments WHERE user_id=? AND status='pending' AND mode='live' AND meta_json LIKE '%\"adapter\":\"kursinha\"%' AND reference_id=? ORDER BY created_at DESC LIMIT 10",
    usuario.id, referencia,
  );
  const preco = payload.data.product?.price;
  const pagamento = candidatos.find((p) =>
    preco === undefined ||
    Math.abs(p.amount_cents - Math.round(preco * 100)) <= 1 ||
    Math.abs(p.amount_cents - Math.round(preco)) <= 1,
  );
  if (!pagamento) return { ok: false, motivo: "sem pagamento pendente correspondente" };

  confirmExternalPayment(pagamento.id, `kursinha:${payload.data.saleId}`, payload.data.saleId);
  event(
    pagamento.id, "kursinha.webhook",
    { chave, saleId: payload.data.saleId, productId, email, aprovadoEm: nowIso() },
    "webhook",
  );
  return { ok: true, motivo: "pagamento confirmado" };
}

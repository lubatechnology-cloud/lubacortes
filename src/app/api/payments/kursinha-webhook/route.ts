import { fail, ok } from "@/lib/http";
import { config } from "@/lib/config";
import { parseKursinhaPayload, processarEventoKursinha, verifyKursinhaSignature } from "@/lib/services/kursinha";

export const dynamic = "force-dynamic";

/** Webhook da Kursinha: valida HMAC sobre o corpo bruto e confirma a venda. */
export async function POST(req: Request) {
  try {
    if (!config.kursinha.webhookSecret) return fail(new Error("KURSINHA_WEBHOOK_SECRET não configurado."));
    const raw = await req.text();
    const assinatura = req.headers.get("x-webhook-signature");
    // A Kursinha não expõe campo "secret" no painel; quando não há assinatura,
    // exigimos a chave partilhada na URL do webhook.
    const chaveUrl = new URL(req.url).searchParams.get("key");
    const autorizado = assinatura
      ? verifyKursinhaSignature(raw, assinatura)
      : Boolean(chaveUrl && chaveUrl === config.kursinha.webhookSecret);
    if (!autorizado) return ok({ received: false, error: "assinatura_invalida" }, 401);
    const payload = parseKursinhaPayload(raw);
    if (!payload) return ok({ received: false, error: "payload_invalido" }, 400);
    const r = processarEventoKursinha(payload);
    return ok({ received: true, ...r }, r.ok ? 200 : 422);
  } catch (e) {
    return fail(e);
  }
}

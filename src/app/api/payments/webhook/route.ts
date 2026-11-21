import { fail, ok, readJson } from "@/lib/http";
import { handleWebhook } from "@/lib/services/payments";

/** Webhook preparado para futura integração real; em teste exige assinatura HMAC e token. */
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const payload = JSON.parse(raw) as Record<string, unknown>;
    const signature = req.headers.get("x-lubacortes-signature");
    const payment = handleWebhook(raw, signature, payload);
    return ok({ received: true, status: payment.status });
  } catch (e) {
    return fail(e);
  }
}

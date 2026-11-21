import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { availableMethods } from "@/lib/services/payments";
import { setting } from "@/lib/db";

export async function GET() {
  try {
    await requireUser();
    return ok({
      methods: availableMethods(),
      mode: "test",
      prices: {
        reference: setting("pricing.reference_price_cents", 1500),
        express: setting("pricing.express_price_cents", 1500),
        transfer: setting("pricing.transfer_price_cents", 1500),
        currency: setting("pricing.currency", "AOA"),
      },
      transfer: {
        iban: setting("payments.transfer_iban", "0040 0000 4040 6279 1012 5"),
        bank: setting("payments.transfer_bank", "BAI"),
        accountName: setting("payments.transfer_account_name", "Fausto Silva"),
      },
      creditsPerPurchase: setting("pricing.credits_per_purchase", 3),
      notice: "AMBIENTE DE TESTE — nenhuma cobrança real é efectuada.",
    });
  } catch (e) {
    return fail(e);
  }
}

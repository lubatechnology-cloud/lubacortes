import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { confirmTestPayment, getPayment } from "@/lib/services/payments";

const schema = z.object({ testConfirmToken: z.string().min(8, "Token de confirmação de teste obrigatório.") });

type Ctx = { params: Promise<{ id: string }> };

/** Confirmação simulada — exige token secreto definido no servidor (PAYMENT_TEST_CONFIRM_TOKEN). */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const payload = schema.parse(await readJson(req));
    if (!getPayment(user.id, id)) return fail(new (await import("@/lib/http")).ApiError(404, "Pagamento não encontrado.", "not_found"));
    const payment = confirmTestPayment(id, payload.testConfirmToken, `test-user:${user.id}`);
    return ok({ payment, message: "Pagamento de teste confirmado. Créditos adicionados." });
  } catch (e) {
    return fail(e);
  }
}

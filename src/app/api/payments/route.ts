import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { createPayment, listPayments } from "@/lib/services/payments";

const schema = z.object({
  method: z.enum(["reference", "express", "transfer"]),
  description: z.string().trim().max(140).optional(),
}).default({ method: "reference" });

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ payments: listPayments(user.id) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await readJson(req).catch(() => ({})));
    const payment = createPayment(user.id, body.method, body.description);
    return ok({ payment, notice: "PAGAMENTO EM MODO DE TESTE — sem movimento de dinheiro." }, 201);
  } catch (e) {
    return fail(e);
  }
}

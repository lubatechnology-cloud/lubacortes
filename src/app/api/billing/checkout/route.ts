import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { getPlan, listPackages } from "@/lib/billing";
import { createPayment } from "@/lib/services/payments";

const schema = z.object({
  method: z.enum(["reference", "express", "transfer"]),
  kind: z.enum(["plan", "minute_pack", "credits"]),
  referenceId: z.string().optional(),
  months: z.number().int().min(1).max(12).optional(),
}).strict();

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await readJson(req));
    let amountCents: number | undefined;
    let description: string;
    if (body.kind === "plan") {
      const plan = getPlan(body.referenceId ?? "");
      if (!plan) throw new Error("Plano inválido.");
      amountCents = plan.price_cents * (body.months ?? 1);
      description = `Plano ${plan.name} — ${body.months ?? 1} mês(es)`;
    } else if (body.kind === "minute_pack") {
      const pack = listPackages().find((p) => p.id === body.referenceId);
      if (!pack) throw new Error("Pacote inválido.");
      amountCents = pack.price_cents;
      description = `Pacote ${pack.name}`;
    } else {
      description = "Créditos de desbloqueio Lubacortes";
    }
    const payment = createPayment(user.id, body.method, description, {
      kind: body.kind,
      referenceId: body.referenceId,
      amountCents,
      months: body.months,
    });
    return ok({ payment, notice: "PAGAMENTO EM MODO DE TESTE — sem movimento de dinheiro." }, 201);
  } catch (e) {
    if (e instanceof Error && ["Plano inválido.", "Pacote inválido."].includes(e.message)) {
      return fail(new (await import("@/lib/http")).ApiError(400, e.message, "invalid_reference"));
    }
    return fail(e);
  }
}

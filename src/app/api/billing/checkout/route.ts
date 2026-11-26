import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { getPlan, listPackages } from "@/lib/billing";
import { createKursinhaPayment, createPayment } from "@/lib/services/payments";
import { produtosKursinha } from "@/lib/services/kursinha";

const schema = z.object({
  method: z.enum(["reference", "express", "transfer", "kursinha"]),
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
    if (body.method === "kursinha") {
      const chaveProduto = body.referenceId ?? (body.kind === "credits" ? "credits" : "");
      const produto = produtosKursinha()[chaveProduto];
      if (!produto) throw new (await import("@/lib/http")).ApiError(400, "Este plano/pacote ainda não tem checkout Kursinha configurado.", "kursinha_product_missing");
      const payment = createKursinhaPayment(user.id, description, {
        kind: body.kind as "plan" | "minute_pack" | "credits",
        referenceId: body.referenceId,
        amountCents: amountCents ?? 0,
        months: body.months,
        checkoutUrl: produto.url,
        checkoutId: produto.id,
      });
      return ok({ payment, checkoutUrl: produto.url, notice: "Vais ser encaminhado para o checkout seguro da Kursinha." }, 201);
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

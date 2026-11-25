import { z } from "zod";
import { clientIp, requireAdmin } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { adminCancelPayment, adminConfirmPayment } from "@/lib/services/admin";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ action: z.enum(["confirm", "cancel"]) });

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { action } = schema.parse(await readJson(req));
    const payment = action === "confirm"
      ? adminConfirmPayment(admin.id, id, clientIp(req))
      : (adminCancelPayment(admin.id, id, clientIp(req)), { id, status: "cancelled" });
    return ok({ payment, action });
  } catch (e) {
    return fail(e);
  }
}

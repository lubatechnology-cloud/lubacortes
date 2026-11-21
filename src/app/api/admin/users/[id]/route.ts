import { z } from "zod";
import { clientIp, requireAdmin } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { grantCredits, setUserRole, toggleUser } from "@/lib/services/admin";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  action: z.enum(["role", "toggle", "credits"]),
  role: z.enum(["user", "admin"]).optional(),
  amount: z.number().int().optional(),
  reason: z.string().optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = schema.parse(await readJson(req));
    const ip = clientIp(req);
    if (body.action === "role" && body.role) setUserRole(admin.id, id, body.role, ip);
    else if (body.action === "toggle") toggleUser(admin.id, id, ip);
    else if (body.action === "credits") grantCredits(admin.id, id, body.amount ?? 1, body.reason ?? "Crédito manual do administrador", ip);
    return ok({ updated: true });
  } catch (e) {
    return fail(e);
  }
}

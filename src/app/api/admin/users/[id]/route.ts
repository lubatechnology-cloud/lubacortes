import { z } from "zod";
import { clientIp, requireAdmin } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import {
  assignPlan, deleteUser, grantCredits, grantMinutes, resetUserPassword, setUserRole, toggleUser,
} from "@/lib/services/admin";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  action: z.enum(["role", "toggle", "credits", "minutes", "plan", "password"]),
  role: z.enum(["user", "admin"]).optional(),
  amount: z.number().optional(),
  reason: z.string().optional(),
  planId: z.string().optional(),
  password: z.string().optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = schema.parse(await readJson(req));
    const ip = clientIp(req);
    if (body.action === "role" && body.role) setUserRole(admin.id, id, body.role, ip);
    else if (body.action === "toggle") toggleUser(admin.id, id, ip);
    else if (body.action === "credits") grantCredits(admin.id, id, Math.trunc(body.amount ?? 1), body.reason ?? "Crédito manual do administrador", ip);
    else if (body.action === "minutes") grantMinutes(admin.id, id, Number(body.amount ?? 0), body.reason ?? "Ajuste manual do administrador", ip);
    else if (body.action === "plan" && body.planId) assignPlan(admin.id, id, body.planId, ip);
    else if (body.action === "password" && body.password) resetUserPassword(admin.id, id, body.password, ip);
    else throw new (await import("@/lib/http")).ApiError(400, "Dados insuficientes para a acção.", "invalid_action");
    return ok({ updated: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    deleteUser(admin.id, id, clientIp(_req));
    return ok({ deleted: true });
  } catch (e) {
    return fail(e);
  }
}

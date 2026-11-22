import { z } from "zod";
import { assertSameOrigin, requireUser } from "@/lib/auth";
import { nowIso, run } from "@/lib/db";
import { fail, ok, readJson } from "@/lib/http";

const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  notifyEmail: z.boolean().optional(),
  notifyWhatsapp: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  try {
    await assertSameOrigin(req);
    const user = await requireUser();
    const body = schema.parse(await readJson(req));
    const campos: string[] = [];
    const valores: unknown[] = [];
    if (body.name) { campos.push("name=?"); valores.push(body.name); }
    if (body.phone !== undefined) { campos.push("phone=?"); valores.push(body.phone || null); }
    if (body.notifyEmail !== undefined) { campos.push("notify_email=?"); valores.push(body.notifyEmail ? 1 : 0); }
    if (body.notifyWhatsapp !== undefined) { campos.push("notify_whatsapp=?"); valores.push(body.notifyWhatsapp ? 1 : 0); }
    if (campos.length) {
      campos.push("updated_at=?"); valores.push(nowIso(), user.id);
      run(`UPDATE users SET ${campos.join(",")} WHERE id=?`, ...valores);
    }
    return ok({ guardado: true });
  } catch (e) { return fail(e); }
}

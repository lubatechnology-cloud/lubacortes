import { z } from "zod";
import { clientIp, requireAdmin } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { setJobAction } from "@/lib/services/admin";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ action: z.enum(["retry", "cancel", "fail"]) });

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { action } = schema.parse(await readJson(req));
    setJobAction(admin.id, id, action, clientIp(req));
    return ok({ updated: true, action });
  } catch (e) {
    return fail(e);
  }
}

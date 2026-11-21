import { z } from "zod";
import { assertSameOrigin, requireUser } from "@/lib/auth";
import { nowIso, run } from "@/lib/db";
import { fail, ok, readJson } from "@/lib/http";

const schema = z.object({ name: z.string().trim().min(2).max(80) });

export async function PATCH(req: Request) {
  try {
    await assertSameOrigin(req);
    const user = await requireUser();
    const { name } = schema.parse(await readJson(req));
    run("UPDATE users SET name=?, updated_at=? WHERE id=?", name, nowIso(), user.id);
    return ok({ name });
  } catch (e) { return fail(e); }
}

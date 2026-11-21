import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { updateBrand } from "@/lib/services/brands";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = z.object({
      name: z.string().trim().min(2).max(80).optional(),
      subtitleStyle: z.record(z.unknown()).optional(),
    }).parse(await readJson(req));
    return ok({ brand: updateBrand(user.id, id, body) });
  } catch (e) { return fail(e); }
}

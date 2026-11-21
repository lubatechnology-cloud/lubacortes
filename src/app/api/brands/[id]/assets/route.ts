import { requireUser } from "@/lib/auth";
import { ApiError, fail, ok } from "@/lib/http";
import { saveBrandAsset } from "@/lib/services/brands";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const form = await req.formData();
    const kind = String(form.get("kind") ?? "") as "logo" | "intro" | "outro";
    const file = form.get("file");
    if (!["logo", "intro", "outro"].includes(kind) || !(file instanceof File)) {
      throw new ApiError(400, "Pedido inválido.", "invalid");
    }
    return ok({ brand: await saveBrandAsset(user.id, id, kind, file) });
  } catch (e) { return fail(e); }
}

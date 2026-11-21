import { requireUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { ApiError, fail, ok } from "@/lib/http";
import { canDownload, creditBalance, hasUsedFreeClip } from "@/lib/services/entitlements";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const clip = get<Record<string, unknown>>("SELECT * FROM clips WHERE id=? AND user_id=?", id, user.id);
    if (!clip) throw new ApiError(404, "Corte não encontrado.", "not_found");
    return ok({
      clip: {
        ...clip,
        canDownload: Boolean(canDownload(user.id, id)),
        freeUsed: hasUsedFreeClip(user.id),
        credits: creditBalance(user.id),
      },
    });
  } catch (e) {
    return fail(e);
  }
}

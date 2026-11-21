import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { ApiError, fail, ok, readJson } from "@/lib/http";
import { chooseFreeClip, unlockClipWithCredit } from "@/lib/services/entitlements";

const schema = z.object({ mode: z.enum(["free", "credit"]) });

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { mode } = schema.parse(await readJson(req));
    const clip = mode === "free" ? chooseFreeClip(user.id, id) : unlockClipWithCredit(user.id, id);
    return ok({ clip, mode });
  } catch (e) {
    if (e instanceof ApiError) return fail(e);
    return fail(e);
  }
}

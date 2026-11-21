import { requireUser } from "@/lib/auth";
import { get, nowIso, run } from "@/lib/db";
import { ApiError, fail, ok } from "@/lib/http";
import { enqueue } from "@/lib/queue";

type Ctx = { params: Promise<{ id: string }> };

/** Volta a renderizar um corte usando as legendas e o enquadramento editados. */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const clip = get<{ id: string; project_id: string; user_id: string; style_json: string; status: string; subtitle_lang: string }>(
      "SELECT id,project_id,user_id,style_json,status,subtitle_lang FROM clips WHERE id=? AND user_id=?", id, user.id,
    );
    if (!clip) throw new ApiError(404, "Corte não encontrado.", "not_found");
    if (!["ready", "failed"].includes(clip.status)) throw new ApiError(409, "O corte ainda está a ser processado.", "busy");
    const style = JSON.parse(clip.style_json || "{}") as Record<string, unknown>;
    run("UPDATE clips SET status='queued', error=NULL, updated_at=? WHERE id=?", nowIso(), id);
    const jobId = enqueue(
      "render",
      { clipId: id, regenerate: true, style, subtitleLang: clip.subtitle_lang },
      user.id,
      clip.project_id,
    );
    return ok({ jobId }, 202);
  } catch (e) { return fail(e); }
}

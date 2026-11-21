import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { get, nowIso, run } from "@/lib/db";
import { ApiError, fail, ok, readJson } from "@/lib/http";
import { enqueue } from "@/lib/queue";
import { featuresForUser } from "@/lib/billing";

/** Exportação em lote — planos com batch_export (Agência). */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const feat = featuresForUser(user.id);
    if (!feat.batchExport) throw new ApiError(402, "Exportação em lote requer o plano AGÊNCIA.", "batch_locked");
    const { clipIds } = z.object({ clipIds: z.array(z.string()).min(1).max(50) }).parse(await readJson(req));
    const jobs: string[] = [];
    for (const id of clipIds) {
      const clip = get<{ id: string; project_id: string; style_json: string; subtitle_lang: string; status: string }>(
        "SELECT id,project_id,style_json,subtitle_lang,status FROM clips WHERE id=? AND user_id=?", id, user.id,
      );
      if (!clip || !["ready", "failed"].includes(clip.status)) continue;
      run("UPDATE clips SET status='queued', updated_at=? WHERE id=?", nowIso(), id);
      jobs.push(enqueue("render", {
        clipId: id, regenerate: true,
        style: JSON.parse(clip.style_json || "{}"),
        subtitleLang: clip.subtitle_lang,
      }, user.id, clip.project_id, feat.priority));
    }
    return ok({ jobs, notice: `${jobs.length} cortes enviados para exportação em lote.` }, 202);
  } catch (e) { return fail(e); }
}

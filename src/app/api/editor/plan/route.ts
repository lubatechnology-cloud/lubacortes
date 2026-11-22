import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { planEdits } from "@/lib/ai/edit-plan";
import { get } from "@/lib/db";
import { all } from "@/lib/db";

const schema = z.object({ clipId: z.string().min(1), instrucao: z.string().trim().min(3).max(1000) });

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { clipId, instrucao } = schema.parse(await readJson(req));
    const clip = get<{ id: string; title: string; subtitle_lang: string; style_json: string; start_sec: number; end_sec: number }>(
      "SELECT id,title,subtitle_lang,style_json,start_sec,end_sec FROM clips WHERE id=? AND user_id=?", clipId, user.id,
    );
    if (!clip) throw new Error("Corte não encontrado.");
    const legendas = all<{ display_text: string }>("SELECT display_text FROM subtitle_segments WHERE clip_id=? ORDER BY idx", clipId);
    const plano = await planEdits(instrucao, {
      titulo: clip.title,
      idiomaAtual: clip.subtitle_lang,
      estiloAtual: JSON.parse(clip.style_json || "{}"),
      duracao: Number((clip.end_sec - clip.start_sec).toFixed(1)),
      legendas: legendas.slice(0, 6).map((l) => l.display_text),
    });
    return ok(plano);
  } catch (e) { return fail(e); }
}

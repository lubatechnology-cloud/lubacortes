import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { all, get, getDb, nowIso, run } from "@/lib/db";
import { ApiError, fail, ok, readJson } from "@/lib/http";
import { EditOperation } from "@/lib/ai/edit-plan";
import { enqueue } from "@/lib/queue";
import { assertAutofocusAllowed, assertFormatAllowed, featuresForUser } from "@/lib/billing";

const FORMATOS: Record<string, string> = { "9:16": "reels", "1:1": "square", "16:9": "youtube", "4:5": "instagram-feed" };

const schema = z.object({
  clipId: z.string().min(1),
  operacoes: z.array(EditOperation).min(1).max(20),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { clipId, operacoes } = schema.parse(await readJson(req));
    const clip = get<{
      id: string; project_id: string; user_id: string; title: string; subtitle_lang: string;
      style_json: string; start_sec: number; end_sec: number; focus_x: number | null; focus_y: number | null;
      status: string;
    }>("SELECT * FROM clips WHERE id=? AND user_id=?", clipId, user.id);
    if (!clip) throw new ApiError(404, "Corte não encontrado.", "not_found");
    if (!["ready", "failed"].includes(clip.status)) throw new ApiError(409, "O corte está a ser processado.", "busy");

    const feat = featuresForUser(user.id);
    const style = JSON.parse(clip.style_json || "{}") as Record<string, unknown>;
    let formato = "";
    let novoInicio = clip.start_sec;
    let novoFim = clip.end_sec;
    let idioma = clip.subtitle_lang;
    let titulo = clip.title;
    let focusX = clip.focus_x;
    let focusY = clip.focus_y;
    let maxWidth = feat.maxWidth;
    const legendas = all<{ display_text: string }>("SELECT display_text FROM subtitle_segments WHERE clip_id=? ORDER BY idx", clipId);

    for (const op of operacoes) {
      switch (op.op) {
        case "set_format":
          assertFormatAllowed(user.id, FORMATOS[op.formato]);
          formato = FORMATOS[op.formato];
          break;
        case "set_quality":
          if (op.largura > feat.maxWidth) throw new ApiError(402, `O seu plano permite até ${feat.maxWidth}p.`, "quality_locked");
          maxWidth = op.largura;
          break;
        case "set_subtitle_language":
          idioma = op.idioma;
          break;
        case "set_subtitle_style":
          if (op.estilo.tamanho && op.estilo.tamanho > 200) throw new ApiError(400, "Tamanho de legenda inválido.", "bad_style");
          Object.assign(style, {
            font: op.estilo.fonte ?? style.font,
            fontSize: op.estilo.tamanho ?? style.fontSize,
            primaryColor: op.estilo.cor ?? style.primaryColor,
            highlightColor: op.estilo.destaque ?? style.highlightColor,
            position: op.estilo.posicao === "inferior" ? "bottom" : op.estilo.posicao === "centro" ? "center" : op.estilo.posicao === "superior" ? "top" : style.position,
            bold: op.estilo.negrito ?? style.bold,
            karaoke: op.estilo.karaoke ?? style.karaoke,
            animation: op.estilo.animacao === "nenhuma" ? "none" : op.estilo.animacao === "fade" ? "fade" : op.estilo.animacao === "pop" ? "pop" : style.animation,
          });
          break;
        case "set_focus": {
          assertAutofocusAllowed(user.id, op.modo === "rostos" || op.modo === "grupo" ? "model" : op.modo, op.modo === "grupo");
          style.autofocusMode = op.modo === "centro" ? "center" : op.modo === "manual" ? "manual" : "model";
          style.groupFocus = op.modo === "grupo";
          if (op.modo === "manual") { focusX = op.x ?? 0.5; focusY = op.y ?? 0.5; }
          break;
        }
        case "set_title":
          titulo = op.titulo;
          break;
        case "set_caption":
          if (op.indice < legendas.length) {
            run("UPDATE subtitle_segments SET display_text=? WHERE clip_id=? AND idx=?", op.texto, clipId, op.indice);
          }
          break;
        case "trim":
          novoInicio = Math.max(0, Math.min(op.inicio, clip.end_sec - 1));
          novoFim = Math.max(novoInicio + 1, Math.min(op.fim, clip.end_sec));
          break;
        case "manter_emocao":
          style.emocaoFoco = op.emocao;
          style.karaoke = true;
          break;
        case "remover_silencios":
          style.removerSilencios = true;
          style.limiteSilencioDb = op.limite_db ?? -35;
          break;
        case "destacar_palavra": {
          style.palavraDestacada = op.palavra;
          const idx = op.indice ?? 0;
          if (idx < legendas.length) {
            const atual = legendas[idx].display_text;
            run("UPDATE subtitle_segments SET display_text=? WHERE clip_id=? AND idx=?", atual, clipId, idx);
          }
          break;
        }
      }
    }

    const tx = getDb().transaction(() => {
      run(
        "UPDATE clips SET title=?, subtitle_lang=?, style_json=?, focus_x=?, focus_y=?, start_sec=?, end_sec=?, status='queued', updated_at=? WHERE id=?",
        titulo, idioma, JSON.stringify(style), focusX, focusY, novoInicio, novoFim, nowIso(), clipId,
      );
      if (formato) run("UPDATE clips SET format=? WHERE id=?", formato, clipId);
    });
    tx();

    const jobId = enqueue(
      "render",
      {
        clipId,
        regenerate: true,
        style: { ...style, maxWidth },
        subtitleLang: idioma,
      },
      user.id,
      clip.project_id,
      feat.priority,
    );
    return ok({ jobId, aplicadas: operacoes.length, aviso: "Corte reenviado para renderização com as alterações." }, 202);
  } catch (e) { return fail(e); }
}

import path from "node:path";
import fs from "node:fs";
import { all, get, nowIso, run, uid } from "../db";
import { progress } from "../queue";
import { statStorage, storagePath } from "../storage";
import { buildAss, DEFAULT_SUBTITLE_STYLE, type SubtitleStyle } from "../video/subtitles";
import { extractThumbnail, probe } from "../video/ffmpeg";
import { renderClip } from "../video/render";
import { planFocus } from "../video/focus";
import { getTranslationProvider } from "../ai/translate";
import type { Job } from "../queue";
import { featuresForUser, recordCost, shouldWatermark } from "../billing";
import { concatVideos } from "../video/ffmpeg";

type ClipRow = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  start_sec: number;
  end_sec: number;
  format: string;
  subtitle_lang: string;
  style_json: string;
  style_preset: string;
  intro_path: string | null;
  outro_path: string | null;
  storage_path: string | null;
  focus_x: number | null;
  focus_y: number | null;
};

type SubtitleSegment = { start: number; end: number; text: string; source?: string };

function saveSubtitles(clipId: string, segments: SubtitleSegment[]) {
  run("DELETE FROM subtitle_segments WHERE clip_id=?", clipId);
  segments.forEach((s, i) => {
    run(
      "INSERT INTO subtitle_segments (id,clip_id,idx,start_sec,end_sec,source_text,display_text,created_at) VALUES (?,?,?,?,?,?,?,?)",
      uid("sub_"), clipId, i, s.start, s.end, s.source ?? s.text, s.text, nowIso(),
    );
  });
}

function loadSubtitles(clipId: string): SubtitleSegment[] {
  const rows = all<{ start_sec: number; end_sec: number; display_text: string }>(
    "SELECT start_sec,end_sec,display_text FROM subtitle_segments WHERE clip_id=? ORDER BY idx", clipId,
  );
  return rows.map((r) => ({ start: r.start_sec, end: r.end_sec, text: r.display_text }));
}

export async function runRenderJob(job: Job) {
  const payload = JSON.parse(job.payload_json) as {
    clipId: string;
    segments?: { start: number; end: number; text: string }[];
    language?: string;
    subtitleLang?: string;
    style?: Partial<SubtitleStyle>;
    transcriptionWarning?: string;
    manualFocus?: { x: number; y: number };
    regenerate?: boolean;
  };
  const clip = get<ClipRow>("SELECT * FROM clips WHERE id=? AND user_id=?", payload.clipId, job.user_id);
  if (!clip) throw new Error("Corte não encontrado.");
  const project = get<{ id: string; storage_path: string | null }>(
    "SELECT id, storage_path FROM projects WHERE id=? AND user_id=?", clip.project_id, job.user_id,
  );
  if (!project?.storage_path) throw new Error("Vídeo de origem não encontrado.");
  const video = storagePath(project.storage_path);
  const relDir = path.posix.join("projects", clip.user_id, clip.project_id, "clips");
  const outRel = path.posix.join(relDir, `${clip.id}.mp4`);
  const thumbRel = path.posix.join(relDir, `${clip.id}.jpg`);
  const assRel = path.posix.join(relDir, `${clip.id}.ass`);
  const outAbs = storagePath(outRel);
  const thumbAbs = storagePath(thumbRel);
  const assAbs = storagePath(assRel);

  run("UPDATE clips SET status='rendering', updated_at=? WHERE id=?", nowIso(), clip.id);
  progress(job.id, 5, "a_preparar_legendas");

  const savedStyle = JSON.parse(clip.style_json || "{}") as Record<string, unknown>;
  const style: SubtitleStyle = {
    ...DEFAULT_SUBTITLE_STYLE,
    ...savedStyle,
    ...(payload.style ?? {}),
  } as SubtitleStyle;
  const autofocusMode = ((payload.style as Record<string, unknown> | undefined)?.autofocusMode ??
    savedStyle.autofocusMode ?? "center") as "center" | "model" | "manual";

  const target = payload.subtitleLang ?? clip.subtitle_lang;
  const translator = getTranslationProvider();
  const translated: SubtitleSegment[] = [];

  if (payload.regenerate) {
    translated.push(...loadSubtitles(clip.id));
  } else {
    const allSegments = payload.segments ?? [];
    const inClip = allSegments.filter((s) => s.end > clip.start_sec && s.start < clip.end_sec);
    for (const seg of inClip) {
      let text = seg.text;
      if (target !== "pt" && target !== "pt-AO") {
        try {
          const r = await translator.translate(seg.text, target, payload.language);
          text = r.text;
          run("INSERT INTO api_usage (id, user_id, project_id, service, operation, units, created_at) VALUES (?,?,?,?,?,?,?)",
            uid("use_"), job.user_id, clip.project_id, "translation", target, 1, nowIso());
        } catch (e) {
          text = seg.text;
          style.untranslated = true;
          console.warn("[render] tradução falhou:", (e as Error).message);
        }
      }
      translated.push({
        start: Math.max(0, seg.start - clip.start_sec),
        end: Math.min(clip.end_sec - clip.start_sec, seg.end - clip.start_sec),
        text,
        source: seg.text,
      });
    }
    saveSubtitles(clip.id, translated);
    if (style.untranslated === undefined && target !== "pt" && target !== "pt-AO" && translator.name === "none") {
      style.untranslated = true;
    }
    if (payload.transcriptionWarning && !inClip.length) style.untranslated = false;
  }

  if (translated.length) {
    const { writeStorage } = await import("../storage");
    writeStorage(assRel, Buffer.from(buildAss(translated, style, 0), "utf8"));
  }

  progress(job.id, 14, "a_calcular_enquadramento");
  const manual =
    clip.focus_x !== null && clip.focus_y !== null
      ? { x: clip.focus_x, y: clip.focus_y }
      : payload.manualFocus;
  const focus = await planFocus({
    video,
    start: clip.start_sec,
    end: clip.end_sec,
    workDir: path.posix.join("projects", clip.user_id, clip.project_id, "focus"),
    manual: autofocusMode === "manual" ? manual : undefined,
    mode: autofocusMode,
    group: Boolean(savedStyle.groupFocus),
  });
  if (focus.warning) console.warn("[render]", focus.warning);

  progress(job.id, 20, "a_renderizar");
  const feat = featuresForUser(job.user_id);
  const mainRel = path.posix.join(relDir, `${clip.id}_main.mp4`);
  const mainAbs = storagePath(mainRel);
  await renderClip({
    input: video,
    output: mainAbs,
    maxWidth: feat.maxWidth,
    start: clip.start_sec,
    end: clip.end_sec,
    formatId: clip.format,
    subtitlePath: translated.length ? assAbs : undefined,
    focus: focus.samples,
    watermark: shouldWatermark(job.user_id),
    onProgress: (p) => progress(job.id, 20 + p.pct * 0.72, "a_renderizar"),
  });

  // Introdução e encerramento personalizados (planos com branding).
  const parts: string[] = [];
  if (clip.intro_path && statStorage(clip.intro_path)) parts.push(storagePath(clip.intro_path));
  parts.push(mainAbs);
  if (clip.outro_path && statStorage(clip.outro_path)) parts.push(storagePath(clip.outro_path));
  if (parts.length > 1) await concatVideos(parts, outAbs);
  else fs.copyFileSync(mainAbs, outAbs);
  fs.rmSync(mainAbs, { force: true });

  progress(job.id, 94, "a_gerar_miniatura");
  const meta = await probe(outAbs).catch(() => null);
  try {
    await extractThumbnail(outAbs, thumbAbs, 0.5);
  } catch {
    /* opcional */
  }

  run(
    "UPDATE clips SET status='ready', storage_path=?, thumb_path=?, duration=?, style_json=?, updated_at=?, error=NULL WHERE id=?",
    outRel, thumbRel, meta?.duration ?? Number((clip.end_sec - clip.start_sec).toFixed(2)), JSON.stringify(style), nowIso(), clip.id,
  );
  run("INSERT INTO api_usage (id, user_id, project_id, service, operation, units, created_at) VALUES (?,?,?,?,?,?,?)",
    uid("use_"), job.user_id, clip.project_id, "ffmpeg", "render_clip", 1, nowIso());
  recordCost({
    userId: job.user_id, projectId: clip.project_id, jobId: job.id,
    service: "ffmpeg", operation: "render_clip", units: Number(((clip.end_sec - clip.start_sec) / 60).toFixed(2)),
    note: "Minutos de vídeo processados; tarifa configurável no painel administrativo",
  });

  return { clipId: clip.id, output: outRel, subtitleLang: target, autofocus: focus.provider, warning: focus.warning };
}

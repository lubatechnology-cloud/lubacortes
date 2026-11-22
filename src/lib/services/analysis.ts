import { all, get, nowIso, run, uid } from "../db";
import { enqueue, progress } from "../queue";
import { storagePath } from "../storage";
import { ensureLocalSource } from "./source";
import { detectScenes, detectSilences, extractAudio, extractThumbnail, probe } from "../video/ffmpeg";
import { capturarLive } from "../video/live";
import { getTranscriptionProvider } from "../ai/transcribe";
import { detectMoments } from "../ai/moments";
import { DEFAULT_SUBTITLE_STYLE, type SubtitleStyle } from "../video/subtitles";
import { setting } from "../db";
import { suggestions } from "../video/formats";
import { featuresForUser, recordCost, reserveExports } from "../billing";
import type { Job } from "../queue";
import type { Project } from "./projects";

export async function runAnalyzeJob(job: Job) {
  const payload = JSON.parse(job.payload_json) as {
    projectId: string;
    subtitleLang?: string;
    formatId?: string;
    style?: Partial<SubtitleStyle>;
    maxClips?: number;
    manualFocus?: { x: number; y: number };
    autofocusMode?: "center" | "model" | "manual";
    groupFocus?: boolean;
    stylePreset?: string;
    liveUrl?: string;
    captureSeconds?: number;
  };
  const project = get<Project>("SELECT * FROM projects WHERE id=? AND user_id=?", payload.projectId, job.user_id);
  if (!project?.storage_path) throw new Error("Projecto ou ficheiro de origem não encontrado.");
  if (payload.liveUrl) {
    progress(job.id, 3, "a_capturar_live");
    const rel = `projects/${project.user_id}/${project.id}/source.mp4`;
    const abs = storagePath(rel);
    await capturarLive(payload.liveUrl, payload.captureSeconds ?? 60, abs);
    const meta = await probe(abs);
    const thumbRel = `projects/${project.user_id}/${project.id}/thumb.jpg`;
    try { await extractThumbnail(abs, storagePath(thumbRel), 1); } catch { /* opcional */ }
    run("UPDATE projects SET storage_path=?, thumbnail_path=?, duration=?, status='analyzing', updated_at=? WHERE id=?",
      rel, thumbRel, meta.duration, nowIso(), project.id);
    project.storage_path = rel;
    project.duration = meta.duration;
  }

  const video = await ensureLocalSource(project);
  const workDir = `projects/${project.user_id}/${project.id}`;

  progress(job.id, 8, "a_ler_metadados");
  const meta = await probe(video);
  run("UPDATE projects SET width=?, height=?, duration=?, updated_at=? WHERE id=?", meta.width, meta.height, meta.duration, nowIso(), project.id);

  progress(job.id, 18, "a_detectar_cenas");
  let sceneChanges: number[] = [];
  try {
    sceneChanges = await detectScenes(video);
  } catch (e) {
    console.warn("[analyze] detecção de cenas falhou:", (e as Error).message);
  }

  progress(job.id, 32, "a_detectar_pausas");
  let silences: { start: number; end: number }[] = [];
  try {
    silences = await detectSilences(video);
  } catch (e) {
    console.warn("[analyze] detecção de silêncio falhou:", (e as Error).message);
  }

  progress(job.id, 45, "a_transcrever");
  let segments: { start: number; end: number; text: string }[] = [];
  let language = "desconhecido";
  let transcriptionWarning: string | undefined;
  if (meta.hasAudio) {
    const audioRel = `${workDir}/audio.wav`;
    const audioAbs = storagePath(audioRel);
    try {
      await extractAudio(video, audioAbs, 0, meta.duration);
      const result = await getTranscriptionProvider().transcribe(audioAbs);
      segments = result.segments;
      language = result.language;
      transcriptionWarning = result.warning;
      run("UPDATE projects SET detected_language=?, updated_at=? WHERE id=?", language, nowIso(), project.id);
    } catch (e) {
      transcriptionWarning = `Transcrição falhou: ${(e as Error).message.slice(0, 200)}`;
      console.warn("[analyze]", transcriptionWarning);
    }
  }

  progress(job.id, 70, "a_identificar_momentos");
  const maxClips = payload.maxClips ?? setting("limits.clips_per_project", 12);
  const moments = detectMoments({
    duration: meta.duration,
    segments,
    silences,
    sceneChanges,
    maxClips,
  });

  if (!moments.length) {
    throw new Error(
      segments.length === 0
        ? "Não foi possível identificar momentos: não detetámos fala neste vídeo. Use um vídeo com áudio falado."
        : "Não foi possível identificar momentos relevantes neste vídeo com os sinais disponíveis.",
    );
  }

  recordCost({ userId: job.user_id, projectId: project.id, jobId: job.id, service: "ai", operation: "moment_detection", units: Number((meta.duration / 60).toFixed(2)) });
  if (meta.hasAudio) recordCost({ userId: job.user_id, projectId: project.id, jobId: job.id, service: "ai", operation: "transcription", units: Number((meta.duration / 60).toFixed(2)) });

  // Limite de exportações do plano — reservado antes de gerar os cortes.
  const allowedExports = reserveExports(job.user_id, moments.length, project.id);
  const exportedMoments = moments.slice(0, allowedExports);
  const limitWarning = exportedMoments.length < moments.length
    ? `Limite de cortes do plano atingido: ${exportedMoments.length} de ${moments.length} momentos foram exportados.`
    : undefined;

  progress(job.id, 82, "a_criar_cortes");
  const formatId = payload.formatId ?? "reels";
  const subtitleLang = payload.subtitleLang ?? "pt";
  const style = {
    ...DEFAULT_SUBTITLE_STYLE,
    ...(payload.style ?? {}),
    autofocusMode: payload.autofocusMode ?? "center",
    stylePreset: payload.stylePreset ?? "padrao",
    groupFocus: Boolean(payload.groupFocus),
  };
  const sug = suggestions(formatId, moments[0].title);

  for (const m of exportedMoments) {
    const now = nowIso();
    const momentId = uid("mom_");
    run(
      "INSERT INTO moments (id, project_id, start_sec, end_sec, title, description, reason, score, category, emocao, intensidade, transcript, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      momentId, project.id, m.startSec, m.endSec, m.title, m.description, m.reason, m.score, m.category, m.emocao, m.intensidade, m.transcript, now,
    );
    const clipId = uid("clip_");
    const s = suggestions(formatId, m.title);
    run(
      "INSERT INTO clips (id, project_id, user_id, moment_id, title, description, start_sec, end_sec, duration, format, subtitle_lang, style_json, style_preset, hashtags, cta, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'queued',?,?)",
      clipId, project.id, job.user_id, momentId, s.title, s.description, m.startSec, m.endSec,
      Number((m.endSec - m.startSec).toFixed(2)), formatId, subtitleLang, JSON.stringify(style),
      String(style.stylePreset ?? "padrao"), s.hashtags, s.cta, now, now,
    );
    enqueue(
      "render",
      { clipId, segments, language, subtitleLang, style, transcriptionWarning, manualFocus: payload.manualFocus },
      job.user_id,
      project.id,
      featuresForUser(job.user_id).priority,
    );
  }

  progress(job.id, 95, "a_finalizar");
  run("UPDATE projects SET status='ready', updated_at=? WHERE id=?", nowIso(), project.id);
  run("INSERT INTO api_usage (id, user_id, project_id, service, operation, units, created_at) VALUES (?,?,?,?,?,?,?)",
    uid("use_"), job.user_id, project.id, "ai", "moment_detection", moments.length, nowIso());

  return {
    projectId: project.id,
    moments: moments.length,
    clips: exportedMoments.length,
    language,
    transcriptionWarning,
    limitWarning,
    segments,
    sceneChanges: sceneChanges.length,
    silences: silences.length,
    sampleCopy: sug,
  };
}

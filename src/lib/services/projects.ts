import path from "node:path";
import { config } from "../config";
import { all, get, nowIso, run, uid } from "../db";
import { enqueue } from "../queue";
import { writeStorage, storagePath } from "../storage";
import { extractThumbnail, probe } from "../video/ffmpeg";
import { fetchToBuffer, validateSourceUrl } from "../video/url";
import { ApiError } from "../http";
import { chargeInputMinutes, featuresForUser } from "../billing";
import { validarUrlLive } from "../video/live";

export type Project = {
  id: string;
  user_id: string;
  title: string;
  source_type: string;
  source_url: string | null;
  storage_path: string | null;
  remote_path: string | null;
  thumbnail_path: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  detected_language: string | null;
  status: string;
  error: string | null;
  created_at: string;
  updated_at: string;
};

const ALLOWED_UPLOAD = new Set([
  "video/mp4", "video/quicktime", "video/webm", "video/x-matroska",
  "video/mpeg", "video/x-msvideo", "video/ogg", "application/octet-stream",
]);

function relPath(userId: string, projectId: string, file: string) {
  return path.posix.join("projects", userId, projectId, file);
}

async function createProjectRecord(userId: string, title: string, sourceType: "url" | "upload", sourceUrl: string | null) {
  const id = uid("prj_");
  const now = nowIso();
  run(
    "INSERT INTO projects (id, user_id, title, source_type, source_url, status, created_at, updated_at) VALUES (?,?,?,?,?,'importing',?,?)",
    id, userId, title, sourceType, sourceUrl, now, now,
  );
  return id;
}

export async function createProjectFromUrl(userId: string, rawUrl: string): Promise<Project> {
  const url = await validateSourceUrl(rawUrl);
  const title = decodeURIComponent(url.pathname.split("/").pop() || url.hostname).replace(/[-_]+/g, " ").slice(0, 120);
  const id = await createProjectRecord(userId, title || "Vídeo importado", "url", rawUrl);
  try {
    const buffer = await fetchToBuffer(rawUrl, config.maxUploadBytes);
    const ext = path.extname(url.pathname).toLowerCase() || ".mp4";
    const rel = relPath(userId, id, `source${ext}`);
    writeStorage(rel, buffer);
    return await finalizeImport(id, userId, rel);
  } catch (err) {
    run("UPDATE projects SET status='failed', error=?, updated_at=? WHERE id=?", (err as Error).message, nowIso(), id);
    throw err instanceof ApiError ? err : new ApiError(400, `Falha na importação: ${(err as Error).message}`, "import_failed");
  }
}

export async function createProjectFromUpload(userId: string, file: File): Promise<Project> {
  if (!ALLOWED_UPLOAD.has(file.type)) {
    throw new ApiError(415, "Tipo de ficheiro não suportado. Use MP4, MOV, WEBM ou MKV.", "unsupported_type");
  }
  if (file.size > config.maxUploadBytes) throw new ApiError(413, "Ficheiro demasiado grande.", "too_large");
  if (file.size === 0) throw new ApiError(400, "Ficheiro vazio.", "empty_file");
  const id = await createProjectRecord(userId, file.name.replace(/\.[^.]+$/, "").slice(0, 120), "upload", null);
  try {
    const rel = relPath(userId, id, `source${path.extname(file.name).toLowerCase() || ".mp4"}`);
    writeStorage(rel, Buffer.from(await file.arrayBuffer()));
    return await finalizeImport(id, userId, rel);
  } catch (err) {
    run("UPDATE projects SET status='failed', error=?, updated_at=? WHERE id=?", (err as Error).message, nowIso(), id);
    throw err instanceof ApiError ? err : new ApiError(400, `Falha na importação: ${(err as Error).message}`, "import_failed");
  }
}

async function finalizeImport(id: string, userId: string, rel: string): Promise<Project> {
  const abs = storagePath(rel);
  const meta = await probe(abs);
  if (!meta.duration || meta.duration <= 0) throw new ApiError(400, "Não foi possível ler a duração do vídeo.", "probe_failed");
  // Os minutos são consumidos pela duração do vídeo ORIGINAL, antes de qualquer análise.
  const maxMinutes = featuresForUser(userId).maxVideoMinutes;
  if (meta.duration / 60 > maxMinutes) {
    throw new ApiError(402, `Este vídeo tem ${Math.round(meta.duration / 60)} min; o seu plano permite até ${maxMinutes} min por vídeo.`, "video_too_long");
  }
  chargeInputMinutes(userId, meta.duration, id, path.basename(abs));
  const thumbRel = relPath(userId, id, "thumb.jpg");
  try {
    await extractThumbnail(abs, storagePath(thumbRel), Math.min(1, meta.duration / 4));
  } catch {
    /* miniatura é opcional */
  }
  const now = nowIso();
  run(
    "UPDATE projects SET storage_path=?, thumbnail_path=?, duration=?, width=?, height=?, status='ready', updated_at=? WHERE id=?",
    rel, thumbRel, meta.duration, meta.width, meta.height, now, id,
  );
  return getProject(userId, id)!;
}

/** Projecto criado a partir de um ficheiro já enviado directamente para o Storage. */
export function createProjectFromRemote(userId: string, remotePath: string, fileName: string, size: number) {
  const id = uid("prj_");
  const now = nowIso();
  run(
    "INSERT INTO projects (id,user_id,title,source_type,remote_path,status,created_at,updated_at) VALUES (?,?,?,'upload',?,'importing',?,?)",
    id, userId, fileName.replace(/\.[^.]+$/, "").slice(0, 120), remotePath, now, now,
  );
  // reserva os minutos pela duração estimada; o worker ajusta depois com a duração real
  chargeInputMinutes(userId, Math.max(1, Math.round(size / 1024 / 1024 * 6)), id, fileName);
  const jobId = enqueue(
    "analyze",
    { projectId: id, subtitleLang: "pt", formatId: "reels", style: {} },
    userId, id, featuresForUser(userId).priority,
  );
  return { project: getProject(userId, id)!, jobId };
}

/** Capta um trecho de uma live HLS autorizada e cria o projecto para análise. */
export function createLiveProject(userId: string, url: string, segundos: number) {
  validarUrlLive(url);
  const duracao = Math.max(5, Math.min(600, Math.round(segundos)));
  const id = uid("prj_");
  const now = nowIso();
  run(
    "INSERT INTO projects (id,user_id,title,source_type,source_url,duration,status,created_at,updated_at) VALUES (?,?,?,'url',?,?,'importing',?,?)",
    id, userId, `Live — ${new URL(url).hostname}`, url, duracao, now, now,
  );
  chargeInputMinutes(userId, duracao, id, "live");
  const jobId = enqueue(
    "analyze",
    { projectId: id, liveUrl: url, captureSeconds: duracao, subtitleLang: "pt", formatId: "reels", style: {} },
    userId,
    id,
    featuresForUser(userId).priority,
  );
  return { project: getProject(userId, id)!, jobId };
}

/** Passo 3-5: depois de escolher idioma e formato, inicia a análise e geração. */
export function startAnalysis(
  userId: string,
  projectId: string,
  options: {
    subtitleLang?: string;
    formatId?: string;
    style?: Record<string, unknown>;
    maxClips?: number;
    manualFocus?: { x: number; y: number };
    autofocusMode?: "center" | "model" | "manual";
    groupFocus?: boolean;
    stylePreset?: string;
  },
) {
  const project = getProject(userId, projectId);
  if (!project) throw new ApiError(404, "Projecto não encontrado.", "not_found");
  if (!project.storage_path) throw new ApiError(409, "O vídeo ainda não foi importado.", "not_imported");
  run("UPDATE projects SET status='analyzing', error=NULL, updated_at=? WHERE id=?", nowIso(), projectId);
  const jobId = enqueue(
    "analyze",
    {
      projectId,
      subtitleLang: options.subtitleLang ?? "pt",
      formatId: options.formatId ?? "reels",
      style: options.style ?? {},
      maxClips: options.maxClips,
      manualFocus: options.manualFocus,
      autofocusMode: options.autofocusMode,
      groupFocus: options.groupFocus,
      stylePreset: options.stylePreset,
    },
    userId,
    projectId,
  );
  return { jobId, projectId };
}

export function getProject(userId: string, id: string): Project | undefined {
  return get<Project>("SELECT * FROM projects WHERE id=? AND user_id=?", id, userId);
}

export function listProjects(userId: string, limit = 50): Project[] {
  return all<Project>("SELECT * FROM projects WHERE user_id=? ORDER BY created_at DESC LIMIT ?", userId, limit);
}

export function deleteProject(userId: string, id: string) {
  const project = getProject(userId, id);
  if (!project) throw new ApiError(404, "Projecto não encontrado.", "not_found");
  run("DELETE FROM projects WHERE id=? AND user_id=?", id, userId);
}

import { all, get, nowIso, run, uid } from "../db";
import { ApiError } from "../http";
import { featuresForUser } from "../billing";

/**
 * Publicação e agendamento — modo TESTE.
 * Nunca contacta redes sociais: apenas regista a intenção. A activação real exige
 * credenciais oficiais (OAuth + revisão das plataformas) e uma integração autorizada.
 */
export type Publication = {
  id: string; user_id: string; clip_id: string; platform: string; scheduled_at: string;
  status: string; mode: string; error: string | null; created_at: string;
};

export const PLATFORMS = ["tiktok", "instagram", "youtube", "facebook", "linkedin"];

export function schedulePublication(userId: string, clipId: string, platform: string, scheduledAt: string) {
  const feat = featuresForUser(userId);
  if (!feat.autoPublish) throw new ApiError(402, "Agendamento de publicações requer o plano PROFISSIONAL ou superior.", "publish_locked");
  if (!PLATFORMS.includes(platform)) throw new ApiError(400, "Plataforma não suportada.", "bad_platform");
  const clip = get<{ id: string; is_unlocked: number; status: string }>(
    "SELECT id,is_unlocked,status FROM clips WHERE id=? AND user_id=?", clipId, userId,
  );
  if (!clip || !clip.is_unlocked || clip.status !== "ready") {
    throw new ApiError(403, "Apenas cortes desbloqueados e prontos podem ser agendados.", "clip_locked");
  }
  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) throw new ApiError(400, "Data de agendamento inválida.", "bad_date");
  const id = uid("pub_");
  const now = nowIso();
  run(
    "INSERT INTO publications (id,user_id,clip_id,platform,scheduled_at,status,mode,created_at,updated_at) VALUES (?,?,?,?,?,'test_pending','test',?,?)",
    id, userId, clipId, platform, when.toISOString(), now, now,
  );
  return getPublication(userId, id)!;
}

export function getPublication(userId: string, id: string) {
  return get<Publication>("SELECT * FROM publications WHERE id=? AND user_id=?", id, userId);
}

export function listPublications(userId: string) {
  return all<Publication>("SELECT * FROM publications WHERE user_id=? ORDER BY scheduled_at DESC", userId);
}

export function cancelPublication(userId: string, id: string) {
  const p = getPublication(userId, id);
  if (!p) throw new ApiError(404, "Agendamento não encontrado.", "not_found");
  if (p.status !== "test_pending") throw new ApiError(409, "Este agendamento já não pode ser cancelado.", "bad_state");
  run("UPDATE publications SET status='cancelled', updated_at=? WHERE id=?", nowIso(), id);
}

/** Executado pelo worker: em TESTE nunca publica de verdade. */
export function processDuePublications() {
  const due = all<{ id: string }>("SELECT id FROM publications WHERE status='test_pending' AND scheduled_at <= ?", nowIso());
  for (const row of due) {
    run("UPDATE publications SET status='test_sent', updated_at=? WHERE id=?", nowIso(), row.id);
  }
  return due.length;
}

export function publishNotice() {
  return "Modo TESTE: nenhuma publicação real é efectuada. É necessária integração oficial com credenciais autorizadas das plataformas.";
}

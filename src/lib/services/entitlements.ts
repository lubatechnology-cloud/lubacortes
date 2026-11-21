import { get, getDb, nowIso, run, uid } from "../db";
import { ApiError } from "../http";

type Clip = {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  thumb_path: string | null;
  storage_path: string | null;
  duration: number;
  status: string;
  is_unlocked: number;
  unlock_kind: string | null;
};

/** Uma conta escolhe UM corte gratuito, uma única vez. Operação atómica no backend. */
export function chooseFreeClip(userId: string, clipId: string) {
  const tx = getDb().transaction(() => {
    const existing = get<{ clip_id: string }>("SELECT clip_id FROM free_selections WHERE user_id=?", userId);
    if (existing) throw new ApiError(409, "Esta conta já utilizou o corte gratuito.", "free_already_used");
    const clip = get<Clip>("SELECT * FROM clips WHERE id=? AND user_id=?", clipId, userId);
    if (!clip) throw new ApiError(404, "Corte não encontrado.", "not_found");
    if (clip.status !== "ready") throw new ApiError(409, "O corte ainda não está pronto.", "clip_not_ready");
    if (clip.is_unlocked) throw new ApiError(409, "Este corte já está desbloqueado.", "already_unlocked");
    run("UPDATE clips SET is_unlocked=1, unlock_kind='free', updated_at=? WHERE id=?", nowIso(), clipId);
    run("INSERT INTO free_selections (id, user_id, clip_id, created_at) VALUES (?,?,?,?)", uid("free_"), userId, clipId, nowIso());
    return get<Clip>("SELECT * FROM clips WHERE id=?", clipId)!;
  });
  return tx();
}

export function creditBalance(userId: string): number {
  const row = get<{ total: number }>(
    "SELECT COALESCE(SUM(delta),0) AS total FROM credit_ledger WHERE user_id=?", userId,
  );
  return row?.total ?? 0;
}

export function addCredits(userId: string, amount: number, reason: string, referenceId?: string) {
  if (amount <= 0) return;
  run("INSERT INTO credit_ledger (id, user_id, delta, reason, reference_id, created_at) VALUES (?,?,?,?,?,?)",
    uid("led_"), userId, amount, reason, referenceId ?? null, nowIso());
}

export function unlockClipWithCredit(userId: string, clipId: string) {
  const tx = getDb().transaction(() => {
    const clip = get<Clip>("SELECT * FROM clips WHERE id=? AND user_id=?", clipId, userId);
    if (!clip) throw new ApiError(404, "Corte não encontrado.", "not_found");
    if (clip.status !== "ready") throw new ApiError(409, "O corte ainda não está pronto.", "clip_not_ready");
    if (clip.is_unlocked) throw new ApiError(409, "Este corte já está desbloqueado.", "already_unlocked");
    if (creditBalance(userId) < 1) throw new ApiError(402, "Créditos insuficientes.", "insufficient_credits");
    run("INSERT INTO credit_ledger (id, user_id, delta, reason, reference_id, created_at) VALUES (?,?,?,?,?,?)",
      uid("led_"), userId, -1, "Desbloqueio de corte", clipId, nowIso());
    run("UPDATE clips SET is_unlocked=1, unlock_kind='paid', updated_at=? WHERE id=?", nowIso(), clipId);
    return get<Clip>("SELECT * FROM clips WHERE id=?", clipId)!;
  });
  return tx();
}

/** Verificação de autorização no servidor antes de servir qualquer ficheiro. */
export function canDownload(userId: string, clipId: string): Clip | null {
  const clip = get<Clip>("SELECT * FROM clips WHERE id=? AND user_id=?", clipId, userId);
  if (!clip || !clip.is_unlocked || clip.status !== "ready" || !clip.storage_path) return null;
  return clip;
}

export function hasUsedFreeClip(userId: string): boolean {
  return Boolean(get("SELECT 1 AS x FROM free_selections WHERE user_id=?", userId));
}

import { all, get, nowIso, run, uid } from "../db";
import { ApiError } from "../http";
import { hashPassword } from "../auth";
import { config } from "../config";
import { confirmTestPayment } from "./payments";

export function audit(adminId: string, action: string, targetType?: string, targetId?: string, meta: Record<string, unknown> = {}, ip?: string) {
  run("INSERT INTO audit_logs (id, admin_id, action, target_type, target_id, meta_json, ip, created_at) VALUES (?,?,?,?,?,?,?,?)",
    uid("aud_"), adminId, action, targetType ?? null, targetId ?? null, JSON.stringify(meta), ip ?? null, nowIso());
}

export function stats() {
  const one = (sql: string, ...p: unknown[]) => Number((get<{ n: number }>(sql, ...p)?.n ?? 0));
  return {
    users: one("SELECT COUNT(*) AS n FROM users"),
    projects: one("SELECT COUNT(*) AS n FROM projects"),
    clips: one("SELECT COUNT(*) AS n FROM clips"),
    readyClips: one("SELECT COUNT(*) AS n FROM clips WHERE status='ready'"),
    lockedClips: one("SELECT COUNT(*) AS n FROM clips WHERE is_unlocked=0"),
    jobsQueued: one("SELECT COUNT(*) AS n FROM jobs WHERE status='queued'"),
    jobsRunning: one("SELECT COUNT(*) AS n FROM jobs WHERE status='running'"),
    jobsFailed: one("SELECT COUNT(*) AS n FROM jobs WHERE status='failed'"),
    paymentsPaid: one("SELECT COUNT(*) AS n FROM payments WHERE status='paid'"),
    paymentsPending: one("SELECT COUNT(*) AS n FROM payments WHERE status='pending'"),
    errors24h: one("SELECT COUNT(*) AS n FROM processing_errors WHERE created_at > ?", new Date(Date.now() - 86_400_000).toISOString()),
    apiCalls24h: one("SELECT COUNT(*) AS n FROM api_usage WHERE created_at > ?", new Date(Date.now() - 86_400_000).toISOString()),
    freeUsed: one("SELECT COUNT(*) AS n FROM free_selections"),
  };
}

export function listUsers() {
  return all<{ id: string; email: string; name: string; role: string; is_active: number; email_verified_at: string | null; plan_id: string; phone: string | null; created_at: string }>(
    "SELECT id,email,name,role,is_active,email_verified_at,plan_id,phone,created_at FROM users ORDER BY created_at DESC LIMIT 200",
  );
}

export function setUserRole(adminId: string, userId: string, role: "user" | "admin", ip?: string) {
  if (!get("SELECT 1 FROM users WHERE id=?", userId)) throw new ApiError(404, "Utilizador não encontrado.", "not_found");
  run("UPDATE users SET role=?, updated_at=? WHERE id=?", role, nowIso(), userId);
  audit(adminId, "user.role_changed", "user", userId, { role }, ip);
}

export function toggleUser(adminId: string, userId: string, ip?: string) {
  if (!get("SELECT 1 FROM users WHERE id=?", userId)) throw new ApiError(404, "Utilizador não encontrado.", "not_found");
  run("UPDATE users SET is_active = CASE is_active WHEN 1 THEN 0 ELSE 1 END, updated_at=? WHERE id=?", nowIso(), userId);
  audit(adminId, "user.toggled", "user", userId, {}, ip);
}

export function grantCredits(adminId: string, userId: string, amount: number, reason: string, ip?: string) {
  if (!get("SELECT 1 FROM users WHERE id=?", userId)) throw new ApiError(404, "Utilizador não encontrado.", "not_found");
  run("INSERT INTO credit_ledger (id,user_id,delta,reason,created_at) VALUES (?,?,?,?,?)", uid("led_"), userId, amount, reason, nowIso());
  audit(adminId, "credits.granted", "user", userId, { amount, reason }, ip);
}

export function assignPlan(adminId: string, userId: string, planId: string, ip?: string) {
  if (!get("SELECT 1 FROM users WHERE id=?", userId)) throw new ApiError(404, "Utilizador não encontrado.", "not_found");
  if (!get("SELECT 1 FROM plans WHERE id=?", planId)) throw new ApiError(404, "Plano não encontrado.", "not_found");
  const now = nowIso();
  const end = new Date(Date.now() + 30 * 86_400_000).toISOString();
  run(
    "UPDATE users SET plan_id=?, plan_status='active', plan_period_start=?, plan_period_end=?, updated_at=? WHERE id=?",
    planId, now, end, now, userId,
  );
  audit(adminId, "user.plan_assigned", "user", userId, { planId }, ip);
}

export function grantMinutes(adminId: string, userId: string, minutes: number, reason: string, ip?: string) {
  if (!get("SELECT 1 FROM users WHERE id=?", userId)) throw new ApiError(404, "Utilizador não encontrado.", "not_found");
  if (!Number.isFinite(minutes) || minutes === 0) throw new ApiError(400, "Minutos inválidos.", "invalid_minutes");
  run(
    "INSERT INTO minute_ledger (id,user_id,delta_seconds,reason,reference_id,created_at) VALUES (?,?,?,?,?,?)",
    uid("min_"), userId, Math.round(minutes * 60), reason || "Ajuste manual do administrador", null, nowIso(),
  );
  audit(adminId, "minutes.granted", "user", userId, { minutes, reason }, ip);
}

export function resetUserPassword(adminId: string, userId: string, password: string, ip?: string) {
  if (password.length < 8) throw new ApiError(400, "A palavra-passe deve ter pelo menos 8 caracteres.", "weak_password");
  if (!get("SELECT 1 FROM users WHERE id=?", userId)) throw new ApiError(404, "Utilizador não encontrado.", "not_found");
  const now = nowIso();
  run("UPDATE users SET password_hash=?, failed_logins=0, locked_until=NULL, updated_at=? WHERE id=?", hashPassword(password), now, userId);
  run("UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL", now, userId);
  audit(adminId, "user.password_reset", "user", userId, {}, ip);
}

export function deleteUser(adminId: string, userId: string, ip?: string) {
  if (adminId === userId) throw new ApiError(400, "Não pode eliminar a sua própria conta.", "cannot_delete_self");
  if (!get("SELECT 1 FROM users WHERE id=?", userId)) throw new ApiError(404, "Utilizador não encontrado.", "not_found");
  run("DELETE FROM users WHERE id=?", userId);
  audit(adminId, "user.deleted", "user", userId, {}, ip);
}

export function setJobAction(adminId: string, jobId: string, action: "retry" | "cancel" | "fail", ip?: string) {
  const job = get<{ id: string; status: string }>("SELECT id,status FROM jobs WHERE id=?", jobId);
  if (!job) throw new ApiError(404, "Tarefa não encontrada.", "not_found");
  const now = nowIso();
  if (action === "retry") {
    run("UPDATE jobs SET status='queued', run_after=?, attempts=0, error=NULL, locked_at=NULL, locked_by=NULL, updated_at=? WHERE id=?", now, now, jobId);
  } else if (action === "cancel") {
    run("UPDATE jobs SET status='cancelled', locked_at=NULL, locked_by=NULL, updated_at=? WHERE id=?", now, jobId);
  } else {
    run("UPDATE jobs SET status='failed', error=?, locked_at=NULL, locked_by=NULL, updated_at=? WHERE id=?", "Marcado como falhado pelo administrador", now, jobId);
  }
  audit(adminId, `job.${action}`, "job", jobId, { anterior: job.status }, ip);
}

export function adminConfirmPayment(adminId: string, paymentId: string, ip?: string) {
  const token = config.payments.testConfirmToken;
  if (!token) throw new ApiError(503, "Confirmação de teste não configurada.", "test_token_missing");
  const payment = confirmTestPayment(paymentId, token, `admin:${adminId}`);
  audit(adminId, "payment.confirmed_test", "payment", paymentId, { amount_cents: payment.amount_cents }, ip);
  return payment;
}

export function adminCancelPayment(adminId: string, paymentId: string, ip?: string) {
  const payment = get<{ id: string; status: string }>("SELECT id,status FROM payments WHERE id=?", paymentId);
  if (!payment) throw new ApiError(404, "Pagamento não encontrado.", "not_found");
  if (payment.status === "paid") throw new ApiError(400, "Um pagamento confirmado não pode ser cancelado.", "already_paid");
  run("UPDATE payments SET status='cancelled', updated_at=? WHERE id=?", nowIso(), paymentId);
  audit(adminId, "payment.cancelled", "payment", paymentId, { anterior: payment.status }, ip);
}

export function getSettings(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const row of all<{ key: string; value_json: string }>("SELECT key,value_json FROM settings")) {
    try { out[row.key] = JSON.parse(row.value_json); } catch { /* ignorar */ }
  }
  return out;
}

export function updateSettings(adminId: string, values: Record<string, unknown>, ip?: string) {
  for (const [key, value] of Object.entries(values)) {
    run("INSERT INTO settings (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at",
      key, JSON.stringify(value), nowIso());
  }
  audit(adminId, "settings.updated", "settings", undefined, { keys: Object.keys(values) }, ip);
  return getSettings();
}

export function listPlans() {
  return all("SELECT * FROM plans ORDER BY sort_order, created_at");
}

export function savePackage(adminId: string, pack: Record<string, unknown>, ip?: string) {
  const id = String(pack.id ?? uid("pack_"));
  const now = nowIso();
  run(
    "INSERT INTO minute_packages (id,name,minutes,price_cents,currency,is_active,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) " +
    "ON CONFLICT(id) DO UPDATE SET name=excluded.name, minutes=excluded.minutes, price_cents=excluded.price_cents, currency=excluded.currency, is_active=excluded.is_active, sort_order=excluded.sort_order, updated_at=excluded.updated_at",
    id, String(pack.name ?? "Pacote"), Number(pack.minutes ?? 0), Number(pack.price_cents ?? 0),
    String(pack.currency ?? "AOA"), Number(pack.is_active ?? 1), Number(pack.sort_order ?? 0), now, now,
  );
  audit(adminId, "package.saved", "package", id, pack, ip);
  return get("SELECT * FROM minute_packages WHERE id=?", id);
}

export function savePlan(adminId: string, plan: Record<string, unknown>, ip?: string) {
  const id = String(plan.id ?? uid("plan_"));
  const now = nowIso();
  run(
    "INSERT INTO plans (id,name,description,price_cents,currency,credits,input_minutes,max_video_minutes,max_exports,watermark,recurring_credits,max_width,autofocus_level,subtitle_styles,animated_subtitles,custom_branding,multiple_users,batch_export,priority,auto_publish,is_active,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) " +
    "ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, price_cents=excluded.price_cents, currency=excluded.currency, credits=excluded.credits, input_minutes=excluded.input_minutes, max_video_minutes=excluded.max_video_minutes, max_exports=excluded.max_exports, watermark=excluded.watermark, recurring_credits=excluded.recurring_credits, max_width=excluded.max_width, autofocus_level=excluded.autofocus_level, subtitle_styles=excluded.subtitle_styles, animated_subtitles=excluded.animated_subtitles, custom_branding=excluded.custom_branding, multiple_users=excluded.multiple_users, batch_export=excluded.batch_export, priority=excluded.priority, auto_publish=excluded.auto_publish, is_active=excluded.is_active, sort_order=excluded.sort_order, updated_at=excluded.updated_at",
    id, String(plan.name ?? "Plano"), String(plan.description ?? ""), Number(plan.price_cents ?? 0),
    String(plan.currency ?? "AOA"), Number(plan.credits ?? 0), Number(plan.input_minutes ?? 0),
    Number(plan.max_video_minutes ?? 0), Number(plan.max_exports ?? 1), Number(plan.watermark ?? 0),
    Number(plan.recurring_credits ?? 0), Number(plan.max_width ?? 0),
    String(plan.autofocus_level ?? "none"), Number(plan.subtitle_styles ?? 1),
    Number(plan.animated_subtitles ?? 0), Number(plan.custom_branding ?? 0),
    Number(plan.multiple_users ?? 0), Number(plan.batch_export ?? 0), Number(plan.priority ?? 0),
    Number(plan.auto_publish ?? 0), Number(plan.is_active ?? 1), Number(plan.sort_order ?? 0), now, now,
  );
  audit(adminId, "plan.saved", "plan", id, plan, ip);
  return get("SELECT * FROM plans WHERE id=?", id);
}

import { all, get, getDb, nowIso, run, setting, uid } from "./db";
import { ApiError } from "./http";
import { creditBalance } from "./services/entitlements";

export type Plan = {
  id: string; name: string; description: string; price_cents: number; currency: string;
  input_minutes: number; max_video_minutes: number; max_exports: number; watermark: number;
  credits: number; recurring_credits: number; max_width: number;
  autofocus_level: "none" | "basic" | "tracking" | "group";
  subtitle_styles: number; animated_subtitles: number; custom_branding: number;
  multiple_users: number; batch_export: number; priority: number; auto_publish: number;
  is_active: number; sort_order: number;
};

export type Package = { id: string; name: string; minutes: number; price_cents: number; currency: string; is_active: number; sort_order: number };

export type Usage = {
  periodStart: string | null;
  periodEnd: string | null;
  plan: Plan;
  inputUsedSeconds: number;
  planAllowanceSeconds: number;
  planRemainingSeconds: number;
  purchasedSeconds: number;
  totalMinutesAvailable: number;
  exportsUsed: number;
  exportsAllowed: number;
  exportsRemaining: number;
};

export function formatKz(cents: number): string {
  const kz = (cents || 0) / 100;
  const formatted = new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 2 }).format(kz).replace(/\u00a0/g, ".");
  return `${formatted} Kz`;
}

const DEFAULT_PLANS: Plan[] = [
  { id: "plan_free", name: "GRATUITO", description: "1 corte grátis, 9:16 até 720p, marca de água.", price_cents: 0, currency: "AOA", credits: 0, input_minutes: 10, max_video_minutes: 10, max_exports: 1, watermark: 1, recurring_credits: 0, max_width: 720, autofocus_level: "none", subtitle_styles: 1, animated_subtitles: 0, custom_branding: 0, multiple_users: 0, batch_export: 0, priority: 0, auto_publish: 0, is_active: 1, sort_order: 0 },
  { id: "plan_creator", name: "CRIADOR", description: "30 cortes, vídeos até 30 min, HD e autofoco.", price_cents: 350000, currency: "AOA", credits: 0, input_minutes: 120, max_video_minutes: 30, max_exports: 30, watermark: 0, recurring_credits: 0, max_width: 1280, autofocus_level: "basic", subtitle_styles: 5, animated_subtitles: 0, custom_branding: 0, multiple_users: 0, batch_export: 0, priority: 0, auto_publish: 0, is_active: 1, sort_order: 1 },
  { id: "plan_pro", name: "PROFISSIONAL", description: "100 cortes, até 90 min, Full HD e legendas animadas.", price_cents: 750000, currency: "AOA", credits: 0, input_minutes: 400, max_video_minutes: 90, max_exports: 100, watermark: 0, recurring_credits: 0, max_width: 1920, autofocus_level: "tracking", subtitle_styles: 5, animated_subtitles: 1, custom_branding: 1, multiple_users: 0, batch_export: 0, priority: 1, auto_publish: 1, is_active: 1, sort_order: 2 },
  { id: "plan_agency", name: "AGÊNCIA", description: "300 cortes, até 3 h, marcas e exportação em lote.", price_cents: 1750000, currency: "AOA", credits: 0, input_minutes: 1200, max_video_minutes: 180, max_exports: 300, watermark: 0, recurring_credits: 0, max_width: 1920, autofocus_level: "group", subtitle_styles: 5, animated_subtitles: 1, custom_branding: 1, multiple_users: 1, batch_export: 1, priority: 2, auto_publish: 1, is_active: 1, sort_order: 3 },
];

const DEFAULT_PACKAGES: Package[] = [
  { id: "pack_60", name: "60 minutos", minutes: 60, price_cents: 200000, currency: "AOA", is_active: 1, sort_order: 1 },
  { id: "pack_150", name: "150 minutos", minutes: 150, price_cents: 450000, currency: "AOA", is_active: 1, sort_order: 2 },
  { id: "pack_300", name: "300 minutos", minutes: 300, price_cents: 800000, currency: "AOA", is_active: 1, sort_order: 3 },
  { id: "pack_600", name: "600 minutos", minutes: 600, price_cents: 1400000, currency: "AOA", is_active: 1, sort_order: 4 },
];

export function listPlans(): Plan[] {
  try {
    const rows = all<Plan>("SELECT * FROM plans WHERE is_active=1 ORDER BY sort_order");
    return rows.length ? rows : DEFAULT_PLANS;
  } catch {
    return DEFAULT_PLANS;
  }
}

export function listPackages(): Package[] {
  try {
    const rows = all<Package>("SELECT * FROM minute_packages WHERE is_active=1 ORDER BY sort_order");
    return rows.length ? rows : DEFAULT_PACKAGES;
  } catch {
    return DEFAULT_PACKAGES;
  }
}

export function getPlan(id: string): Plan | undefined {
  try {
    return get<Plan>("SELECT * FROM plans WHERE id=?", id) ?? DEFAULT_PLANS.find((p) => p.id === id);
  } catch {
    return DEFAULT_PLANS.find((p) => p.id === id);
  }
}

export function planForUser(userId: string): Plan {
  const { planId } = ensurePeriod(userId);
  return getPlan(planId) ?? getPlan("plan_free")!;
}

/** Funcionalidades controladas pelo plano — aplicadas no backend, não apenas na interface. */
export function featuresForUser(userId: string) {
  const p = planForUser(userId);
  return {
    plan: p,
    maxWidth: p.max_width || 720,
    autofocusLevel: p.autofocus_level,
    subtitleStyles: p.subtitle_styles,
    animatedSubtitles: Boolean(p.animated_subtitles),
    customBranding: Boolean(p.custom_branding),
    multipleUsers: Boolean(p.multiple_users),
    batchExport: Boolean(p.batch_export),
    priority: p.priority,
    autoPublish: Boolean(p.auto_publish),
    maxVideoMinutes: p.max_video_minutes || 10,
    watermarks: Boolean(p.watermark),
  };
}

const FORMAT_ASPECTS: Record<string, string> = {
  tiktok: "9:16", reels: "9:16", "youtube-shorts": "9:16", "facebook-reels": "9:16",
  youtube: "16:9", square: "1:1", "facebook-feed": "1:1", linkedin: "1:1",
  "instagram-feed": "4:5", portrait: "4:5",
};

export function assertFormatAllowed(userId: string, formatId: string) {
  const level = planForUser(userId).id;
  const aspect = FORMAT_ASPECTS[formatId] ?? "9:16";
  // GRATUITO: apenas vertical. CRIADOR: 9:16, 1:1, 16:9. PROFISSIONAL/AGÊNCIA: tudo.
  if (level === "plan_free" && aspect !== "9:16") {
    throw new ApiError(402, "O plano GRATUITO suporta apenas formato vertical 9:16.", "format_locked");
  }
  if (level === "plan_creator" && aspect === "4:5") {
    throw new ApiError(402, "O formato 4:5 requer o plano PROFISSIONAL ou superior.", "format_locked");
  }
}

export function assertAutofocusAllowed(userId: string, mode: string, group = false) {
  const level = featuresForUser(userId).autofocusLevel;
  const rank: Record<string, number> = { none: 0, basic: 1, tracking: 2, group: 3 };
  const need = group ? 3 : mode === "model" ? 2 : mode === "manual" ? 1 : 0;
  if ((rank[level] ?? 0) < need) {
    throw new ApiError(402, "Esta opção de autofoco requer um plano superior.", "autofocus_locked");
  }
}

export function assertBrandingAllowed(userId: string) {
  if (!featuresForUser(userId).customBranding) {
    throw new ApiError(402, "Intro/encerramento e logótipo personalizados requerem o plano PROFISSIONAL ou superior.", "branding_locked");
  }
}

function monthBounds(d = new Date()) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
  return { start, end };
}

/** Garante o período mensal corrente. Sem cobrança automática: findo o período, volta a GRATUITO. */
export function ensurePeriod(userId: string): { planId: string; periodStart: string; periodEnd: string } {
  const user = get<{ plan_id: string; plan_period_start: string | null; plan_period_end: string | null; auto_renew: number }>(
    "SELECT plan_id,plan_period_start,plan_period_end,auto_renew FROM users WHERE id=?", userId,
  );
  if (!user) throw new ApiError(404, "Utilizador não encontrado.", "not_found");
  const { start, end } = monthBounds();
  let planId = user.plan_id || "plan_free";
  const expired = !user.plan_period_start || user.plan_period_start < start;
  if (expired) {
    // Renovação de período sem débito automático.
    if (!user.auto_renew && planId !== "plan_free") planId = "plan_free";
    run("UPDATE users SET plan_id=?, plan_period_start=?, plan_period_end=?, plan_status='active', updated_at=? WHERE id=?",
      planId, start, end, nowIso(), userId);
  }
  run(
    "INSERT INTO usage_periods (id,user_id,period_start,period_end,plan_id,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,period_start) DO NOTHING",
    uid("per_"), userId, start, end, planId, nowIso(),
  );
  return { planId, periodStart: start, periodEnd: end };
}

export function usage(userId: string): Usage {
  const { planId, periodStart, periodEnd } = ensurePeriod(userId);
  const plan = getPlan(planId) ?? getPlan("plan_free")!;
  const per = get<{ input_seconds_used: number; exports_used: number }>(
    "SELECT input_seconds_used,exports_used FROM usage_periods WHERE user_id=? AND period_start=?", userId, periodStart,
  );
  const inputUsed = per?.input_seconds_used ?? 0;
  const allowance = plan.input_minutes * 60;
  const planRemaining = Math.max(0, allowance - inputUsed);
  const purchased = Number((get<{ s: number }>("SELECT COALESCE(SUM(delta_seconds),0) s FROM minute_ledger WHERE user_id=?", userId)?.s ?? 0));
  const totalAvailable = planRemaining + Math.max(0, purchased);
  const exportsAllowed = plan.max_exports + Math.max(0, creditBalance(userId));
  const exportsUsed = per?.exports_used ?? 0;
  return {
    periodStart, periodEnd, plan,
    inputUsedSeconds: inputUsed,
    planAllowanceSeconds: allowance,
    planRemainingSeconds: planRemaining,
    purchasedSeconds: Math.max(0, purchased),
    totalMinutesAvailable: Math.floor(totalAvailable / 60),
    exportsUsed,
    exportsAllowed,
    exportsRemaining: Math.max(0, exportsAllowed - exportsUsed),
  };
}

/** Consome minutos com base na duração ORIGINAL do vídeo. Plano primeiro, depois pacotes comprados. */
export function chargeInputMinutes(userId: string, seconds: number, projectId: string, title: string) {
  if (seconds <= 0) return;
  const tx = getDb().transaction(() => {
    const u = usage(userId);
    const need = Math.ceil(seconds);
    if (need > u.planRemainingSeconds + u.purchasedSeconds) {
      throw new ApiError(
        402,
        `Minutos insuficientes. Necessita de ${Math.ceil(seconds / 60)} min e tem ${u.totalMinutesAvailable} min disponíveis. Compre um pacote ou mude de plano.`,
        "insufficient_minutes",
      );
    }
    const fromPlan = Math.min(need, u.planRemainingSeconds);
    const fromPurchased = need - fromPlan;
    if (fromPlan > 0) {
      run("UPDATE usage_periods SET input_seconds_used=input_seconds_used+? WHERE user_id=? AND period_start=?", fromPlan, userId, u.periodStart);
    }
    if (fromPurchased > 0) {
      run("INSERT INTO minute_ledger (id,user_id,delta_seconds,reason,reference_id,created_at) VALUES (?,?,?,?,?,?)",
        uid("min_"), userId, -fromPurchased, "Consumo de vídeo de entrada", projectId, nowIso());
    }
    const after = usage(userId);
    run("INSERT INTO usage_events (id,user_id,project_id,kind,amount,balance_after,description,created_at) VALUES (?,?,?,'input_minutes',?,?,?,?)",
      uid("use_"), userId, projectId, need, Math.floor(after.totalMinutesAvailable * 60), `Vídeo: ${title}`, nowIso());
  });
  tx();
}

/** Reserva cortes exportados antes de os gerar — impede exportação ilimitada. */
export function reserveExports(userId: string, count: number, projectId: string) {
  const tx = getDb().transaction(() => {
    const u = usage(userId);
    const allowed = Math.min(count, u.exportsRemaining);
    if (allowed <= 0) return 0;
    run("UPDATE usage_periods SET exports_used=exports_used+? WHERE user_id=? AND period_start=?", allowed, userId, u.periodStart);
    run("INSERT INTO usage_events (id,user_id,project_id,kind,amount,balance_after,description,created_at) VALUES (?,?,?,'export_clip',?,?,?,?)",
      uid("use_"), userId, projectId, allowed, usage(userId).exportsRemaining, "Reserva de cortes exportados", nowIso());
    return allowed;
  });
  return tx();
}

export function refundExport(userId: string, projectId: string) {
  const u = usage(userId);
  run("UPDATE usage_periods SET exports_used=MAX(0,exports_used-1) WHERE user_id=? AND period_start=?", userId, u.periodStart);
  run("INSERT INTO usage_events (id,user_id,project_id,kind,amount,balance_after,description,created_at) VALUES (?,?,?,'export_clip',-1,?,?,?)",
    uid("use_"), userId, projectId, usage(userId).exportsRemaining, "Reembolso de corte falhado", nowIso());
}

export function addMinutePack(userId: string, packId: string, paymentId: string, months = 1) {
  const pack = get<Package>("SELECT * FROM minute_packages WHERE id=?", packId);
  if (!pack) throw new ApiError(404, "Pacote não encontrado.", "not_found");
  const seconds = pack.minutes * 60 * months;
  const tx = getDb().transaction(() => {
    run("INSERT INTO minute_ledger (id,user_id,delta_seconds,reason,reference_id,created_at) VALUES (?,?,?,?,?,?)",
      uid("min_"), userId, seconds, `Pacote ${pack.name}`, paymentId, nowIso());
    run("UPDATE payments SET kind='minute_pack', reference_id=?, updated_at=? WHERE id=?", packId, nowIso(), paymentId);
    run("INSERT INTO usage_events (id,user_id,kind,amount,balance_after,description,created_at) VALUES (?,?,'minute_pack',?,?,?,?)",
      uid("use_"), userId, seconds, usage(userId).purchasedSeconds, `Compra ${pack.name}`, nowIso());
  });
  tx();
}

export function activatePlan(userId: string, planId: string, paymentId: string, months = 1) {
  const plan = getPlan(planId);
  if (!plan || planId === "plan_free") throw new ApiError(400, "Plano inválido.", "invalid_plan");
  const { start } = monthBounds();
  const end = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + months, 1)).toISOString();
  const tx = getDb().transaction(() => {
    run("UPDATE users SET plan_id=?, plan_period_start=?, plan_period_end=?, plan_status='active', updated_at=? WHERE id=?",
      planId, start, end, nowIso(), userId);
    run("INSERT INTO usage_periods (id,user_id,period_start,period_end,plan_id,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,period_start) DO UPDATE SET plan_id=excluded.plan_id, period_end=excluded.period_end",
      uid("per_"), userId, start, end, planId, nowIso());
    run("UPDATE payments SET kind='plan', reference_id=?, period_months=?, updated_at=? WHERE id=?", planId, months, nowIso(), paymentId);
    run("INSERT INTO usage_events (id,user_id,kind,amount,balance_after,description,created_at) VALUES (?,?,'plan_allowance',?,?,?,?)",
      uid("use_"), userId, plan.input_minutes * 60, plan.input_minutes, `Plano ${plan.name}`, nowIso());
    if (plan.recurring_credits > 0) {
      run("INSERT INTO credit_ledger (id,user_id,delta,reason,reference_id,created_at) VALUES (?,?,?,?,?,?)",
        uid("led_"), userId, plan.recurring_credits, `Créditos do plano ${plan.name}`, paymentId, nowIso());
    }
  });
  tx();
}

export function shouldWatermark(userId: string): boolean {
  const u = usage(userId);
  return u.plan.watermark === 1;
}

export function usageHistory(userId: string, limit = 100) {
  return all("SELECT * FROM usage_events WHERE user_id=? ORDER BY created_at DESC LIMIT ?", userId, limit);
}

/** Custos medidos e tarifas configuradas pelo administrador — sem margens nem lucro fictício. */
export function recordCost(input: {
  userId?: string; projectId?: string; jobId?: string; service: string; operation: string;
  units: number; note?: string;
}) {
  const key = `cost.${input.service}.${input.operation}_cents`;
  const unitCost = setting(key, 0);
  const cost = Number(unitCost) * Number(input.units);
  run("INSERT INTO cost_records (id,user_id,project_id,job_id,service,operation,units,unit_cost_cents,cost_cents,note,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    uid("cost_"), input.userId ?? null, input.projectId ?? null, input.jobId ?? null, input.service, input.operation,
    input.units, Number(unitCost), Number(cost.toFixed(2)), input.note ?? "Tarifa configurada pelo administrador", nowIso());
  return cost;
}

export function financeOverview() {
  const sum = (sql: string, ...p: unknown[]) => Number((get<{ s: number }>(sql, ...p)?.s ?? 0));
  return {
    revenuePaidCents: sum("SELECT COALESCE(SUM(amount_cents),0) s FROM payments WHERE status='paid'"),
    revenuePendingCents: sum("SELECT COALESCE(SUM(amount_cents),0) s FROM payments WHERE status IN ('pending','processing')"),
    measuredCostCents: sum("SELECT COALESCE(SUM(cost_cents),0) s FROM cost_records"),
    byUser: all("SELECT user_id, SUM(cost_cents) cost, COUNT(*) records FROM cost_records GROUP BY user_id ORDER BY cost DESC LIMIT 100"),
    byProject: all("SELECT project_id, SUM(cost_cents) cost, COUNT(*) records FROM cost_records WHERE project_id IS NOT NULL GROUP BY project_id ORDER BY cost DESC LIMIT 100"),
    byService: all("SELECT service, operation, SUM(units) units, SUM(cost_cents) cost FROM cost_records GROUP BY service,operation ORDER BY cost DESC"),
    recentCosts: all("SELECT * FROM cost_records ORDER BY created_at DESC LIMIT 100"),
    // Não calculamos margem: receita e custo são apresentados separadamente.
  };
}

import { describe, expect, it } from "vitest";
import { get, nowIso, run, uid } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import {
  activatePlan, addMinutePack, chargeInputMinutes, formatKz, listPackages, listPlans,
  recordCost, reserveExports, shouldWatermark, usage,
} from "../src/lib/billing";
import { ApiError } from "../src/lib/http";

function makeUser(email: string) {
  const id = uid("usr_");
  const now = nowIso();
  run("INSERT INTO users (id,email,name,password_hash,created_at,updated_at) VALUES (?,?,?,?,?,?)", id, email, "Teste", hashPassword("senha12345"), now, now);
  return id;
}

describe("Planos comerciais", () => {
  it("contém os quatro planos com preços e limites exactos em Kz", () => {
    const plans = listPlans();
    const byId = Object.fromEntries(plans.map((p) => [p.id, p]));
    expect(byId.plan_free.price_cents).toBe(0);
    expect(byId.plan_free.watermark).toBe(1);
    expect(byId.plan_creator.price_cents).toBe(350000);
    expect(byId.plan_creator.max_video_minutes).toBe(30);
    expect(byId.plan_creator.max_exports).toBe(30);
    expect(byId.plan_creator.autofocus_level).toBe("basic");
    expect(byId.plan_pro.price_cents).toBe(750000);
    expect(byId.plan_pro.max_video_minutes).toBe(90);
    expect(byId.plan_pro.max_exports).toBe(100);
    expect(byId.plan_pro.animated_subtitles).toBe(1);
    expect(byId.plan_agency.price_cents).toBe(1750000);
    expect(byId.plan_agency.max_video_minutes).toBe(180);
    expect(byId.plan_agency.max_exports).toBe(300);
    expect(byId.plan_agency.multiple_users).toBe(1);
    expect(formatKz(350000)).toBe("3.500 Kz");
  });

  it("contém os pacotes de minutos com os preços definidos", () => {
    const packs = Object.fromEntries(listPackages().map((p) => [p.id, p]));
    expect(packs.pack_60.minutes).toBe(60);
    expect(packs.pack_60.price_cents).toBe(200000);
    expect(packs.pack_150.minutes).toBe(150);
    expect(packs.pack_150.price_cents).toBe(450000);
    expect(packs.pack_300.minutes).toBe(300);
    expect(packs.pack_300.price_cents).toBe(800000);
    expect(packs.pack_600.minutes).toBe(600);
    expect(packs.pack_600.price_cents).toBe(1400000);
  });
});

describe("Limites e consumo", () => {
  it("consume minutos pela duração do vídeo original e bloqueia excesso", () => {
    const u = makeUser("minutos@test.ao");
    const project = uid("prj_");
    addMinutePack(u, "pack_60", uid("pay_"));
    expect(usage(u).purchasedSeconds).toBe(3600);
    chargeInputMinutes(u, 120, project, "video.mp4");
    expect(usage(u).purchasedSeconds).toBe(3600); // 120 s consumidos da allotted do plano grátis
    expect(usage(u).totalMinutesAvailable).toBe(68); // 10 min do plano + 60 min comprados - 2 min
    expect(() => chargeInputMinutes(u, 5000, project, "outro.mp4")).toThrow(ApiError);
    expect(() => chargeInputMinutes(u, 5000, project, "outro.mp4")).toThrow(/Minutos insuficientes/);
  });

  it("adiciona minutos comprados e os consome depois do plano", () => {
    const u = makeUser("pacote@test.ao");
    addMinutePack(u, "pack_60", uid("pay_"));
    expect(usage(u).purchasedSeconds).toBe(3600);
    expect(usage(u).totalMinutesAvailable).toBe(70); // 10 min do plano grátis + 60 min comprados
    chargeInputMinutes(u, 600, uid("prj_"), "video.mp4"); // consome primeiro a allotted do plano
    expect(usage(u).purchasedSeconds).toBe(3600);
    expect(usage(u).totalMinutesAvailable).toBe(60);
    chargeInputMinutes(u, 600, uid("prj_"), "video2.mp4"); // agora consome dos minutos comprados
    expect(usage(u).purchasedSeconds).toBe(3000);
    expect(usage(u).totalMinutesAvailable).toBe(50);
  });

  it("limita exportações e impede exportações ilimitadas", () => {
    const u = makeUser("exports@test.ao");
    const project = uid("prj_");
    expect(reserveExports(u, 1, project)).toBe(1);
    expect(usage(u).exportsUsed).toBe(1);
    expect(usage(u).exportsRemaining).toBe(0);
    expect(reserveExports(u, 5, project)).toBe(0);
    expect(usage(u).exportsUsed).toBe(1);
  });

  it("aplana plano pago com marca de água desactivada e renovação mensal", () => {
    const u = makeUser("plano@test.ao");
    expect(shouldWatermark(u)).toBe(true);
    activatePlan(u, "plan_pro", uid("pay_"), 1);
    expect(shouldWatermark(u)).toBe(false);
    const s = usage(u);
    expect(s.plan.name).toBe("PROFISSIONAL");
    expect(s.plan.input_minutes).toBe(400);
    expect(s.exportsAllowed).toBeGreaterThanOrEqual(100);
    const user = get<{ plan_period_end: string }>("SELECT plan_period_end FROM users WHERE id=?", u)!;
    expect(user.plan_period_end).toBeTruthy();
  });
});

describe("Gestão financeira", () => {
  it("regista custos reais por utilizador e projecto sem inventar margens", () => {
    const u = makeUser("custo@test.ao");
    const project = uid("prj_");
    run("INSERT INTO settings (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json",
      "cost.ffmpeg.render_clip_cents", "12.5", nowIso());
    const cost = recordCost({ userId: u, projectId: project, service: "ffmpeg", operation: "render_clip", units: 2 });
    expect(cost).toBe(25);
    const row = get<{ cost_cents: number; unit_cost_cents: number }>("SELECT cost_cents,unit_cost_cents FROM cost_records WHERE user_id=?", u)!;
    expect(row.unit_cost_cents).toBe(12.5);
    expect(row.cost_cents).toBe(25);
  });
});

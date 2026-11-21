import { describe, expect, it, beforeAll } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/auth";
import { detectMoments } from "../src/lib/ai/moments";
import { buildAss, buildSrt } from "../src/lib/video/subtitles";
import { run, get, all, nowIso, uid } from "../src/lib/db";
import { chooseFreeClip, canDownload, creditBalance } from "../src/lib/services/entitlements";
import { createPayment, confirmTestPayment, handleWebhook, availableMethods } from "../src/lib/services/payments";
import { validateSourceUrl } from "../src/lib/video/url";
import { buildFilterChain } from "../src/lib/video/render";

function makeUser(email: string) {
  const id = uid("usr_");
  const now = nowIso();
  run("INSERT INTO users (id,email,name,password_hash,created_at,updated_at) VALUES (?,?,?,?,?,?)", id, email, "Teste", hashPassword("senha12345"), now, now);
  return id;
}

function makeClip(userId: string, projectId: string) {
  const id = uid("clip_");
  const now = nowIso();
  run("INSERT INTO clips (id,project_id,user_id,title,description,start_sec,end_sec,duration,format,subtitle_lang,status,storage_path,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,'ready','projects/x.mp4',?,?)",
    id, projectId, userId, "Corte", "Desc", 0, 10, 10, "reels", "pt", now, now);
  return id;
}

describe("Autenticação", () => {
  it("faz hash e verifica palavra-passe", () => {
    const hash = hashPassword("senha12345");
    expect(hash).toMatch(/^scrypt:/);
    expect(verifyPassword("senha12345", hash)).toBe(true);
    expect(verifyPassword("errada", hash)).toBe(false);
  });
});

describe("Detecção de momentos", () => {
  it("respeita fronteiras de frases e pontua frases de impacto", () => {
    const moments = detectMoments({
      duration: 60,
      segments: [
        { start: 0, end: 4, text: "Bom dia a todos." },
        { start: 4, end: 9, text: "O que ninguém lhe diz é que isto muda tudo." },
        { start: 9, end: 14, text: "Aprenda agora o segredo." },
        { start: 14, end: 18, text: "Obrigado por ver." },
      ],
      silences: [{ start: 3.8, end: 4.2 }],
      sceneChanges: [9],
      minSeconds: 6,
      maxSeconds: 25,
      maxClips: 4,
    });
    expect(moments.length).toBeGreaterThan(0);
    for (const m of moments) {
      expect(m.endSec).toBeGreaterThan(m.startSec);
      expect([4, 9, 14, 18]).toContain(Number(m.endSec.toFixed(0)));
      expect(m.score).toBeGreaterThanOrEqual(0);
      expect(m.score).toBeLessThanOrEqual(1);
      expect(m.reason.length).toBeGreaterThan(10);
    }
  });

  it("funciona sem transcrição usando apenas sinais acústicos", () => {
    const moments = detectMoments({
      duration: 40, segments: [], silences: [{ start: 9, end: 10 }, { start: 20, end: 21 }],
      sceneChanges: [15], minSeconds: 5, maxSeconds: 15,
    });
    expect(moments.length).toBeGreaterThan(0);
    expect(moments.every((m) => m.signals.some((s) => s.includes("Sem transcrição")))).toBe(true);
  });
});

describe("Legendas", () => {
  it("gera SRT sincronizado e ASS com karaoke", () => {
    const segs = [{ start: 1.5, end: 3.25, text: "Olá {mundo}" }];
    const srt = buildSrt(segs);
    expect(srt).toContain("00:00:01,500 --> 00:00:03,250");
    expect(srt).toContain("Olá (mundo)");
    const ass = buildAss(segs, { font: "Arial", fontSize: 48, primaryColor: "#FFFFFF", highlightColor: "#22D3EE", position: "bottom", bold: true, outline: 3, karaoke: true, animation: "fade" });
    expect(ass).toContain("[V4+ Styles]");
    expect(ass).toContain("{\\k");
    expect(ass).toContain("Dialogue:");
  });
});

describe("Freemium e isolamento", () => {
  it("permite um único corte gratuito por conta e isola contas", () => {
    const u1 = makeUser("u1@test.ao");
    const u2 = makeUser("u2@test.ao");
    const p1 = uid("prj_"), p2 = uid("prj_");
    const now = nowIso();
    run("INSERT INTO projects (id,user_id,title,source_type,status,storage_path,created_at,updated_at) VALUES (?,?,?,'upload','ready','projects/x.mp4',?,?)", p1, u1, "P1", now, now);
    run("INSERT INTO projects (id,user_id,title,source_type,status,storage_path,created_at,updated_at) VALUES (?,?,?,'upload','ready','projects/y.mp4',?,?)", p2, u2, "P2", now, now);
    const c1 = makeClip(u1, p1);
    const c2 = makeClip(u2, p2);
    expect(canDownload(u1, c1)).toBeNull(); // bloqueado antes da escolha
    expect(canDownload(u2, c1)).toBeNull(); // isolamento
    chooseFreeClip(u1, c1);
    expect(canDownload(u1, c1)).not.toBeNull();
    expect(() => chooseFreeClip(u1, c2)).toThrow(); // já usou o gratuito
    expect(canDownload(u2, c2)).toBeNull(); // continua bloqueado
  });
});

describe("Pagamentos em modo de teste", () => {
  it("nunca confirma sem token e confirma apenas com token do ambiente", () => {
    const u = makeUser("pay@test.ao");
    const payment = createPayment(u, "reference");
    expect(payment.mode).toBe("test");
    expect(payment.status).toBe("pending");
    expect(() => confirmTestPayment(payment.id, "token-errado")).toThrow();
    expect(get<{ status: string }>("SELECT status FROM payments WHERE id=?", payment.id)?.status).toBe("pending");
    const confirmed = confirmTestPayment(payment.id, "token-de-teste-secreto-123");
    expect(confirmed.status).toBe("paid");
    expect(creditBalance(u)).toBeGreaterThan(0);
    expect(all("SELECT 1 FROM transactions WHERE payment_id=?", payment.id).length).toBe(1);
  });

  it("webhook sem assinatura é rejeitado", () => {
    expect(() => handleWebhook("{}", null, {})).toThrow();
  });

  it("disponibiliza transferência IBAN em modo de teste com os dados configurados", () => {
    expect(availableMethods().map((m) => m.id)).toContain("transfer");
    const u = makeUser("transfer@test.ao");
    const payment = createPayment(u, "transfer");
    const meta = JSON.parse(payment.meta_json) as { iban: string; bank: string; accountName: string; mode: string };
    expect(meta.iban).toBe("0040 0000 4040 6279 1012 5");
    expect(meta.bank).toBe("BAI");
    expect(meta.accountName).toBe("Fausto Silva");
    expect(meta.mode).toContain("TESTE");
    expect(payment.status).toBe("pending");
    expect(() => confirmTestPayment(payment.id, "token-errado")).toThrow();
  });
});

describe("Enquadramento e renderização", () => {
  it("escapa vírgulas das expressões de recorte e gera cadeia válida", () => {
    const filter = buildFilterChain({ input: "in.mp4", output: "out.mp4", start: 0, end: 10, formatId: "reels" });
    expect(filter).toContain("crop=");
    expect(filter).toContain("scale=1080:1920");
    expect(filter).not.toMatch(/clip\([^)]*,(?!\\)\s*0\s*,/);
    const withFocus = buildFilterChain({
      input: "in.mp4", output: "out.mp4", start: 0, end: 10, formatId: "square",
      focus: [{ t: 0, x: 0.3, y: 0.4 }, { t: 10, x: 0.7, y: 0.6 }],
    });
    expect(withFocus).toContain("if(lte(t\\,0.00)");
    expect(withFocus).toContain("scale=1080:1080");
  });
});

describe("Validação de URL", () => {
  it("rejeita esquemas perigosos e plataformas que exigem bypass", async () => {
    await expect(validateSourceUrl("file:///etc/passwd")).rejects.toThrow();
    await expect(validateSourceUrl("http://192.168.1.1/v.mp4")).rejects.toThrow();
    await expect(validateSourceUrl("https://youtube.com/watch?v=abc")).rejects.toThrow();
  });
  it("aceita URLs directas de media públicas", async () => {
    await expect(validateSourceUrl("https://example.com/video.mp4")).resolves.toBeDefined();
  });
});

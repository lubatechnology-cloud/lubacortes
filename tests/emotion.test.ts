import { describe, expect, it } from "vitest";
import { analisarEmocao } from "../src/lib/ai/emotion";
import { buildAss, DEFAULT_SUBTITLE_STYLE } from "../src/lib/video/subtitles";

describe("Emoção", () => {
  it("deteta alegria com intensidade", () => {
    const r = analisarEmocao("Estou muito feliz, isso é incrível!");
    expect(r.categoria).toBe("alegria");
    expect(r.intensidade).toBeGreaterThan(0.3);
    expect(r.indicios.length).toBeGreaterThan(0);
  });

  it("deteta curiosidade em perguntas", () => {
    expect(analisarEmocao("Você sabe como fazer isso?").categoria).toBe("curiosidade");
  });

  it("neutro quando não há indícios", () => {
    const r = analisarEmocao("O vídeo começa aqui.");
    expect(r.categoria).toBe("neutro");
    expect(r.intensidade).toBeLessThan(0.3);
  });
});

describe("Destaque de palavra nas legendas", () => {
  it("aplica cor de destaque à palavra pedida", () => {
    const ass = buildAss(
      [{ start: 0, end: 2, text: "Este é o melhor momento" }],
      { ...DEFAULT_SUBTITLE_STYLE, karaoke: false, highlightColor: "#22D3EE", palavraDestacada: "melhor" },
      0,
    );
    expect(ass).toContain("\\c&H00EED322");
    expect(ass).toContain("melhor");
  });
});

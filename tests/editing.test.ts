import { describe, expect, it } from "vitest";
import { config } from "../src/lib/config";
import { planFocus } from "../src/lib/video/focus";
import { buildFilterChain } from "../src/lib/video/render";
import { suggestions } from "../src/lib/video/formats";

describe("Edição — enquadramento", () => {
  it("respeita o modo centro mesmo quando o modelo está configurado", async () => {
    const prev = config.autofocus.provider;
    config.autofocus.provider = "model";
    try {
      const result = await planFocus({
        video: "in.mp4", start: 0, end: 10, workDir: "tmp", mode: "center",
      });
      expect(result.provider).toBe("center");
      expect(result.samples).toHaveLength(2);
      expect(result.samples[0]).toEqual({ t: 0, x: 0.5, y: 0.5 });
    } finally {
      config.autofocus.provider = prev;
    }
  });

  it("usa foco manual com as coordenadas indicadas", async () => {
    const result = await planFocus({
      video: "in.mp4", start: 2, end: 8, workDir: "tmp", mode: "manual",
      manual: { x: 0.25, y: 0.75 },
    });
    expect(result.provider).toBe("manual");
    expect(result.samples[0]).toEqual({ t: 2, x: 0.25, y: 0.75 });
    expect(result.samples[1]).toEqual({ t: 8, x: 0.25, y: 0.75 });
  });
});

describe("Edição — qualidade por plano", () => {
  it("limita a resolução de saída ao máximo do plano", () => {
    const filter = buildFilterChain({
      input: "in.mp4", output: "out.mp4", start: 0, end: 10,
      formatId: "reels", maxWidth: 720,
    });
    expect(filter).toContain("scale=720:1280");
    expect(filter).not.toContain("scale=1080:1920");
  });
});

describe("Edição — texto de publicação", () => {
  it("gera hashtags e chamada para acção por formato", () => {
    const tiktok = suggestions("tiktok", "O maior erro dos criadores");
    expect(tiktok.title).toContain("maior erro");
    expect(tiktok.hashtags).toContain("#fyp");
    expect(tiktok.cta.length).toBeGreaterThan(5);
    const linkedin = suggestions("linkedin", "Aprenda com dados reais");
    expect(linkedin.hashtags).toContain("#carreira");
  });
});

describe("Fontes autorizadas", () => {
  it("não expõe adaptadores de bypass para plataformas protegidas", async () => {
    const { listSources } = await import("../src/lib/video/platforms");
    const ids = listSources().map((s) => s.id);
    expect(ids).toContain("direct-url");
    expect(ids).toContain("upload");
    expect(ids).not.toContain("youtube-extractor");
    expect(listSources().find((s) => s.id === "official-api")?.available).toBe(false);
  });
});

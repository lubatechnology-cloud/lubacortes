import { describe, expect, it } from "vitest";
import { buildAss, buildCues, buildSrt, DEFAULT_SUBTITLE_STYLE, STYLE_PRESETS } from "../src/lib/video/subtitles";
import type { Segment } from "../src/lib/ai/transcribe";

const segmento: Segment = {
  start: 10,
  end: 14,
  text: "Isto é um momento muito importante para percebermos o que acontece a seguir",
  words: [
    { start: 10, end: 10.4, text: "Isto" },
    { start: 10.4, end: 10.7, text: "é" },
    { start: 10.7, end: 11.2, text: "um" },
    { start: 11.2, end: 11.9, text: "momento" },
    { start: 11.9, end: 12.5, text: "muito" },
    { start: 12.5, end: 13.0, text: "importante" },
    { start: 13.0, end: 13.4, text: "para" },
    { start: 13.4, end: 14, text: "percebermos" },
  ],
};

describe("Legendas profissionais", () => {
  it("segue o estilo predefinido tipo OpusClip", () => {
    expect(DEFAULT_SUBTITLE_STYLE.fontSize).toBeGreaterThanOrEqual(60);
    expect(DEFAULT_SUBTITLE_STYLE.karaoke).toBe(true);
    expect(DEFAULT_SUBTITLE_STYLE.highlightColor).toBe("#FFE500");
    expect(DEFAULT_SUBTITLE_STYLE.outline).toBeGreaterThanOrEqual(4);
    expect(STYLE_PRESETS.opus).toBeDefined();
  });

  it("divide um segmento longo em cues curtos e sincronizados", () => {
    const cues = buildCues([segmento]);
    expect(cues.length).toBeGreaterThan(1);
    for (const c of cues) {
      expect(c.end - c.start).toBeGreaterThanOrEqual(0.4);
      expect(c.end - c.start).toBeLessThanOrEqual(3.3);
      expect(c.words.length).toBeLessThanOrEqual(9);
    }
    expect(cues[0].start).toBe(10);
  });

  it("gera ASS com karaoke real por palavra e titulo de abertura", () => {
    const ass = buildAss([segmento], { ...DEFAULT_SUBTITLE_STYLE, hookTitle: "O momento" });
    expect(ass).toContain("\\kf");
    expect(ass).toContain("&H0000E5FF"); // amarelo em ASS (BGR)
    expect(ass).toContain("Style: Titulo,");
    expect(ass).toContain("O MOMENTO");
    expect(ass).toContain("PlayResY: 1920");
  });

  it("gera SRT a partir dos cues, nao dos segmentos brutos", () => {
    const srt = buildSrt([segmento]);
    const blocos = srt.split("\n\n").filter((b) => b.includes("-->"));
    expect(blocos.length).toBeGreaterThan(1);
    expect(blocos[0]).toContain("-->");
  });
});

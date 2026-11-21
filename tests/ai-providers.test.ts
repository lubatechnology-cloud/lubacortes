import { describe, expect, it } from "vitest";
import { config } from "../src/lib/config";
import { getTranscriptionProvider } from "../src/lib/ai/transcribe";
import { getTranslationProvider } from "../src/lib/ai/translate";

describe("Adaptadores de IA", () => {
  it("selecciona Groq para transcrição e tradução quando configurado", () => {
    const prevT = config.transcription.provider;
    const prevTr = config.translation.provider;
    config.transcription.provider = "groq";
    config.translation.provider = "groq";
    try {
      expect(getTranscriptionProvider().name).toBe("groq");
      expect(getTranslationProvider().name).toBe("groq");
    } finally {
      config.transcription.provider = prevT;
      config.translation.provider = prevTr;
    }
  });

  it("selecciona provedor local sem exigir chave", () => {
    const prev = config.transcription.provider;
    config.transcription.provider = "local";
    try {
      expect(getTranscriptionProvider().name).toBe("local");
    } finally {
      config.transcription.provider = prev;
    }
  });

  it("falha de forma explícita se Groq estiver seleccionado sem chave", async () => {
    const prev = config.transcription.provider;
    const prevKey = config.transcription.groqKey;
    config.transcription.provider = "groq";
    config.transcription.groqKey = "";
    try {
      await expect(getTranscriptionProvider().transcribe("audio.wav")).rejects.toThrow(/GROQ_API_KEY/);
    } finally {
      config.transcription.provider = prev;
      config.transcription.groqKey = prevKey;
    }
  });
});

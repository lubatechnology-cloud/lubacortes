import { config } from "../config";

export type SubtitleLanguage = {
  code: string;
  label: string;
  voice: string;
};

export const SUBTITLE_LANGUAGES: SubtitleLanguage[] = [
  { code: "pt", label: "Português", voice: "Português (PT-PT)" },
  { code: "pt-AO", label: "Português de Angola", voice: "Português (Angola)" },
  { code: "en", label: "Inglês", voice: "English" },
  { code: "fr", label: "Francês", voice: "Français" },
  { code: "es", label: "Espanhol", voice: "Español" },
  { code: "it", label: "Italiano", voice: "Italiano" },
  { code: "de", label: "Alemão", voice: "Deutsch" },
  { code: "ar", label: "Árabe", voice: "العربية" },
  { code: "zh", label: "Chinês", voice: "中文" },
];

export type TranslationResult = { text: string; translated: boolean; provider: string; warning?: string };

export interface TranslationProvider {
  name: string;
  translate(text: string, target: string, source?: string): Promise<TranslationResult>;
}

class NoopTranslation implements TranslationProvider {
  name = "none";
  async translate(text: string, target: string): Promise<TranslationResult> {
    const same = target === "pt" || target === "pt-AO";
    return {
      text,
      translated: same,
      provider: this.name,
      warning: same
        ? undefined
        : `Tradução para "${target}" não configurada. O texto original foi mantido e identificado como NÃO TRADUZIDO. Configure TRANSLATION_PROVIDER=groq (gratuito), openai ou libretranslate.`,
    };
  }
}

class OpenAITranslation implements TranslationProvider {
  name = "openai";
  async translate(text: string, target: string, source?: string): Promise<TranslationResult> {
    if (!config.transcription.openaiKey) throw new Error("OPENAI_API_KEY não configurada para tradução.");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.transcription.openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "És um tradutor profissional de legendas. Traduz apenas o texto fornecido, preservando o significado, o tom e a pontuação. Responde apenas com a tradução.",
          },
          {
            role: "user",
            content: `Idioma de origem: ${source ?? "detetar automaticamente"}\nIdioma de destino: ${target}\nTexto: ${text}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`Tradução falhou (${res.status}).`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const out = data.choices?.[0]?.message?.content?.trim();
    if (!out) throw new Error("O provedor não devolveu tradução.");
    return { text: out, translated: true, provider: this.name };
  }
}

/** Groq usa o mesmo formato de chat completions da OpenAI, com modelo gratuito. */
class GroqTranslation implements TranslationProvider {
  name = "groq";
  async translate(text: string, target: string, source?: string): Promise<TranslationResult> {
    if (!config.translation.groqKey) throw new Error("GROQ_API_KEY não configurada para tradução.");
    const res = await fetch(`${config.translation.groqBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.translation.groqKey}`,
      },
      body: JSON.stringify({
        model: config.translation.groqModel,
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content:
              "És um tradutor profissional de legendas. Traduz apenas o texto fornecido, preservando o significado, o tom e a pontuação. Responde apenas com a tradução.",
          },
          {
            role: "user",
            content: `Idioma de origem: ${source ?? "detetar automaticamente"}\nIdioma de destino: ${target}\nTexto: ${text}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error(`Groq: limite gratuito de tradução atingido (429). ${body.slice(0, 160)}`);
      throw new Error(`Tradução Groq falhou (${res.status}).`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const out = data.choices?.[0]?.message?.content?.trim();
    if (!out) throw new Error("O Groq não devolveu tradução.");
    return { text: out, translated: true, provider: this.name };
  }
}

class LibreTranslate implements TranslationProvider {
  name = "libretranslate";
  async translate(text: string, target: string, source?: string): Promise<TranslationResult> {
    if (!config.translation.libretranslateUrl) throw new Error("LIBRETRANSLATE_URL não configurada.");
    const res = await fetch(`${config.translation.libretranslateUrl.replace(/\/$/, "")}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: source && source !== "auto" ? source.split("-")[0] : "auto",
        target: target.split("-")[0],
        format: "text",
        api_key: config.translation.libretranslateKey || undefined,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`LibreTranslate falhou (${res.status}).`);
    const data = (await res.json()) as { translatedText?: string };
    if (!data.translatedText) throw new Error("O provedor não devolveu tradução.");
    return { text: data.translatedText, translated: true, provider: this.name };
  }
}

export function getTranslationProvider(): TranslationProvider {
  switch (config.translation.provider) {
    case "groq":
      return new GroqTranslation();
    case "openai":
      return new OpenAITranslation();
    case "libretranslate":
      return new LibreTranslate();
    default:
      return new NoopTranslation();
  }
}

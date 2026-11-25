import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { config } from "../config";
import { probe, runFfmpeg } from "../video/ffmpeg";
import { transcreverSelfHost } from "./selfhost";

export type Word = { start: number; end: number; text: string };

export type Segment = { start: number; end: number; text: string; words?: Word[] };

export type TranscriptionResult = {
  segments: Segment[];
  language: string;
  provider: string;
  warning?: string;
};

/** Adaptador comum: trocar apenas o provedor sem alterar o motor de análise. */
export interface TranscriptionProvider {
  name: string;
  transcribe(audioPath: string): Promise<TranscriptionResult>;
}

type RemoteConfig = {
  name: "openai" | "groq";
  apiKey: string;
  model: string;
  baseUrl: string;
  label: string;
};

async function callTranscriptionApi(filePath: string, cfg: RemoteConfig) {
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(filePath)], { type: "audio/wav" }), "audio.wav");
  form.append("model", cfg.model);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append("timestamp_granularities[]", "word");
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/audio/transcriptions`;
  const request = () => fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    body: form,
    signal: AbortSignal.timeout(180_000),
  });
  let res = await request();
  if (res.status === 400) {
    // Alguns provedores aceitam só granularidade de segmento.
    form.delete("timestamp_granularities[]");
    form.append("timestamp_granularities[]", "segment");
    res = await request();
  }
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) {
      const retry = res.headers.get("retry-after");
      throw new Error(`${cfg.label}: limite gratuito atingido (429). ${retry ? `Tente novamente em ${retry}s. ` : ""}${body.slice(0, 200)}`);
    }
    throw new Error(`${cfg.label} transcrição falhou (${res.status}): ${body.slice(0, 300)}`);
  }
  return (await res.json()) as {
    language?: string;
    segments?: { start: number; end: number; text: string }[];
    words?: { start: number; end: number; text: string; word?: string }[];
    text?: string;
  };
}

function normalizeWords(raw: { start: number; end: number; text: string; word?: string }[] | undefined, offset = 0): Word[] {
  return (raw ?? [])
    .map((w) => ({
      start: Number(w.start) + offset,
      end: Number(w.end ?? w.start) + offset,
      text: String(w.word ?? w.text ?? "").trim(),
    }))
    .filter((w) => w.text.length > 0);
}

/**
 * O áudio é dividido em pedaços para respeitar o limite de upload da camada gratuita
 * (Groq: 25 MB por pedido). Os tempos são deslocados para manter a sincronização.
 */
export async function transcribeRemote(audioPath: string, cfg: RemoteConfig): Promise<TranscriptionResult> {
  const size = fs.statSync(audioPath).size;
  const maxBytes = cfg.name === "groq" ? config.transcription.groqMaxBytes : 24 * 1024 * 1024;
  const duration = await probe(audioPath).then((m) => m.duration).catch(() => 0);
  const chunk = config.transcription.chunkSeconds;

  if (size <= maxBytes || duration <= chunk || chunk <= 0) {
    const data = await callTranscriptionApi(audioPath, cfg);
    const palavras = normalizeWords(data.words);
    const segments = (data.segments ?? []).map((s) => ({
      start: Number(s.start),
      end: Number(s.end),
      text: String(s.text ?? "").trim(),
      words: palavras.length
        ? palavras.filter((w) => w.start >= Number(s.start) - 0.05 && w.start <= Number(s.end) + 0.05)
        : undefined,
    }));
    if (!segments.length && data.text) segments.push({ start: 0, end: 0, text: data.text.trim(), words: undefined });
    return { segments, language: data.language ?? "desconhecido", provider: cfg.name };
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "luba-audio-"));
  const parts: { file: string; offset: number }[] = [];
  try {
    for (let start = 0; start < duration; start += chunk) {
      const len = Math.min(chunk, duration - start);
      const file = path.join(tmp, `parte_${Math.round(start)}.wav`);
      await runFfmpeg([
        "-ss", start.toFixed(2), "-i", audioPath, "-t", len.toFixed(2),
        "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", file,
      ]);
      parts.push({ file, offset: start });
    }
    const segments: Segment[] = [];
    let language = "desconhecido";
    for (const part of parts) {
      const data = await callTranscriptionApi(part.file, cfg);
      if (data.language && language === "desconhecido") language = data.language;
      const palavras = normalizeWords(data.words, part.offset);
      for (const s of data.segments ?? []) {
        const text = String(s.text ?? "").trim();
        if (!text) continue;
        const ini = Number(s.start) + part.offset;
        const fim = Number(s.end) + part.offset;
        segments.push({
          start: ini, end: fim, text,
          words: palavras.length ? palavras.filter((w) => w.start >= ini - 0.05 && w.start <= fim + 0.05) : undefined,
        });
      }
    }
    return {
      segments,
      language,
      provider: cfg.name,
      warning: `Áudio dividido em ${parts.length} pedaços para respeitar o limite da camada gratuita; tempos reajustados.`,
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

class NoopProvider implements TranscriptionProvider {
  name = "none";
  async transcribe(): Promise<TranscriptionResult> {
    return {
      segments: [],
      language: "desconhecido",
      provider: "none",
      warning:
        "Transcrição não configurada. Defina TRANSCRIPTION_PROVIDER=groq (gratuito), local ou openai para legendas e análise semântica reais.",
    };
  }
}

class OpenAIProvider implements TranscriptionProvider {
  name = "openai" as const;
  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    if (!config.transcription.openaiKey) throw new Error("OPENAI_API_KEY não configurada.");
    return transcribeRemote(audioPath, {
      name: "openai",
      apiKey: config.transcription.openaiKey,
      model: config.transcription.openaiModel,
      baseUrl: "https://api.openai.com/v1",
      label: "OpenAI",
    });
  }
}

class GroqProvider implements TranscriptionProvider {
  name = "groq" as const;
  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    if (!config.transcription.groqKey) throw new Error("GROQ_API_KEY não configurada.");
    const result = await transcribeRemote(audioPath, {
      name: "groq",
      apiKey: config.transcription.groqKey,
      model: config.transcription.groqModel,
      baseUrl: config.transcription.groqBaseUrl,
      label: "Groq",
    });
    return {
      ...result,
      warning: (result.warning ? result.warning + " " : "") + "Transcrição Groq (camada gratuita; sujeita a limites de taxa).",
    };
  }
}

class SelfHostProvider implements TranscriptionProvider {
  name = "selfhost";
  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    return transcreverSelfHost(audioPath);
  }
}

class LocalWhisperProvider implements TranscriptionProvider {
  name = "local";
  private pipelinePromise: Promise<any> | null = null;

  private async getPipeline() {
    if (!this.pipelinePromise) {
      this.pipelinePromise = (async () => {
        const { pipeline, env } = await import("@huggingface/transformers");
        env.allowLocalModels = true;
        env.useBrowserCache = false;
        return pipeline("automatic-speech-recognition", config.transcription.localModel, {
          dtype: "q8",
          device: "cpu",
        });
      })();
    }
    return this.pipelinePromise;
  }

  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    const pipe = await this.getPipeline();
    const output = (await pipe(audioPath, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
    })) as {
      text: string;
      chunks?: { timestamp: [number | null, number | null]; text: string }[];
    };
    const chunks = (output.chunks ?? [])
      .map((c) => ({
        start: Number(c.timestamp?.[0] ?? 0),
        end: Number(c.timestamp?.[1] ?? 0),
        text: String(c.text ?? "").trim(),
      }))
      .filter((s) => s.text.length > 0);
    const segments: Segment[] = chunks.map((c) => ({
      ...c,
      words: [{ start: c.start, end: c.end, text: c.text }],
    }));
    return {
      segments,
      language: "auto",
      provider: this.name,
      warning: segments.length
        ? "Língua detectada automaticamente pelo modelo local (100% gratuito, sem API)."
        : "O modelo local não devolveu segmentos com marcações de tempo.",
    };
  }
}

export function getTranscriptionProvider(): TranscriptionProvider {
  switch (config.transcription.provider) {
    case "groq":
      return new GroqProvider();
    case "openai":
      return new OpenAIProvider();
    case "selfhost":
      return new SelfHostProvider();
    case "local":
      return new LocalWhisperProvider();
    default:
      return new NoopProvider();
  }
}

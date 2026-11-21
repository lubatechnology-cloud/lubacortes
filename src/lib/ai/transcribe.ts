import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { config } from "../config";
import { probe, runFfmpeg } from "../video/ffmpeg";

export type Segment = { start: number; end: number; text: string };

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
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    body: form,
    signal: AbortSignal.timeout(180_000),
  });
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
    text?: string;
  };
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
    const segments = (data.segments ?? []).map((s) => ({
      start: Number(s.start),
      end: Number(s.end),
      text: String(s.text ?? "").trim(),
    }));
    if (!segments.length && data.text) segments.push({ start: 0, end: 0, text: data.text.trim() });
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
      for (const s of data.segments ?? []) {
        const text = String(s.text ?? "").trim();
        if (!text) continue;
        segments.push({ start: Number(s.start) + part.offset, end: Number(s.end) + part.offset, text });
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
    const segments: Segment[] = (output.chunks ?? [])
      .map((c) => ({
        start: Number(c.timestamp?.[0] ?? 0),
        end: Number(c.timestamp?.[1] ?? 0),
        text: String(c.text ?? "").trim(),
      }))
      .filter((s) => s.text.length > 0);
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
    case "local":
      return new LocalWhisperProvider();
    default:
      return new NoopProvider();
  }
}

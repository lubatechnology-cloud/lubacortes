import fs from "node:fs";
import type { Segment, TranscriptionResult } from "./transcribe";

/** Adaptadores para inferência self-hosted (WhisperX, vLLM, DeepFace). */

export async function transcreverSelfHost(audioPath: string): Promise<TranscriptionResult> {
  const url = process.env.WHISPERX_URL;
  if (!url) throw new Error("WHISPERX_URL não configurada.");
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(audioPath)], { type: "audio/wav" }), "audio.wav");
  const res = await fetch(`${url.replace(/\/$/, "")}/transcribe`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`WhisperX self-hosted falhou (${res.status}).`);
  const data = (await res.json()) as { segments?: { start: number; end: number; text: string }[]; language?: string };
  const segments: Segment[] = (data.segments ?? []).map((s) => ({
    start: Number(s.start), end: Number(s.end), text: String(s.text ?? "").trim(),
  }));
  return { segments, language: data.language ?? "auto", provider: "selfhost" };
}

export async function traduzirSelfHost(texto: string, destino: string, origem?: string): Promise<{ text: string; translated: boolean; provider: string }> {
  const base = process.env.VLLM_BASE_URL;
  if (!base) throw new Error("VLLM_BASE_URL não configurada.");
  const res = await fetch(`${base.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.VLLM_API_KEY ? { Authorization: `Bearer ${process.env.VLLM_API_KEY}` } : {}) },
    body: JSON.stringify({
      model: process.env.VLLM_MODEL || "Qwen/Qwen2.5-14B-Instruct",
      temperature: 0.1,
      messages: [
        { role: "system", content: "Tradutor profissional. Responde apenas com a tradução." },
        { role: "user", content: `Origem: ${origem ?? "auto"}\nDestino: ${destino}\nTexto: ${texto}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`vLLM self-hosted falhou (${res.status}).`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const out = data.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error("O modelo self-hosted não devolveu tradução.");
  return { text: out, translated: true, provider: "selfhost" };
}

export async function detectarRostoSelfHost(imagemBase64: string): Promise<{ x: number; y: number } | null> {
  const url = process.env.DEEPFACE_URL;
  if (!url) return null;
  const res = await fetch(`${url.replace(/\/$/, "")}/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imagemBase64 }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { x?: number; y?: number };
  return typeof data.x === "number" && typeof data.y === "number" ? { x: data.x, y: data.y } : null;
}

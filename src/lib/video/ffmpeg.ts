import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { config } from "../config";

export function ffmpegBin(): string {
  if (config.ffmpegPath && fs.existsSync(config.ffmpegPath)) return config.ffmpegPath;
  if (!ffmpegStatic) throw new Error("FFmpeg não encontrado. Instale ffmpeg-static ou defina FFMPEG_PATH.");
  return ffmpegStatic;
}

export function ffprobeBin(): string {
  if (config.ffprobePath && fs.existsSync(config.ffprobePath)) return config.ffprobePath;
  return (ffprobeStatic as { path: string }).path;
}

export type ProbeResult = {
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
  format: string;
};

export async function probe(input: string): Promise<ProbeResult> {
  const { stdout } = await exec(ffprobeBin(), [
    "-v", "error",
    "-show_entries", "format=duration,format_name:stream=index,codec_type,width,height",
    "-of", "json",
    input,
  ]);
  const data = JSON.parse(stdout);
  const video = (data.streams ?? []).find((s: { codec_type: string }) => s.codec_type === "video");
  const audio = (data.streams ?? []).find((s: { codec_type: string }) => s.codec_type === "audio");
  return {
    duration: Number(data.format?.duration ?? 0),
    width: Number(video?.width ?? 0),
    height: Number(video?.height ?? 0),
    hasAudio: Boolean(audio),
    format: String(data.format?.format_name ?? ""),
  };
}

export type FfmpegProgress = { seconds: number; pct: number; speed: string };

/** Executa ffmpeg com progresso em tempo real via -progress pipe:1. */
export function runFfmpeg(
  args: string[],
  opts: { onProgress?: (p: FfmpegProgress) => void; totalSeconds?: number; signal?: AbortSignal } = {},
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBin(), ["-hide_banner", "-loglevel", "error", "-y", ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let lastSeconds = 0;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Tempo limite de renderização excedido."));
    }, config.renderTimeoutMs);

    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
      const text = stdout.slice(-4096);
      const timeMatch = [...text.matchAll(/out_time_ms=(\d+)/g)].pop();
      const speedMatch = [...text.matchAll(/speed=([\d.]+x)/g)].pop();
      if (timeMatch) {
        lastSeconds = Number(timeMatch[1]) / 1_000_000;
        const pct = opts.totalSeconds ? (lastSeconds / opts.totalSeconds) * 100 : 0;
        opts.onProgress?.({ seconds: lastSeconds, pct, speed: speedMatch?.[1] ?? "" });
      }
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    const onAbort = () => child.kill("SIGKILL");
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`FFmpeg falhou (código ${code}): ${stderr.slice(-1500)}`));
    });
  });
}

async function exec(bin: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`Falha ao executar ${path.basename(bin)}: ${stderr.slice(-800)}`)),
    );
  });
}

export async function extractThumbnail(input: string, output: string, atSeconds = 1) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await runFfmpeg([
    "-ss", String(Math.max(0, atSeconds)),
    "-i", input,
    "-frames:v", "1",
    "-vf", "scale='min(640,iw)':-2",
    "-q:v", "3",
    output,
  ]);
}

/** Detecta mudanças de cena devolvendo os segundos aproximados. */
export async function detectScenes(input: string): Promise<number[]> {
  const { stderr } = await exec(ffmpegBin(), [
    "-i", input,
    "-vf", "select='gt(scene,0.32)',showinfo",
    "-an", "-f", "null", "-",
  ]);
  const times: number[] = [];
  for (const m of stderr.matchAll(/pts_time:([\d.]+)/g)) {
    const t = Number(m[1]);
    if (Number.isFinite(t)) times.push(t);
  }
  return [...new Set(times)].sort((a, b) => a - b);
}

/** Detecta blocos de silêncio (usado como sinal de fronteira de frases). */
export async function detectSilences(input: string): Promise<{ start: number; end: number }[]> {
  const { stderr } = await exec(ffmpegBin(), [
    "-i", input,
    "-af", "silencedetect=noise=-34dB:d=0.35",
    "-f", "null", "-",
  ]);
  const silences: { start: number; end: number }[] = [];
  let start: number | null = null;
  for (const line of stderr.split(/\r?\n/)) {
    const s = line.match(/silence_start:\s*([\d.]+)/);
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (s) start = Number(s[1]);
    if (e && start !== null) {
      silences.push({ start, end: Number(e[1]) });
      start = null;
    }
  }
  return silences;
}

/** Concatena introdução, vídeo principal e encerramento (mesmo codec/resolução). */
export async function concatVideos(inputs: string[], output: string): Promise<void> {
  const list = path.join(path.dirname(output), `${path.basename(output, path.extname(output))}_concat.txt`);
  fs.mkdirSync(path.dirname(list), { recursive: true });
  fs.writeFileSync(list, inputs.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"), "utf8");
  try {
    await runFfmpeg(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", output]);
  } finally {
    fs.rmSync(list, { force: true });
  }
}

/** Extrai uma janela de áudio mono para transcrição local/API. */
export async function extractAudio(input: string, output: string, start: number, duration: number) {
  fs.mkdirSync(path.dirname(path.dirname(output)), { recursive: true });
  await runFfmpeg([
    "-ss", String(start),
    "-t", String(duration),
    "-i", input,
    "-vn", "-ac", "1", "-ar", "16000",
    "-c:a", "pcm_s16le",
    output,
  ]);
}

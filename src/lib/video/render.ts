import fs from "node:fs";
import path from "node:path";
import { getFormat } from "./formats";
import { runFfmpeg, type FfmpegProgress } from "./ffmpeg";
import { config } from "../config";

export type FocusSample = { t: number; x: number; y: number };

export type RenderOptions = {
  input: string;
  output: string;
  start: number;
  end: number;
  formatId: string;
  subtitlePath?: string;
  fitMode?: "cover" | "contain";
  focus?: FocusSample[];
  watermark?: boolean;
  maxWidth?: number;
  fadeEdges?: boolean;
  normalizeAudio?: boolean;
  removeSilences?: boolean;
  silencioDb?: number;
  onProgress?: (p: FfmpegProgress) => void;
};

/** Escapa caminhos de ficheiro para o filtro `subtitles` do FFmpeg (Windows inclui ':'). */
function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function ifChain(samples: FocusSample[], axis: "x" | "y", total: number): string {
  if (!samples.length) return "(iw-ow)/2";
  const pts = [...samples].sort((a, b) => a.t - b.t);
  const rel = pts.map((p) => ({ t: p.t, v: axis === "x" ? p.x : p.y }));
  let expr = `clip(${rel[rel.length - 1].v}*(iw-ow)\\,0\\,iw-ow)`;
  for (let i = rel.length - 2; i >= 0; i--) {
    expr = `if(lte(t\\,${rel[i].t.toFixed(2)})\\,clip(${rel[i].v}*(iw-ow)\\,0\\,iw-ow)\\,${expr})`;
  }
  return expr;
}

/** Gera a cadeia de filtros de enquadramento (recorte + escala + legendas queimadas). */
export function buildFilterChain(opts: RenderOptions): string {
  const fmt = getFormat(opts.formatId);
  const targetAspect = fmt.width / fmt.height;
  const factor = opts.maxWidth && opts.maxWidth < fmt.width ? opts.maxWidth / fmt.width : 1;
  const width = Math.round((fmt.width * factor) / 2) * 2;
  const height = Math.round((fmt.height * factor) / 2) * 2;
  const filters: string[] = [];

  if (opts.fitMode === "contain") {
    filters.push(
      `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
    );
  } else {
    const w = `min(iw\\,ih*${targetAspect.toFixed(6)})`;
    const h = `min(ih\\,iw/${targetAspect.toFixed(6)})`;
    const x = opts.focus?.length
      ? ifChain(opts.focus, "x", targetAspect)
      : "(iw-ow)/2";
    const y = opts.focus?.length
      ? ifChain(opts.focus, "y", targetAspect)
      : "(ih-oh)/2";
    filters.push(`crop=${w}:${h}:${x}:${y}`, `scale=${width}:${height}`);
  }

  if (opts.subtitlePath && fs.existsSync(opts.subtitlePath)) {
    filters.push(`subtitles=filename='${escapeFilterPath(opts.subtitlePath)}'`);
  }
  filters.push("setsar=1");
  if (opts.fadeEdges !== false) {
    const dur = Math.max(0.5, opts.end - opts.start);
    const fade = Math.min(0.25, dur / 8);
    filters.push(`fade=t=in:st=0:d=${fade.toFixed(2)}`, `fade=t=out:st=${(dur - fade).toFixed(2)}:d=${fade.toFixed(2)}`);
  }
  return filters.join(",");
}

export async function renderClip(opts: RenderOptions) {
  const fmt = getFormat(opts.formatId);
  fs.mkdirSync(path.dirname(opts.output), { recursive: true });
  const duration = Math.max(0.5, opts.end - opts.start);
  const filter = buildFilterChain(opts);
  const logo = path.join(config.root, "public", "logo-watermark.png");
  const comLogo = Boolean(opts.watermark && fs.existsSync(logo));
  let grafico: string[];
  let mapas: string[];
  if (comLogo) {
    const arquivo = escapeFilterPath(logo);
    const cadeia =
      `[0:v]${filter}[base];` +
      `movie='${arquivo}',scale=112:-2,format=rgba,colorchannelmixer=aa=0.58[marca];` +
      `[base][marca]overlay=x=W-w-30:y=30:format=auto[out]`;
    grafico = ["-filter_complex", cadeia];
    mapas = ["-map", "[out]", "-map", "0:a?"];
  } else {
    grafico = ["-vf", filter];
    mapas = [];
  }
  const audio: string[] = [];
  if (opts.removeSilences) {
    audio.push(`silenceremove=start_periods=1:start_duration=0.2:start_threshold=${opts.silencioDb ?? -35}dB:stop_periods=-1:stop_duration=0.3:stop_threshold=${opts.silencioDb ?? -35}dB`);
  }
  if (opts.normalizeAudio !== false) {
    audio.push("highpass=f=80", "loudnorm=I=-16:TP=-1.5:LRA=11");
  }
  await runFfmpeg(
    [
      "-ss", opts.start.toFixed(3),
      "-i", opts.input,
      "-t", duration.toFixed(3),
      ...grafico,
      ...mapas,
      ...(audio.length ? ["-af", audio.join(",")] : []),
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "20",
      "-pix_fmt", "yuv420p",
      "-profile:v", "high",
      "-level", "4.1",
      "-r", "30",
      "-c:a", "aac",
      "-b:a", "128k",
      "-ar", "48000",
      "-movflags", "+faststart",
      "-max_muxing_queue_size", "1024",
      opts.output,
    ],
    { onProgress: opts.onProgress, totalSeconds: duration },
  );
  const factor = opts.maxWidth && opts.maxWidth < fmt.width ? opts.maxWidth / fmt.width : 1;
  return {
    output: opts.output,
    width: Math.round((fmt.width * factor) / 2) * 2,
    height: Math.round((fmt.height * factor) / 2) * 2,
    filter,
  };
}

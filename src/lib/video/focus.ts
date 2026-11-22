import fs from "node:fs";
import path from "node:path";
import { config } from "../config";
import { ffmpegBin } from "./ffmpeg";
import { spawn } from "node:child_process";
import { detectarRostoSelfHost } from "../ai/selfhost";
import type { FocusSample } from "./render";

export type FocusResult = { samples: FocusSample[]; provider: string; warning?: string };

function centerSamples(start: number, end: number): FocusSample[] {
  return [
    { t: start, x: 0.5, y: 0.5 },
    { t: end, x: 0.5, y: 0.5 },
  ];
}

async function extractFrame(video: string, out: string, time: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      ffmpegBin(),
      ["-hide_banner", "-loglevel", "error", "-y", "-ss", time.toFixed(2), "-i", video, "-frames:v", "1", out],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let err = "";
    child.stderr.on("data", (d: Buffer) => (err += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-400)))));
  });
}

/**
 * AUTOFOCO — detecção de rostos/pessoas amostrada ao longo do corte.
 * O provider "model" usa um detector ONNX via Transformers.js. Se o modelo não
 * estiver disponível, falha de forma explícita e o chamador aplica o centro.
 * O foco manual (x,y) tem sempre prioridade.
 */
export async function planFocus(opts: {
  video: string;
  start: number;
  end: number;
  workDir: string;
  manual?: { x: number; y: number };
  mode?: "center" | "model" | "manual" | "selfhost";
  group?: boolean;
}): Promise<FocusResult> {
  const { start, end } = opts;
  if (opts.group) {
    // Detecção de vários participantes: enquadramento alargado, sem cortar ninguém.
    return { samples: centerSamples(start, end), provider: "group", warning: "Modo grupo: todos os participantes mantidos no enquadramento." };
  }
  const manual = opts.mode === "manual" ? opts.manual : undefined;
  const mode = opts.mode ?? config.autofocus.provider;
  if (manual) {
    const x = Math.min(1, Math.max(0, manual.x));
    const y = Math.min(1, Math.max(0, manual.y));
    return {
      samples: [
        { t: start, x, y },
        { t: end, x, y },
      ],
      provider: "manual",
    };
  }
  if (mode === "selfhost") {
    try {
      fs.mkdirSync(opts.workDir, { recursive: true });
      const frame = path.join(opts.workDir, "selfhost_frame.jpg");
      await extractFrame(opts.video, frame, (start + end) / 2);
      const ponto = await detectarRostoSelfHost(fs.readFileSync(frame).toString("base64"));
      fs.rmSync(frame, { force: true });
      if (ponto) {
        return { samples: [{ t: start, ...ponto }, { t: end, ...ponto }], provider: "selfhost" };
      }
      return { samples: centerSamples(start, end), provider: "selfhost", warning: "DeepFace não encontrou rosto; aplicado centro." };
    } catch (e) {
      return { samples: centerSamples(start, end), provider: "selfhost", warning: `DeepFace indisponível: ${(e as Error).message.slice(0, 120)}` };
    }
  }

  if (mode !== "model") {
    return { samples: centerSamples(start, end), provider: mode === "manual" ? "manual" : "center" };
  }

  try {
    const { pipeline, RawImage } = await import("@huggingface/transformers");
    const detector = await pipeline("object-detection", config.autofocus.model);
    fs.mkdirSync(opts.workDir, { recursive: true });
    const samples: FocusSample[] = [];
    const step = Math.max(0.5, config.autofocus.intervalSeconds);
    for (let t = start; t <= end; t += step) {
      const frame = path.join(opts.workDir, `frame_${Math.round(t * 100)}.jpg`);
      await extractFrame(opts.video, frame, t);
      const image = await RawImage.read(frame);
      const results = (await detector(image)) as { box: { xmin: number; ymin: number; xmax: number; ymax: number }; score: number; label: string }[];
      const faces = (Array.isArray(results) ? results : [results]).filter(
        (r) => r.score > 0.5 && /face|person/i.test(r.label ?? ""),
      );
      if (faces.length) {
        const best = faces.sort((a, b) => b.score - a.score)[0];
        samples.push({
          t,
          x: (best.box.xmin + best.box.xmax) / (2 * image.width),
          y: (best.box.ymin + best.box.ymax) / (2 * image.height),
        });
      } else {
        samples.push({ t, x: 0.5, y: 0.5 });
      }
      fs.rmSync(frame, { force: true });
    }
    if (samples.length < 2) return { samples: centerSamples(start, end), provider: "model" };
    return { samples, provider: "model" };
  } catch (err) {
    return {
      samples: centerSamples(start, end),
      provider: "center",
      warning: `AUTOFOCO indisponível: ${(err as Error).message.slice(0, 180)}. Aplicado enquadramento central.`,
    };
  }
}

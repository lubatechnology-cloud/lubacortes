import fs from "node:fs";
import path from "node:path";
import ytdlp from "youtube-dl-exec";
import { storagePath, writeStorage } from "../storage";
import { enviarRemoto } from "../storage-remote";
import { ffmpegBin } from "./ffmpeg";

export type YouTubeDownload = {
  caminhoLocal: string;
  caminhoRemoto: string;
  titulo: string;
  duracao: number;
};

const CLIENTES = [
  ["web_safari", "android"],
  ["android"],
  ["tv_embedded"],
  ["ios"],
];

function caminhoCookies(): string | null {
  const conteudo = process.env.YOUTUBE_COOKIES;
  if (!conteudo || !conteudo.includes("Netscape HTTP Cookie File")) return null;
  const rel = ".system/youtube-cookies.txt";
  writeStorage(rel, Buffer.from(conteudo, "utf8"));
  return storagePath(rel);
}

function ehErroBot(mensagem: string): boolean {
  return /bot|sign in to confirm|not a bot|captcha/i.test(mensagem);
}

/** Tenta vários clientes públicos do YouTube; usa cookies próprios apenas se fornecidos. */
async function extrair(url: string, opcoes: Record<string, unknown>) {
  const erros: string[] = [];
  const cookies = caminhoCookies();
  for (const clientes of CLIENTES) {
    try {
      return await ytdlp(url, {
        ...opcoes,
        extractorArgs: [`youtube:player_client=${clientes.join(",")}`],
        ...(cookies ? { cookies } : {}),
      });
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      erros.push(`${clientes.join("+")}: ${msg.slice(0, 200)}`);
      if (!ehErroBot(msg)) break;
    }
  }
  throw new Error(
    `O YouTube bloqueou a extração (verificação de bot). ` +
    `Tente novamente mais tarde ou configure YOUTUBE_COOKIES com os cookies da sua própria conta. ` +
    erros.slice(-2).join(" | "),
  );
}

export async function baixarYouTube(
  url: string,
  userId: string,
  projectId: string,
): Promise<YouTubeDownload> {
  const rel = `projects/${userId}/${projectId}/source.mp4`;
  const abs = storagePath(rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });

  const info = await extrair(url, {
    dumpSingleJson: true,
    noWarnings: true,
    skipDownload: true,
    noPlaylist: true,
    jsRuntimes: "node",
  }) as { title?: string; duration?: number };

  await extrair(url, {
    output: abs,
    format: "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/best[ext=mp4]/best",
    mergeOutputFormat: "mp4",
    ffmpegLocation: ffmpegBin(),
    jsRuntimes: "node",
    noPlaylist: true,
    noWarnings: true,
  });

  const finalPath = fs.existsSync(abs) ? abs : `${abs}.mp4`;
  if (!fs.existsSync(finalPath)) throw new Error("O yt-dlp não produziu um ficheiro de vídeo.");

  const caminhoRemoto = `uploads/${userId}/${projectId}/source.mp4`;
  const buffer = fs.readFileSync(finalPath);
  await enviarRemoto(caminhoRemoto, buffer, "video/mp4");
  if (finalPath !== abs) fs.renameSync(finalPath, abs);

  return {
    caminhoLocal: rel,
    caminhoRemoto,
    titulo: String(info.title ?? "Vídeo do YouTube").slice(0, 120),
    duracao: Number(info.duration ?? 0),
  };
}

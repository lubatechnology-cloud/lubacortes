import fs from "node:fs";
import path from "node:path";
import ytdlp from "youtube-dl-exec";
import { storagePath, writeStorage } from "../storage";
import { enviarRemoto } from "../storage-remote";

export type YouTubeDownload = {
  caminhoLocal: string;
  caminhoRemoto: string;
  titulo: string;
  duracao: number;
};

/** Descarga um vídeo do YouTube num formato directo (MP4) e envia para o Storage. */
export async function baixarYouTube(
  url: string,
  userId: string,
  projectId: string,
): Promise<YouTubeDownload> {
  const rel = `projects/${userId}/${projectId}/source.mp4`;
  const abs = storagePath(rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });

  const info = await ytdlp(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: false,
    skipDownload: true,
    noPlaylist: true,
  }) as { title?: string; duration?: number };

  await ytdlp(url, {
    output: abs,
    format: "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/best[ext=mp4]/best",
    mergeOutputFormat: "mp4",
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

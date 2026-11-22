import { ApiError } from "../http";

export type YouTubeInfo = {
  titulo: string;
  autor: string;
  miniatura: string;
  videoId: string;
};

function extrairId(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") return u.pathname.slice(1) || null;
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      return u.searchParams.get("v") || u.pathname.match(/\/(embed|shorts|live)\/([\w-]+)/)?.[2] || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Usa apenas o endpoint oficial oEmbed do YouTube (sem chave, sem descarga de vídeo,
 * sem extractores). Serve para identificar o vídeo e orientar o utilizador.
 */
export async function infoYouTube(raw: string): Promise<YouTubeInfo> {
  const videoId = extrairId(raw);
  if (!videoId) throw new ApiError(400, "Link do YouTube inválido.", "invalid_youtube_url");
  const canonical = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`,
    { signal: AbortSignal.timeout(15_000) },
  );
  if (!res.ok) throw new ApiError(400, "Não foi possível identificar esse vídeo do YouTube (pode ser privado ou não existir).", "youtube_not_found");
  const data = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
  return {
    titulo: data.title ?? "Vídeo do YouTube",
    autor: data.author_name ?? "Autor desconhecido",
    miniatura: data.thumbnail_url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    videoId,
  };
}

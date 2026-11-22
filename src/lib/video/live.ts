import net from "node:net";
import { ApiError } from "../http";
import { runFfmpeg } from "./ffmpeg";

/**
 * Fontes live autorizadas: HLS (.m3u8) sobre HTTP(S). Não suportamos extração
 * de páginas de plataformas protegidas — o utilizador fornece o URL do seu
 * próprio stream (MediaMTX, SRS, OBS, CDN, etc.).
 */
export function validarUrlLive(raw: string): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new ApiError(400, "URL da live inválida.", "invalid_url"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new ApiError(400, "A live deve ser HTTP(S).", "invalid_scheme");
  if (url.username || url.password) throw new ApiError(400, "URLs com credenciais não são aceites.", "invalid_url");
  const host = url.hostname.toLowerCase();
  if (net.isIP(host)) {
    const privado = host === "127.0.0.1" || host === "::1" || host.startsWith("10.") || host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    if (privado) throw new ApiError(400, "Endereços privados não são permitidos.", "private_ip");
  }
  if (!/\.m3u8(\?|$)/i.test(url.pathname)) {
    throw new ApiError(400, "Forneça um URL de live HLS (.m3u8).", "not_hls");
  }
  return url;
}

export async function verificarPlaylist(url: URL): Promise<{ variantes: number }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new ApiError(400, `A live não respondeu (${res.status}).`, "live_unavailable");
  const texto = await res.text();
  if (!texto.includes("#EXTM3U")) throw new ApiError(400, "O URL não é uma playlist HLS válida.", "not_hls");
  const variantes = (texto.match(/#EXT-X-STREAM-INF/g) ?? []).length;
  return { variantes };
}

/** Capta N segundos da live e guarda em ficheiro local com cópia de stream. */
export async function capturarLive(url: string, segundos: number, destino: string) {
  await runFfmpeg([
    "-protocol_whitelist", "file,http,https,tcp,tls,crypto",
    "-i", url,
    "-t", String(Math.max(5, Math.min(600, segundos))),
    "-c", "copy",
    "-movflags", "+faststart",
    destino,
  ], { totalSeconds: segundos });
}

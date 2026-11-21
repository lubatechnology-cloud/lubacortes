import net from "node:net";
import { config } from "../config";
import { ApiError } from "../http";

// Plataformas que exigem extracção/autenticação para obter o media directo.
// Não implementamos bypass: para estas, o utilizador deve carregar o ficheiro
// ou fornecer um URL directo de media autorizado.
const PLATFORM_DENYLIST = [
  "youtube.com", "youtu.be", "tiktok.com", "instagram.com", "facebook.com",
  "fb.com", "twitter.com", "x.com", "vimeo.com", "twitch.tv", "linkedin.com",
  "pinterest.com", "snapchat.com", "reddit.com", "dailymotion.com",
];

const DIRECT_MEDIA_RE = /\.(mp4|mov|m4v|webm|mkv|avi|mpeg|mpg|ogv)(\?|$)/i;

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127");
  }
  return true;
}

export async function validateSourceUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ApiError(400, "URL inválida.", "invalid_url");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new ApiError(400, "Apenas URLs HTTP/HTTPS são aceites.", "invalid_scheme");
  }
  if (url.username || url.password) {
    throw new ApiError(400, "URLs com credenciais não são aceites.", "invalid_url");
  }
  const host = url.hostname.toLowerCase();
  const root = host.startsWith("www.") ? host.slice(4) : host;

  if (PLATFORM_DENYLIST.some((d) => root === d || root.endsWith("." + d))) {
    throw new ApiError(
      400,
      "Esta plataforma exige extracção/autenticação. Não contornamos protecções: use o carregamento directo do ficheiro ou um URL directo de vídeo autorizado.",
      "platform_not_supported",
    );
  }

  const isLocalTestHost = ["localhost", "127.0.0.1", "::1"].includes(host);
  const allowedByConfig = config.allowedVideoHosts.includes(host);
  const isDirectMedia = DIRECT_MEDIA_RE.test(url.pathname);

  if (!isDirectMedia && !allowedByConfig && !isLocalTestHost) {
    throw new ApiError(
      400,
      "URL não autorizada. Forneça um URL directo para um ficheiro de vídeo (.mp4, .webm, .mov...).",
      "host_not_allowed",
    );
  }

  if (!isLocalTestHost && net.isIP(host) && isPrivateIp(host)) {
    throw new ApiError(400, "Endereços de rede privada não são permitidos.", "private_ip");
  }

  // Bloqueia redirecções para endereços privados — verificação no momento do download.
  return url;
}

export async function fetchToBuffer(rawUrl: string, maxBytes: number): Promise<Buffer> {
  const url = await validateSourceUrl(rawUrl);
  const chunks: Buffer[] = [];
  let total = 0;
  let current = url;
  for (let redirects = 0; redirects < 4; redirects++) {
    const res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(60_000) });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) throw new ApiError(400, "Redirecção sem destino.", "bad_redirect");
      current = await validateSourceUrl(new URL(location, current).toString());
      continue;
    }
    if (!res.ok) throw new ApiError(400, `Falha ao descarregar o vídeo (${res.status}).`, "download_failed");
    const ct = res.headers.get("content-type") ?? "";
    if (ct && !ct.startsWith("video/") && !ct.startsWith("application/octet-stream")) {
      throw new ApiError(400, "O URL não aponta para um ficheiro de vídeo.", "not_video");
    }
    const reader = res.body?.getReader();
    if (!reader) throw new ApiError(400, "Não foi possível ler o vídeo.", "read_failed");
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const buf = Buffer.from(value);
      total += buf.length;
      if (total > maxBytes) throw new ApiError(413, "O vídeo excede o tamanho máximo permitido.", "too_large");
      chunks.push(buf);
    }
    return Buffer.concat(chunks);
  }
  throw new ApiError(400, "Demasiadas redirecções.", "too_many_redirects");
}

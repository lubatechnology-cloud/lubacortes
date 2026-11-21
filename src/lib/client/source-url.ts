const PLATAFORMAS = [
  "youtube.com", "youtu.be", "tiktok.com", "instagram.com", "facebook.com",
  "fb.com", "vimeo.com", "linkedin.com", "twitch.tv", "pinterest.com", "dailymotion.com",
];

export function isPlatformPage(raw: string): boolean {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    return PLATAFORMAS.some((p) => h === p || h.endsWith("." + p));
  } catch {
    return false;
  }
}

export function isDirectVideoUrl(raw: string): boolean {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return /\.(mp4|mov|m4v|webm|mkv|avi|mpeg|mpg|ogv)$/i.test(u.pathname);
  } catch {
    return false;
  }
}

export type VideoFormat = {
  id: string;
  label: string;
  platform: string;
  width: number;
  height: number;
  aspect: string;
  description: string;
};

export const VIDEO_FORMATS: VideoFormat[] = [
  { id: "tiktok", label: "TikTok", platform: "TikTok", width: 1080, height: 1920, aspect: "9:16", description: "Vertical 1080×1920" },
  { id: "reels", label: "Instagram Reels", platform: "Instagram", width: 1080, height: 1920, aspect: "9:16", description: "Vertical 1080×1920" },
  { id: "instagram-feed", label: "Instagram Feed", platform: "Instagram", width: 1080, height: 1350, aspect: "4:5", description: "Retrato 1080×1350" },
  { id: "youtube-shorts", label: "YouTube Shorts", platform: "YouTube", width: 1080, height: 1920, aspect: "9:16", description: "Vertical 1080×1920" },
  { id: "youtube", label: "YouTube", platform: "YouTube", width: 1920, height: 1080, aspect: "16:9", description: "Horizontal 1920×1080" },
  { id: "facebook-reels", label: "Facebook Reels", platform: "Facebook", width: 1080, height: 1920, aspect: "9:16", description: "Vertical 1080×1920" },
  { id: "facebook-feed", label: "Facebook Feed", platform: "Facebook", width: 1080, height: 1080, aspect: "1:1", description: "Quadrado 1080×1080" },
  { id: "linkedin", label: "LinkedIn", platform: "LinkedIn", width: 1080, height: 1080, aspect: "1:1", description: "Quadrado 1080×1080" },
  { id: "square", label: "Quadrado 1:1", platform: "Geral", width: 1080, height: 1080, aspect: "1:1", description: "Quadrado 1080×1080" },
  { id: "portrait", label: "Retrato 4:5", platform: "Geral", width: 1080, height: 1350, aspect: "4:5", description: "Retrato 1080×1350" },
];

export function getFormat(id: string): VideoFormat {
  return VIDEO_FORMATS.find((f) => f.id === id) ?? VIDEO_FORMATS[0];
}

export function suggestions(formatId: string, title: string) {
  const fmt = getFormat(formatId);
  const clean = title.replace(/[^\p{L}\p{N}\s?!.,-]/gu, "").trim().slice(0, 90) || "Momento incrível";
  return {
    title: clean,
    description: `${clean}\n\nUm corte inteligente criado com Lubacortes, preparado para ${fmt.platform}.`,
    hashtags: ["#lubacortes", "#shorts", "#viral", ...(fmt.platform === "LinkedIn" ? ["#carreira", "#negocios"] : ["#fyp", "#tendencia"])].join(" "),
    cta: "Segue para mais conteúdos como este!",
  };
}

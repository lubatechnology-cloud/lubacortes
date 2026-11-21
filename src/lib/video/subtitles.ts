import type { Segment } from "../ai/transcribe";

export type SubtitleStyle = {
  font: string;
  fontSize: number;
  primaryColor: string; // #RRGGBB
  highlightColor: string;
  position: "bottom" | "center" | "top";
  bold: boolean;
  outline: number;
  karaoke: boolean;
  animation: "none" | "fade" | "pop";
  template?: string;
  untranslated?: boolean;
};

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  font: "Arial",
  fontSize: 48,
  primaryColor: "#FFFFFF",
  highlightColor: "#22D3EE",
  position: "bottom",
  bold: true,
  outline: 3,
  karaoke: false,
  animation: "fade",
};

function assColor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "&H00FFFFFF";
  const r = h.slice(4, 6), g = h.slice(2, 4), b = h.slice(0, 2);
  return `&H00${b.toUpperCase()}${g.toUpperCase()}${r.toUpperCase()}`;
}

function timestamp(seconds: number, milliseconds = false): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const frac = s - Math.floor(s);
  const base = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return milliseconds
    ? `${base},${String(Math.floor(frac * 1000)).padStart(3, "0")}`
    : `${base}.${String(Math.floor(frac * 100)).padStart(2, "0")}`;
}

function srtTime(seconds: number): string {
  return timestamp(seconds, true);
}

function sanitize(text: string): string {
  return text.replace(/\{/g, "(").replace(/\}/g, ")").replace(/\r?\n/g, " ").trim();
}

function wrap(text: string, max = 42): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max && line) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines.join("\\N");
}

export function buildSrt(segments: Segment[], offsetStart = 0): string {
  return segments
    .map((s, i) => {
      const start = s.start - offsetStart;
      const end = s.end > s.start ? s.end - offsetStart : start + 2;
      return `${i + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${sanitize(s.text)}\n`;
    })
    .join("\n");
}

export function buildAss(
  segments: Segment[],
  style: SubtitleStyle = DEFAULT_SUBTITLE_STYLE,
  offsetStart = 0,
): string {
  const alignment = style.position === "top" ? 8 : style.position === "center" ? 5 : 2;
  const marginV = style.position === "top" ? 40 : style.position === "center" ? 0 : 70;
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "WrapStyle: 2",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,${style.font},${style.fontSize},${assColor(style.primaryColor)},${assColor(style.highlightColor)},&H00000000,&H80000000,${style.bold ? -1 : 0},0,0,0,100,100,0,0,1,${style.outline},1,${alignment},40,40,${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ].join("\n");

  const events = segments.map((s) => {
    const start = Math.max(0, s.start - offsetStart);
    const end = s.end > s.start ? s.end - offsetStart : start + 2;
    let text = sanitize(s.text);
    if (style.karaoke) {
      const words = text.split(" ");
      const totalChars = words.join("").length || 1;
      let used = 0;
      const durationCs = Math.max(1, Math.round((end - start) * 100));
      text = words
        .map((w, i) => {
          const cs = i === words.length - 1 ? durationCs - used : Math.max(1, Math.round((w.length / totalChars) * durationCs));
          used += cs;
          return `{\\k${cs}}${w}`;
        })
        .join(" ");
    }
    const anim =
      style.animation === "fade"
        ? "{\\fad(180,140)}"
        : style.animation === "pop"
          ? "{\\t(0,160,\\fscx115\\fscy115)\\t(160,300,\\fscx100\\fscy100)}"
          : "";
    const untranslated = style.untranslated ? "{\\an8\\fs24}[NÃO TRADUZIDO]\\N" : "";
    return `Dialogue: 0,${timestamp(start)},${timestamp(end)},Default,,0,0,0,,${untranslated}${anim}${wrap(text)}`;
  });

  return [header, ...events].join("\n") + "\n";
}

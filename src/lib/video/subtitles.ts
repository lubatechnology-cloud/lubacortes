import type { Segment, Word } from "../ai/transcribe";
import { config } from "../config";

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
  palavraDestacada?: string;
  emocaoFoco?: string;
  hookTitle?: string;
};

const FONTE = config.subtitleFont;

/** Estilos prontos — o predefinido segue o acabamento usado por ferramentas profissionais. */
export const STYLE_PRESETS: Record<string, Partial<SubtitleStyle>> = {
  opus: {
    font: FONTE, fontSize: 68, primaryColor: "#FFFFFF", highlightColor: "#FFE500",
    position: "bottom", bold: true, outline: 6, karaoke: true, animation: "fade",
  },
  karaoke: {
    font: FONTE, fontSize: 72, primaryColor: "#FFFFFF", highlightColor: "#22D3EE",
    position: "bottom", bold: true, outline: 6, karaoke: true, animation: "pop",
  },
  minimo: {
    font: FONTE, fontSize: 58, primaryColor: "#FFFFFF", highlightColor: "#FFFFFF",
    position: "bottom", bold: true, outline: 4, karaoke: false, animation: "fade",
  },
  noticias: {
    font: FONTE, fontSize: 54, primaryColor: "#FFFFFF", highlightColor: "#F8FAFC",
    position: "bottom", bold: false, outline: 3, karaoke: false, animation: "none",
  },
};

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  ...(STYLE_PRESETS.opus as SubtitleStyle),
};

export type Cue = { start: number; end: number; words: Word[] };

function sanitize(text: string): string {
  return text.replace(/\{/g, "(").replace(/\}/g, ")").replace(/[ \t]+/g, " ").replace(/\r?\n/g, " ").trim();
}

/** Divide um conjunto de palavras em linhas equilibradas (máximo 2). */
function dividirLinhas(palavras: Word[]): Word[][] {
  const linhas: Word[][] = [];
  let atual: Word[] = [];
  for (const p of palavras) {
    const candidata = [...atual, p].map((w) => w.text).join(" ");
    if (atual.length && candidata.length > 19) {
      linhas.push(atual);
      atual = [p];
    } else {
      atual.push(p);
    }
  }
  if (atual.length) linhas.push(atual);
  if (linhas.length > 2) {
    // Força duas linhas equilibradas.
    const todas = linhas.flat();
    const metade = Math.ceil(todas.length / 2);
    return [todas.slice(0, metade), todas.slice(metade)];
  }
  return linhas;
}

/**
 * Converte segmentos em legendas curtas e sincronizadas por palavra.
 * Cada cue tem entre 0,7 s e 3,2 s, no máximo duas linhas e quebra em pontuação
 * ou silêncio — o mesmo princípio usado por editores profissionais.
 */
export function buildCues(segments: Segment[]): Cue[] {
  const cues: Cue[] = [];

  for (const seg of segments) {
    const texto = sanitize(seg.text ?? "");
    if (!texto) continue;
    const dur = Math.max(0.1, seg.end - seg.start);
    let palavras = (seg.words ?? []).filter((w) => w.text && w.text.trim());

    if (!palavras.length) {
      const partes = texto.split(" ").filter(Boolean);
      palavras = partes.map((p, i) => ({
        start: seg.start + (dur * i) / partes.length,
        end: seg.start + (dur * (i + 1)) / partes.length,
        text: p,
      }));
    }

    let grupo: Word[] = [];
    const fechar = () => {
      if (!grupo.length) return;
      const inicio = grupo[0].start;
      const fim = Math.max(grupo[grupo.length - 1].end, inicio + 0.7);
      cues.push({ start: inicio, end: Math.min(fim, inicio + 3.2), words: [...grupo] });
      grupo = [];
    };

    for (const p of palavras) {
      const candidato = [...grupo, p];
      const linhas = dividirLinhas(candidato);
      const duracao = p.end - candidato[0].start;
      const pausa = grupo.length ? p.start - grupo[grupo.length - 1].end : 0;
      const pontuacao = /[.!?…:,]$/.test(p.text);
      const longo = linhas.length > 2 || linhas.some((l) => l.map((w) => w.text).join(" ").length > 25);

      if (grupo.length && (longo || duracao > 3.2 || pausa > 0.45 || grupo.length >= 9 || (pontuacao && duracao > 1.2))) {
        fechar();
        grupo = [p];
      } else {
        grupo.push(p);
      }
    }
    fechar();
  }

  // Remove sobreposições e garante duração mínima.
  let anterior = 0;
  return cues.map((c) => {
    const start = Math.max(c.start, anterior);
    const end = Math.max(start + 0.4, c.end);
    anterior = end;
    return { ...c, start, end };
  });
}

function assColor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "&H00FFFFFF";
  return `&H00${h.slice(4, 6).toUpperCase()}${h.slice(2, 4).toUpperCase()}${h.slice(0, 2).toUpperCase()}`;
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

function escapar(texto: string): string {
  return sanitize(texto).replace(/\\/g, "\\\\");
}

function estiloPadrao(style: SubtitleStyle): string {
  const alinhamento = style.position === "top" ? 8 : style.position === "center" ? 5 : 2;
  const margem = style.position === "top" ? 120 : style.position === "center" ? 0 : 230;
  return `Style: Default,${style.font},${style.fontSize},${assColor(style.primaryColor)},${assColor(style.highlightColor)},&H00000000,&H90000000,${style.bold ? -1 : 0},0,0,0,100,100,0,0,1,${style.outline},2,${alinhamento},60,60,${margem},1`;
}

function estiloTitulo(style: SubtitleStyle): string {
  return `Style: Titulo,${style.font},${Math.round(style.fontSize * 0.82)},${assColor(style.highlightColor)},${assColor(style.primaryColor)},&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,${Math.max(3, style.outline - 1)},2,8,80,80,110,1`;
}

export function buildSrt(segments: Segment[], offsetStart = 0): string {
  return buildCues(segments)
    .map((c, i) => {
      const start = c.start - offsetStart;
      const end = c.end - offsetStart;
      const texto = dividirLinhas(c.words).map((l) => l.map((w) => w.text).join(" ")).join("\\N");
      return `${i + 1}\n${timestamp(start, true)} --> ${timestamp(end, true)}\n${texto}\n`;
    })
    .join("\n");
}

export function buildAss(
  segments: Segment[],
  style: SubtitleStyle = DEFAULT_SUBTITLE_STYLE,
  offsetStart = 0,
): string {
  const cabecalho = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    estiloPadrao(style),
    estiloTitulo(style),
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ].join("\n");

  const eventos: string[] = [];

  if (style.hookTitle) {
    const dur = 1.7;
    const titulo = escapar(style.hookTitle).slice(0, 90);
    eventos.push(
      `Dialogue: 1,${timestamp(0)},${timestamp(dur)},Titulo,,0,0,0,,{\\fad(180,260)}${titulo.split(" ").reduce((acc, p, i, arr) => {
        acc.push(p);
        if ((i + 1) % 4 === 0 && i < arr.length - 1) acc.push("\\N");
        return acc;
      }, [] as string[]).join(" ")}`,
    );
  }

  for (const cue of buildCues(segments)) {
    const inicio = Math.max(0, cue.start - offsetStart);
    const fim = cue.end > cue.start ? cue.end - offsetStart : inicio + 2;
    const durTotal = Math.max(0.1, cue.end - cue.start);
    const totalCs = Math.max(1, Math.round(durTotal * 100));
    const linhas = dividirLinhas(cue.words);
    const cortes = new Set<number>();
    let acumulado = 0;
    for (let i = 0; i < linhas.length - 1; i++) acumulado += linhas[i].length;
    if (linhas.length > 1) cortes.add(acumulado - 1);

    let usado = 0;
    const partes = cue.words.map((w, i) => {
      const cs = i === cue.words.length - 1
        ? Math.max(1, totalCs - usado)
        : Math.max(1, Math.round(((w.end - w.start) / durTotal) * totalCs));
      usado += cs;
      const tag = style.karaoke ? `{\\kf${cs}}` : "";
      return `${tag}${escapar(w.text)}${cortes.has(i) ? "\\N" : ""}`;
    });

    const anim = style.animation === "fade"
      ? "{\\fad(130,110)}"
      : style.animation === "pop"
        ? "{\\t(0,130,\\fscx112\\fscy112)\\t(130,270,\\fscx100\\fscy100)}"
        : "";
    const destaque = style.palavraDestacada
      ? cue.words.map((w) => new RegExp(`\\b${style.palavraDestacada}\\b`, "i").test(w.text))
      : [];
    if (style.palavraDestacada && !style.karaoke && destaque.some(Boolean)) {
      partes.forEach((p, i) => {
        if (destaque[i]) partes[i] = `{\\c${assColor(style.highlightColor)}}${p}{\\c${assColor(style.primaryColor)}}`;
      });
    }
    const naoTraduzido = style.untranslated ? "{\\an8\\fs22}[SEM TRADUÇÃO]\\N" : "";
    eventos.push(
      `Dialogue: 0,${timestamp(inicio)},${timestamp(fim)},Default,,0,0,0,,${naoTraduzido}${anim}${partes.join(" ")}`,
    );
  }

  return [cabecalho, ...eventos].join("\n") + "\n";
}

import type { Segment } from "./transcribe";
import { config } from "../config";
import { analisarEmocao } from "./emotion";

export type Moment = {
  id: string;
  startSec: number;
  endSec: number;
  title: string;
  description: string;
  reason: string;
  score: number;
  category: string;
  transcript: string;
  signals: string[];
  emocao: string;
  intensidade: number;
};

export type MomentInput = {
  duration: number;
  segments: Segment[];
  silences: { start: number; end: number }[];
  sceneChanges: number[];
  maxClips?: number;
  minSeconds?: number;
  maxSeconds?: number;
  emocoes?: { categoria: string; intensidade: number }[];
};

type Category = {
  name: string;
  label: string;
  words: RegExp;
};

const CATEGORIES: Category[] = [
  {
    name: "impacto",
    label: "Frase de impacto",
    words: /\b(important[íi]ssim[oa]|important[íi]ssimo|cr[ií]tico|essencial|nunca|jamais|primeira vez|finalmente|pare|aguente|escute|olhe aqui|revert[eu]|mudou tudo|absurdo|incr[ií]vel)\b/gi,
  },
  {
    name: "educativo",
    label: "Momento educativo",
    words: /\b(aprenda|aprender|ensino|explica[rç][aã]o|tutorial|como fazer|o segredo|t[ié]cnica|dica|passo a passo|descubra|entenda|saiba|estudei|pesquisa|estudo|cientistas?)\b/gi,
  },
  {
    name: "historia",
    label: "História interessante",
    words: /\b(hist[oó]ria|certa vez|certa manh[aã]|quando eu era|come[cç]ou|anos atr[aá]s|naquela [ée]poca|depois disso|at[ée] que|resultou|aconteceu|vivi|viveu)\b/gi,
  },
  {
    name: "humor",
    label: "Momento engraçado",
    words: /\b(engra[cç]ado|haha|riso|rir|piada|brincadeira|bobo|engra[cç]adinho|n[aã]o acreditei|zoeira)\b/gi,
  },
  {
    name: "opiniaoforte",
    label: "Opinião forte",
    words: /\b(na minha opini[aã]o|eu acredito|eu defendo|discordo|concordo plenamente|sem d[uú]vida|tenho certeza|garanto|prefiro|odeio|amo|deveria|tem que)\b/gi,
  },
  {
    name: "pergunta",
    label: "Pergunta e resposta",
    words: /\b(voc[êe]|por qu[êe]|como|quando|onde|qual|o que|ser[aá] que|j[aá] se perguntou|e se|porque|resposta)\b/gi,
  },
  {
    name: "explicacao",
    label: "Explicação importante",
    words: /\b(porque|pois|j[aá] que|isso significa|em outras palavras|ou seja|primeiro|segundo|terceiro|resumindo|em resumo|ent[aã]o|logicamente|basicamente)\b/gi,
  },
  {
    name: "emocao",
    label: "Momento emocionante",
    words: /\b(emo[cç][aã]o|emocionante|chor[ee]|l[aá]grimas|orgulho|medo|esperan[cç]a|amor|gratid[aã]o|dif[ií]cil|conseguiu|venceu|perdeu|superei)\b/gi,
  },
  {
    name: "curiosidade",
    label: "Desperta curiosidade",
    words: /\b(voc[êe] n[aã]o vai acreditar|o que acontece|adivinhe|segredo|poucas pessoas sabem|surpreende|misterioso|descubra|at[ée] hoje|ningu[ée]m sabe)\b/gi,
  },
  {
    name: "partilha",
    label: "Potencial de partilha",
    words: /\b(partilhe|compartilhe|compartilha|mande isso|envia isso|marca algu[ée]m|salva esse|guarda esse|volta aqui|se inscreva|segue)\b/gi,
  },
];

const EN_EXTRA = /\b(the moment|watch this|wait for it|here is why|the truth|nobody tells you|i discovered|this changed|insane|mind blowing)\b/gi;

function countMatches(text: string, re: RegExp): number {
  re.lastIndex = 0;
  return [...text.matchAll(re)].length;
}

function nearBoundary(t: number, points: number[], tolerance = 2.2): boolean {
  return points.some((p) => Math.abs(p - t) <= tolerance);
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function endsWithSentence(text: string): boolean {
  return /[.!?…]["')\]]?$/.test(text.trim());
}

function titleFrom(text: string): string {
  const sentences = text.split(/(?<=[.!?…])\s+/).filter((s) => s.trim().length > 0);
  const scored = sentences.map((s) => ({
    s: cleanText(s),
    score:
      CATEGORIES.reduce((acc, c) => acc + countMatches(s, c.words), 0) +
      (s.length > 25 && s.length < 160 ? 1 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  let title = scored[0]?.s ?? text;
  if (title.length > 92) title = title.slice(0, 89).replace(/\s+\S*$/, "") + "…";
  return title || "Momento de destaque";
}

/**
 * Motor de detecção de momentos.
 * Nunca corta no meio de uma frase: quando existe transcrição, as fronteiras
 * dos cortes são sempre as fronteiras dos segmentos transcritos.
 */
export function detectMoments(input: MomentInput): Moment[] {
  const duration = Math.max(1, input.duration);
  const min = input.minSeconds ?? config.ai.minClipSeconds;
  const max = input.maxSeconds ?? config.ai.maxClipSeconds;
  const maxClips = input.maxClips ?? config.ai.maxClips;
  const silences = input.silences.filter((s) => s.end > s.start);
  const sceneChanges = input.sceneChanges.filter((t) => t > 0 && t < duration);
  const boundaries = [...sceneChanges, ...silences.map((s) => (s.start + s.end) / 2)].sort((a, b) => a - b);

  type Candidate = {
    start: number;
    end: number;
    text: string;
    score: number;
    category: string;
    signals: string[];
    emocao: string;
    intensidade: number;
  };
  const candidates: Candidate[] = [];

  if (input.segments.length > 0) {
    const segs = input.segments
      .map((s) => ({ start: Math.max(0, s.start), end: Math.min(duration, s.end), text: cleanText(s.text) }))
      .filter((s) => s.end > s.start && s.text.length > 0)
      .sort((a, b) => a.start - b.start);

    // Junta segmentos muito curtos ao seguinte para não cortar frases.
    const units: { start: number; end: number; text: string }[] = [];
    for (const s of segs) {
      const last = units[units.length - 1];
      if (last && (last.end - last.start < 2.2 || !endsWithSentence(last.text)) && (s.end - last.start <= max)) {
        last.end = s.end;
        last.text = `${last.text} ${s.text}`;
      } else {
        units.push({ ...s });
      }
    }

    for (let i = 0; i < units.length; i++) {
      let text = "";
      for (let j = i; j < units.length && j < i + 40; j++) {
        const end = units[j].end;
        if (end - units[i].start > max) break;
        text = text ? `${text} ${units[j].text}` : units[j].text;
        const length = end - units[i].start;
        if (length < min) continue;

        const hits = CATEGORIES.map((c) => ({ c, n: countMatches(text, c.words) }));
        const best = hits.reduce((a, b) => (b.n > a.n ? b : a), hits[0]);
        const enHits = countMatches(text, EN_EXTRA);
        const keywordScore = best.n + enHits;
        // Mesmo sem palavras-chave, um segmento completo deve poder gerar um corte.
        // Vídeos curtos (ex.: 10 s) ficavam sem resultados sem esta inclusão.

        const signals: string[] = [];
        let score = 0.18 + Math.min(0.42, keywordScore * 0.075);
        if (best.n > 0) {
          signals.push(`Expressões de "${best.c.label.toLowerCase()}"`);
          score += 0.06;
        }
        if (enHits > 0) signals.push("Expressões de impacto em inglês");
        if (endsWithSentence(text)) {
          score += 0.07;
          signals.push("Termina em fronteira de frase");
        } else {
          score -= 0.1;
        }
        if (nearBoundary(units[i].start, boundaries)) {
          score += 0.045;
          signals.push("Início alinhado com mudança de cena/pausa");
        }
        if (nearBoundary(end, boundaries)) {
          score += 0.045;
          signals.push("Fim alinhado com mudança de cena/pausa");
        }
        if (text.includes("?")) {
          score += 0.04;
          signals.push("Contém pergunta");
        }
        const words = text.split(/\s+/).length;
        const wps = words / length;
        if (wps >= 1.6 && wps <= 4.2) {
          score += 0.05;
          signals.push("Ritmo de fala envolvente");
        }
        const rel = units[i].start / duration;
        if (rel < 0.18) {
          score += 0.025;
          signals.push("Localizado no gancho inicial");
        } else if (rel > 0.88) {
          score += 0.02;
          signals.push("Localizado na conclusão");
        }
        if (length > max * 0.92) score -= 0.03;

        const emocao = analisarEmocao(text);
        if (emocao.intensidade > 0.3) {
          score += 0.04 + emocao.intensidade * 0.08;
          signals.push(`Emoção ${emocao.categoria} (${Math.round(emocao.intensidade * 100)}%)`);
        }

        candidates.push({
          start: units[i].start,
          end,
          text,
          score: Math.max(0, Math.min(1, score)),
          category: best.n > 0 ? best.c.name : enHits > 0 ? "impacto" : "geral",
          signals,
          emocao: emocao.categoria,
          intensidade: emocao.intensidade,
        });
      }
    }
  } else {
    // Sem transcrição: usamos apenas sinais acústicos/visuais. Sem pontuação semântica.
    const marks = [0, ...boundaries, duration].sort((a, b) => a - b);
    for (let i = 0; i < marks.length - 1; i++) {
      const start = marks[i];
      for (let j = i + 1; j < marks.length; j++) {
        const end = marks[j];
        const length = end - start;
        if (length < min) continue;
        if (length > max) break;
        const hasSilenceStart = nearBoundary(start, silences.map((s) => s.start));
        const hasScene = nearBoundary(start, sceneChanges) || nearBoundary(end, sceneChanges);
        const score = 0.2 + (hasSilenceStart ? 0.06 : 0) + (hasScene ? 0.08 : 0);
        candidates.push({
          start,
          end,
          text: "",
          score,
          category: "geral",
          signals: [
            hasSilenceStart ? "Início após pausa detetada" : "Segmento de áudio contínuo",
            hasScene ? "Mudança de cena nas proximidades" : "Sem mudança de cena detetada",
            "Sem transcrição disponível — pontuação apenas acústica",
          ],
          emocao: "neutro",
          intensidade: 0,
        });
      }
    }
  }

  // Remove sobreposições: prioriza maior pontuação, exige menos de 35% de sobreposição.
  candidates.sort((a, b) => b.score - a.score || a.start - b.start);
  const chosen: Candidate[] = [];
  for (const c of candidates) {
    if (chosen.length >= maxClips) break;
    const overlap = chosen.some((x) => {
      const inter = Math.max(0, Math.min(x.end, c.end) - Math.max(x.start, c.start));
      return inter / Math.max(1, Math.min(x.end - x.start, c.end - c.start)) > 0.35;
    });
    if (!overlap) chosen.push(c);
  }
  chosen.sort((a, b) => a.start - b.start);

  return chosen.map((c, idx) => {
    const categoryLabel = CATEGORIES.find((x) => x.name === c.category)?.label ?? "Momento de destaque";
    const transcript = cleanText(c.text);
    return {
      id: `mom_${idx + 1}_${Math.round(c.start)}`,
      startSec: Number(c.start.toFixed(2)),
      endSec: Number(c.end.toFixed(2)),
      title: transcript ? titleFrom(transcript) : `${categoryLabel} — ${fmt(c.start)}`,
      description: transcript
        ? transcript.length > 220
          ? transcript.slice(0, 217).replace(/\s+\S*$/, "") + "…"
          : transcript
        : "Momento seleccionado com base em pausas e mudanças de cena. Active um provedor de transcrição para obter uma descrição semântica.",
      reason: `Seleccionado por: ${c.signals.join("; ")}. Pontuação de relevância ${(c.score * 100).toFixed(0)}%.`,
      score: Number(c.score.toFixed(3)),
      category: c.category,
      transcript,
      signals: c.signals,
      emocao: c.emocao,
      intensidade: c.intensidade,
    } satisfies Moment;
  });
}

export function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

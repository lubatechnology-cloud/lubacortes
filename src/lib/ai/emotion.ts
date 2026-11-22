/**
 * Pontuação emocional open-source, sem chave nem API: léxico bilingue (PT/EN)
 * combinado com sinais de pontuação. Pode ser reforçada depois por modelos
 * wav2vec2/DeepFace no worker, sem alterar esta interface.
 */
export type Emocao = {
  categoria: "alegria" | "tristeza" | "raiva" | "surpresa" | "medo" | "curiosidade" | "inspiracao" | "neutro";
  intensidade: number; // 0..1
  indicios: string[];
};

const LEXICO: Record<Exclude<Emocao["categoria"], "neutro">, string[]> = {
  alegria: ["feliz", "alegre", "riso", "rindo", "sorriso", "incrível", "maravilhoso", "excelente", "happy", "joy", "love", "amazing", "wonderful"],
  tristeza: ["triste", "saudade", "chorar", "perda", "difícil", "sofrimento", "sad", "cry", "loss", "pain", "hard"],
  raiva: ["raiva", "irritado", "injusto", "absurdo", "nunca mais", "indignado", "angry", "furious", "unfair", "outrageous"],
  surpresa: ["uau", "nossa", "impressionante", "surpresa", "não acreditei", "wow", "amazing", "unexpected", "shocking"],
  medo: ["medo", "preocupado", "risco", "perigo", "ansioso", "afraid", "fear", "risk", "danger", "worried"],
  curiosidade: ["por que", "como", "será que", "descubra", "segredo", "adivinhe", "why", "how", "secret", "discover", "what if"],
  inspiracao: ["consegui", "venci", "superei", "esperança", "comecei", "mudou minha vida", "achieved", "overcame", "hope", "inspired", "started"],
};

export function analisarEmocao(texto: string): Emocao {
  const t = texto.toLowerCase();
  let melhor: Emocao["categoria"] = "neutro";
  let maior = 0;
  const indicios: string[] = [];
  for (const [categoria, palavras] of Object.entries(LEXICO) as [Exclude<Emocao["categoria"], "neutro">, string[]][]) {
    let n = 0;
    for (const p of palavras) if (t.includes(p)) { n++; if (indicios.length < 6) indicios.push(p); }
    if (n > maior) { maior = n; melhor = categoria; }
  }
  const exclama = (texto.match(/[!?]/g) ?? []).length;
  const intensidade = Math.min(1, 0.15 + maior * 0.22 + Math.min(0.25, exclama * 0.06));
  return { categoria: melhor, intensidade: Number(intensidade.toFixed(2)), indicios };
}

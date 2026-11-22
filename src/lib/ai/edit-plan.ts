import { z } from "zod";
import { config } from "../config";

/** Operações que o assistente pode executar com as ferramentas já implementadas. */
export const EditOperation = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_format"), formato: z.enum(["9:16", "1:1", "16:9", "4:5"]) }),
  z.object({ op: z.literal("set_quality"), largura: z.number().int().min(480).max(1920) }),
  z.object({ op: z.literal("set_subtitle_language"), idioma: z.string().min(2).max(10) }),
  z.object({ op: z.literal("set_subtitle_style"), estilo: z.object({
    fonte: z.string().max(60).optional(), tamanho: z.number().int().min(12).max(120).optional(),
    cor: z.string().max(10).optional(), destaque: z.string().max(10).optional(),
    posicao: z.enum(["inferior", "centro", "superior"]).optional(),
    negrito: z.boolean().optional(), karaoke: z.boolean().optional(),
    animacao: z.enum(["nenhuma", "fade", "pop"]).optional(),
  }) }),
  z.object({ op: z.literal("set_focus"), modo: z.enum(["centro", "manual", "rostos", "grupo"]), x: z.number().min(0).max(1).optional(), y: z.number().min(0).max(1).optional() }),
  z.object({ op: z.literal("set_title"), titulo: z.string().min(1).max(200) }),
  z.object({ op: z.literal("set_caption"), indice: z.number().int().min(0), texto: z.string().min(1).max(500) }),
  z.object({ op: z.literal("trim"), inicio: z.number().min(0), fim: z.number().min(0) }),
  z.object({ op: z.literal("manter_emocao"), emocao: z.enum(["alegria","tristeza","raiva","surpresa","medo","curiosidade","inspiracao"]) }),
  z.object({ op: z.literal("remover_silencios"), limite_db: z.number().min(-60).max(0).optional() }),
  z.object({ op: z.literal("destacar_palavra"), palavra: z.string().min(1).max(60), indice: z.number().int().min(0).optional() }),
]);

export type EditOperationType = z.infer<typeof EditOperation>;
export type EditPlan = { operacoes: EditOperationType[]; explicacao: string };

const SYSTEM = `És um assistente de edição de vídeo da Lubacortes. Recebes um pedido em linguagem natural e deves devolver APENAS JSON válido com este formato:
{"explicacao":" texto curto em Português de Angola ", "operacoes":[ ... ]}

Operações permitidas (usa exatamente estes nomes e campos):
- set_format: {"op":"set_format","formato":"9:16"|"1:1"|"16:9"|"4:5"}
- set_quality: {"op":"set_quality","largura":720|1080|1440|1920}
- set_subtitle_language: {"op":"set_subtitle_language","idioma":"pt"|"pt-AO"|"en"|"fr"|"es"|"it"|"de"|"ar"|"zh"}
- set_subtitle_style: {"op":"set_subtitle_style","estilo":{...}} com campos opcionais: fonte, tamanho, cor (#RRGGBB), destaque (#RRGGBB), posicao (inferior|centro|superior), negrito, karaoke, animacao (nenhuma|fade|pop)
- set_focus: {"op":"set_focus","modo":"centro"|"manual"|"rostos"|"grupo","x":0-1,"y":0-1}
- set_title: {"op":"set_title","titulo":"..."}
- set_caption: {"op":"set_caption","indice":0,"texto":"..."}
- trim: {"op":"trim","inicio":segundos,"fim":segundos}
- manter_emocao: {"op":"manter_emocao","emocao":"alegria"|"tristeza"|"raiva"|"surpresa"|"medo"|"curiosidade"|"inspiracao"} (realça legendas com essa emoção)
- remover_silencios: {"op":"remover_silencios","limite_db":-35} (remove pausas longas na renderização)
- destacar_palavra: {"op":"destacar_palavra","palavra":"...","indice":0} (destaca a palavra na legenda)

Regras: responde SÓ com JSON. Não uses outras operações. Não inventes valores para campos que o utilizador não pediu. Se o pedido não for possible com estas operações, devolve operacoes vazias e explica o motivo em Português de Angola.`;

export async function planEdits(instruction: string, contexto: Record<string, unknown>): Promise<EditPlan> {
  if (!config.translation.groqKey) throw new Error("GROQ_API_KEY não configurada.");
  const res = await fetch(`${config.translation.groqBaseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.translation.groqKey}`,
    },
    body: JSON.stringify({
      model: config.translation.groqModel,
      temperature: 0.1,
      max_tokens: 800,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Contexto do corte: ${JSON.stringify(contexto)}\nPedido: ${instruction}` },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Assistente IA falhou (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content ?? "";
  const json = raw.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("O assistente não devolveu um plano válido.");
  const parsed = JSON.parse(json) as { explicacao?: string; operacoes?: unknown[] };
  const operacoes = z.array(EditOperation).parse(parsed.operacoes ?? []);
  return { explicacao: parsed.explicacao ?? "Plano gerado.", operacoes };
}

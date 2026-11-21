/**
 * Fontes de vídeo suportadas — APENAS canais autorizados.
 *
 * Não existe, nem existirá, código para extrair media de plataformas que exigem
 * autenticação, extractores privados ou contorno de protecções. Para YouTube,
 * TikTok, Instagram e semelhantes o utilizador deve:
 *   1. carregar o ficheiro directamente, ou
 *   2. fornecer um URL directo de media ao qual tenha direito de acesso.
 *
 * Este registo permite acrescentar integrações OFICIAIS no futuro (APIs com
 * credenciais fornecidas) sem alterar o fluxo de importação.
 */
export type SourceAdapter = {
  id: string;
  label: string;
  mode: "direct-url" | "upload" | "official-api";
  available: boolean;
  note: string;
};

export const SOURCES: SourceAdapter[] = [
  {
    id: "direct-url",
    label: "URL directo de vídeo (.mp4, .webm, .mov…)",
    mode: "direct-url",
    available: true,
    note: "Aceite quando o utilizador tem direito de acesso ao ficheiro. Validado contra SSRF.",
  },
  {
    id: "upload",
    label: "Carregamento de ficheiro",
    mode: "upload",
    available: true,
    note: "Funciona para qualquer vídeo que o utilizador possua ou tenha licença para processar.",
  },
  {
    id: "official-api",
    label: "Integrações oficiais (futuras)",
    mode: "official-api",
    available: false,
    note: "Requer credenciais e autorização oficial da plataforma. Não implementamos bypass.",
  },
];

export function listSources() {
  return SOURCES;
}

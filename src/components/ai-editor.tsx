"use client";

import { useState } from "react";
import { post } from "@/lib/client/api";
import { Alert, Spinner } from "@/components/ui";
import { Sparkles, Send, CheckCircle2, Wand2 } from "lucide-react";

type Operacao = { op: string; [key: string]: unknown };
type Plano = { explicacao: string; operacoes: Operacao[] };
type Mensagem = { papel: "utilizador" | "assistente"; texto: string; plano?: Plano };

const SUGESTOES = [
  "Deixa o corte vertical 9:16 em 1080p",
  "Aumenta as legendas e põe karaoke",
  "Foca no rosto de quem fala",
  "Muda as legendas para inglês",
];

export function AiEditor({ clipId, clips, onApplied }: { clipId: string; clips: { id: string; title: string }[]; onApplied: () => void }) {
  const [selecionado, setSelecionado] = useState(clipId || clips[0]?.id || "");
  const [input, setInput] = useState("");
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    { papel: "assistente", texto: "Olá! Sou o assistente de edição. Diga o que quer alterar no corte e eu preparo as operações com as ferramentas open-source da plataforma." },
  ]);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [aplicado, setAplicado] = useState("");

  async function enviar(texto: string) {
    if (!texto.trim() || !selecionado) return;
    setBusy(true); setErro(""); setAplicado("");
    setMensagens((m) => [...m, { papel: "utilizador", texto }]);
    setInput("");
    try {
      const plano = await post<Plano>("/api/editor/plan", { clipId: selecionado, instrucao: texto });
      setMensagens((m) => [...m, { papel: "assistente", texto: plano.explicacao, plano }]);
    } catch (e) {
      setErro((e as Error).message);
    } finally { setBusy(false); }
  }

  async function aplicar(plano: Plano) {
    setBusy(true); setErro(""); setAplicado("");
    try {
      const r = await post<{ aplicadas: number; aviso: string }>("/api/editor/apply", { clipId: selecionado, operacoes: plano.operacoes });
      setAplicado(`${r.aplicadas} operação(ões) aplicadas. ${r.aviso}`);
      onApplied();
    } catch (e) { setErro((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white"><Sparkles size={19} /></span>
        <div>
          <h2 className="text-lg font-bold">Edição com IA</h2>
          <p className="text-xs muted">Linguagem natural → operações executadas com FFmpeg, Whisper e detecção de rostos.</p>
        </div>
        <select className="input ml-auto max-w-[260px] !py-2 !text-xs" value={selecionado} onChange={(e) => setSelecionado(e.target.value)}>
          {clips.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {erro && <div className="mb-3"><Alert tone="error">{erro}</Alert></div>}
      {aplicado && <div className="mb-3"><Alert tone="success">{aplicado}</Alert></div>}

      <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
        {mensagens.map((m, i) => (
          <div key={i} className={`flex ${m.papel === "utilizador" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${m.papel === "utilizador" ? "bg-blue-600 text-white" : "card"}`}>
              <p>{m.texto}</p>
              {m.plano && (
                <div className="mt-3 space-y-2">
                  {m.plano.operacoes.length === 0 ? (
                    <p className="text-xs muted">Nenhuma operação aplicável.</p>
                  ) : (
                    <>
                      {m.plano.operacoes.map((op, j) => (
                        <div key={j} className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-2 py-1.5 text-xs">
                          <Wand2 size={12} className="text-blue-500" />
                          <span className="font-mono">{op.op}</span>
                          <span className="muted">{JSON.stringify(op).slice(0, 90)}</span>
                        </div>
                      ))}
                      <button className="btn-primary w-full !py-2 !text-xs" onClick={() => aplicar(m.plano!)} disabled={busy}>
                        {busy ? <Spinner /> : <CheckCircle2 size={14} />} Aplicar alterações
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGESTOES.map((s) => (
          <button key={s} className="btn-ghost !px-2 !py-1 !text-[11px]" onClick={() => enviar(s)} disabled={busy}>{s}</button>
        ))}
      </div>

      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); enviar(input); }}>
        <input className="input !py-2 !text-sm" placeholder="Ex.: deixa as legendas amarelas e o corte 1:1" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn-primary !px-4" disabled={busy || !input.trim()}><Send size={15} /> Enviar</button>
      </form>
      <p className="mt-2 text-[11px] muted">O assistente usa o Groq (camada gratuita) para interpretar o pedido; a execução é feita localmente por ferramentas open-source.</p>
    </div>
  );
}

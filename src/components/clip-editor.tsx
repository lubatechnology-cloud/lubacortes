"use client";

import { useEffect, useState } from "react";
import { api, patch, post } from "@/lib/client/api";
import { Alert, Spinner } from "@/components/ui";
import { X, Save, RefreshCw, Copy, Captions, Focus } from "lucide-react";

type Segment = { idx: number; start_sec: number; end_sec: number; source_text: string; display_text: string };
type ClipData = {
  id: string; title: string; description: string; hashtags: string; cta: string;
  format: string; subtitleLang: string; status: string;
  style: Record<string, unknown>;
  focus: { x: number; y: number } | null;
};
type Data = { clip: ClipData; segments: Segment[] };

export function ClipEditor({ clipId, onClose, onSaved }: { clipId: string; onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState<Record<string, any>>({});
  const [focus, setFocus] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api<Data>(`/api/clips/${clipId}/subtitles`)
      .then((d) => {
        setData(d); setSegments(d.segments); setTitle(d.clip.title);
        setDescription(d.clip.description); setStyle(d.clip.style); setFocus(d.clip.focus);
      })
      .catch((e) => setError((e as Error).message));
  }, [clipId]);

  async function save(regenerate: boolean) {
    setBusy(true); setError(""); setMsg("");
    try {
      await patch(`/api/clips/${clipId}/subtitles`, {
        segments: segments.map((s) => ({ start: s.start_sec, end: s.end_sec, text: s.display_text })),
        style, focus, title, description,
      });
      if (regenerate) {
        await post(`/api/clips/${clipId}/rerender`);
        setMsg("Alterações guardadas. O corte está a ser regenerado com as novas legendas e enquadramento.");
      } else {
        setMsg("Alterações guardadas. Clique em 'Guardar e regenerar' para aplicar ao vídeo.");
      }
      onSaved();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (!data) return <div className="grid min-h-[300px] place-items-center"><Spinner size={26} /></div>;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose}>
      <div className="card my-4 w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-extrabold">Editar corte</h2>
            <p className="text-xs muted">Legendas, estilo, enquadramento e texto de publicação.</p>
          </div>
          <button onClick={onClose} className="btn-ghost !p-2"><X size={17} /></button>
        </div>
        {error && <div className="mb-3"><Alert tone="error">{error}</Alert></div>}
        {msg && <div className="mb-3"><Alert tone="success">{msg}</Alert></div>}

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Título</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label className="label">Descrição</label><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold"><Copy size={13} /> Hashtags</p>
              <p className="break-words text-xs muted">{data.clip.hashtags || "—"}</p>
              <button className="btn-ghost mt-2 !px-2 !py-1 !text-[10px]" onClick={() => navigator.clipboard?.writeText(data.clip.hashtags)}>Copiar</button>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold"><Copy size={13} /> Chamada para acção</p>
              <p className="text-xs muted">{data.clip.cta || "—"}</p>
              <button className="btn-ghost mt-2 !px-2 !py-1 !text-[10px]" onClick={() => navigator.clipboard?.writeText(data.clip.cta)}>Copiar</button>
            </div>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><Captions size={15} /> Legendas sincronizadas</h3>
            {segments.length === 0 ? (
              <p className="text-xs muted">Sem segmentos transcritos para este corte. Active um provedor de transcrição para os gerar.</p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {segments.map((s, i) => (
                  <div key={s.idx} className="rounded-xl border p-2" style={{ borderColor: "var(--border)" }}>
                    <p className="mb-1 text-[10px] muted">{s.start_sec.toFixed(1)}s – {s.end_sec.toFixed(1)}s {s.source_text && s.source_text !== s.display_text ? "· traduzido" : ""}</p>
                    <textarea
                      className="input min-h-[52px] !py-2 !text-xs"
                      value={s.display_text}
                      onChange={(e) => setSegments((prev) => prev.map((x, j) => (j === i ? { ...x, display_text: e.target.value } : x)))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label">Fonte</label><input className="input !py-2 !text-xs" value={style.font ?? "Arial"} onChange={(e) => setStyle({ ...style, font: e.target.value })} /></div>
            <div><label className="label">Tamanho</label><input className="input !py-2 !text-xs" type="number" min={12} max={120} value={style.fontSize ?? 48} onChange={(e) => setStyle({ ...style, fontSize: Number(e.target.value) })} /></div>
            <div>
              <label className="label">Posição</label>
              <select className="input !py-2 !text-xs" value={style.position ?? "bottom"} onChange={(e) => setStyle({ ...style, position: e.target.value })}>
                <option value="bottom">Inferior</option><option value="center">Centro</option><option value="top">Superior</option>
              </select>
            </div>
            <div><label className="label">Cor principal</label><input className="input !h-10 !p-1" type="color" value={style.primaryColor ?? "#FFFFFF"} onChange={(e) => setStyle({ ...style, primaryColor: e.target.value })} /></div>
            <div><label className="label">Cor destaque</label><input className="input !h-10 !p-1" type="color" value={style.highlightColor ?? "#22D3EE"} onChange={(e) => setStyle({ ...style, highlightColor: e.target.value })} /></div>
            <div>
              <label className="label">Animação</label>
              <select className="input !py-2 !text-xs" value={style.animation ?? "fade"} onChange={(e) => setStyle({ ...style, animation: e.target.value })}>
                <option value="none">Nenhuma</option><option value="fade">Fade</option><option value="pop">Pop</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-blue-500" checked={Boolean(style.bold)} onChange={(e) => setStyle({ ...style, bold: e.target.checked })} /> Negrito</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-blue-500" checked={Boolean(style.karaoke)} onChange={(e) => setStyle({ ...style, karaoke: e.target.checked })} /> Karaoke</label>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Focus size={15} /> Enquadramento</h3>
            <div className="flex flex-wrap gap-3">
              <select className="input max-w-[220px] !py-2 !text-xs" value={String(style.autofocusMode ?? "center")}
                onChange={(e) => setStyle({ ...style, autofocusMode: e.target.value })}>
                <option value="center">Centro</option>
                <option value="model">Detecção de rostos</option>
                <option value="manual">Foco manual</option>
              </select>
              {style.autofocusMode === "manual" && (
                <div className="flex flex-1 items-center gap-4">
                  <label className="flex flex-1 items-center gap-2 text-xs">X
                    <input type="range" min={0} max={1} step={0.01} className="w-full accent-blue-500" value={focus?.x ?? 0.5}
                      onChange={(e) => setFocus({ x: Number(e.target.value), y: focus?.y ?? 0.5 })} />
                  </label>
                  <label className="flex flex-1 items-center gap-2 text-xs">Y
                    <input type="range" min={0} max={1} step={0.01} className="w-full accent-blue-500" value={focus?.y ?? 0.5}
                      onChange={(e) => setFocus({ x: focus?.x ?? 0.5, y: Number(e.target.value) })} />
                  </label>
                  <button className="btn-ghost !px-2 !py-1 !text-[10px]" onClick={() => setFocus(null)}>Limpar</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => save(false)} disabled={busy}><Save size={15} /> Guardar</button>
          <button className="btn-primary" onClick={() => save(true)} disabled={busy}>
            {busy ? <Spinner /> : <RefreshCw size={15} />} Guardar e regenerar
          </button>
          <button className="btn-ghost ml-auto" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

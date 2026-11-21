"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, post } from "@/lib/client/api";
import { Alert, Progress, Spinner, StatusBadge } from "@/components/ui";
import { SUBTITLE_LANGUAGES } from "@/lib/ai/languages-client";
import { VIDEO_FORMATS } from "@/lib/video/formats-client";
import { Wand2, Download, Lock, Unlock, Clock, Sparkles, RefreshCw, Loader2, Pencil, Focus } from "lucide-react";
import { ClipEditor } from "@/components/clip-editor";

export type Project = { id: string; title: string; status: string; duration: number | null; width: number | null; height: number | null; detected_language: string | null; error: string | null; source_type: string };
export type Moment = { id: string; start_sec: number; end_sec: number; title: string; description: string; reason: string; score: number; category: string };
export type Clip = {
  id: string; title: string; description: string; start_sec: number; end_sec: number; duration: number;
  format: string; subtitle_lang: string; status: string; is_unlocked: number; unlock_kind: string | null; storage_path: string | null;
};
export type Job = { id: string; type: string; status: string; progress: number; stage: string | null; error: string | null; payload?: Record<string, unknown> };
export type Detail = { project: Project; moments: Moment[]; clips: Clip[]; jobs: Job[] };
export type PlanFeatures = {
  plan: { id: string; name: string };
  maxWidth: number;
  autofocusLevel: "none" | "basic" | "tracking" | "group";
  subtitleStyles: number;
  animatedSubtitles: boolean;
  customBranding: boolean;
  multipleUsers: boolean;
  batchExport: boolean;
  priority: number;
  autoPublish: boolean;
  maxVideoMinutes: number;
  watermarks: boolean;
};

function fmt(s: number) { const v = Math.floor(s); return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`; }

export function ProjectWorkspace({ initial }: { initial: Detail }) {
  const [data, setData] = useState(initial);
  const [lang, setLang] = useState("pt");
  const [format, setFormat] = useState("reels");
  const [karaoke, setKaraoke] = useState(false);
  const [autofocusMode, setAutofocusMode] = useState<"center" | "model" | "manual">("center");
  const [groupFocus, setGroupFocus] = useState(false);
  const [manualFocus, setManualFocus] = useState({ x: 0.5, y: 0.5 });
  const [maxClips, setMaxClips] = useState(6);
  const [editingClip, setEditingClip] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [credits, setCredits] = useState(0);
  const [freeUsed, setFreeUsed] = useState(false);
  const [features, setFeatures] = useState<PlanFeatures | null>(null);

  const load = useCallback(async () => {
    const [d, a] = await Promise.all([
      api<Detail>(`/api/projects/${initial.project.id}`),
      api<{ credits: number; freeUsed: boolean; features: PlanFeatures }>("/api/account"),
    ]);
    setData(d); setCredits(a.credits); setFreeUsed(a.freeUsed); setFeatures(a.features);
  }, [initial.project.id]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const processing = data.project.status === "importing" || data.project.status === "analyzing" ||
    data.clips.some((c) => c.status === "queued" || c.status === "rendering");

  useEffect(() => {
    if (!processing) return;
    const t = setInterval(() => load().catch(() => {}), 1500);
    return () => clearInterval(t);
  }, [processing, load]);

  async function generate() {
    setBusy(true); setError(""); setMsg("");
    try {
      await post(`/api/projects/${initial.project.id}/analyze`, {
        subtitleLang: lang, formatId: format, maxClips,
        style: { karaoke, animation: "fade", autofocusMode },
        autofocusMode,
        manualFocus: autofocusMode === "manual" ? manualFocus : undefined,
        groupFocus,
        stylePreset: "padrao",
      });
      setMsg("Análise iniciada. A IA está a transcrever e a identificar os melhores momentos…");
      await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function unlock(clipId: string, mode: "free" | "credit") {
    setError(""); setMsg("");
    try {
      await post(`/api/clips/${clipId}/unlock`, { mode });
      setMsg(mode === "free" ? "Corte gratuito desbloqueado!" : "Corte desbloqueado com 1 crédito.");
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  const p = data.project;
  const analyzeJob = data.jobs.find((j) => j.type === "analyze");
  const stageMap: Record<string, string> = {
    a_ler_metadados: "A ler metadados do vídeo", a_detectar_cenas: "A detectar mudanças de cena",
    a_detectar_pausas: "A detectar pausas e fronteiras de frases", a_transcrever: "A transcrever o áudio",
    a_identificar_momentos: "A identificar momentos com IA", a_criar_cortes: "A criar os cortes", a_finalizar: "A finalizar",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/projectos" className="text-xs text-blue-500 hover:underline">← Voltar aos projectos</Link>
          <h1 className="mt-1 text-2xl font-extrabold">{p.title}</h1>
          <p className="text-sm muted">
            {p.duration ? `${fmt(p.duration)} · ` : ""}{p.width ? `${p.width}×${p.height}` : "—"}
            {p.detected_language ? ` · idioma: ${p.detected_language}` : ""}
          </p>
        </div>
        <StatusBadge status={p.status} />
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {msg && <Alert tone="success">{msg}</Alert>}
      {p.error && <Alert tone="error">Erro no projecto: {p.error}</Alert>}

      {p.status === "failed" && <Alert tone="error">O processamento falhou. Pode tentar novamente com outras opções abaixo.</Alert>}

      {(p.status === "ready" && data.moments.length === 0) && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card overflow-hidden lg:col-span-2">
            <div className="aspect-video bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/projects/${p.id}/thumbnail`} alt="Miniatura do vídeo" className="h-full w-full object-contain" />
            </div>
            <div className="p-4 text-xs muted">Vídeo importado com sucesso. Configure a análise abaixo.</div>
          </div>
          <div className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Wand2 size={19} className="text-blue-500" /> Configurar geração</h2>
            <div className="space-y-4">
              <div><label className="label">Idioma das legendas</label>
                <select className="input" value={lang} onChange={(e) => setLang(e.target.value)}>
                  {SUBTITLE_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              <div><label className="label">Formato de exportação</label>
                <select className="input" value={format} onChange={(e) => setFormat(e.target.value)}>
                  {VIDEO_FORMATS.map((f) => {
                    const locked = features && (
                      (features.plan.id === "plan_free" && f.aspect !== "9:16") ||
                      (features.plan.id === "plan_creator" && f.aspect === "4:5")
                    );
                    return <option key={f.id} value={f.id} disabled={Boolean(locked)}>{f.label} — {f.aspect}{locked ? " (bloqueado)" : ""}</option>;
                  })}
                </select>
              </div>
              <div><label className="label">Quantidade de cortes: {maxClips}</label>
                <input type="range" min={1} max={12} value={maxClips} onChange={(e) => setMaxClips(Number(e.target.value))} className="w-full accent-blue-500" />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={karaoke} onChange={(e) => setKaraoke(e.target.checked)} className="accent-blue-500" /> Legendas dinâmicas estilo karaoke</label>
              <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                <label className="label flex items-center gap-1.5"><Focus size={13} /> Autofoco</label>
                <select className="input !py-2 !text-xs" value={autofocusMode} onChange={(e) => setAutofocusMode(e.target.value as typeof autofocusMode)}>
                  <option value="center">Centro</option>
                  <option value="manual" disabled={features?.autofocusLevel === "none"}>Foco manual</option>
                  <option value="model" disabled={!features || ["none", "basic"].includes(features.autofocusLevel)}>Rastreamento de rosto (modelo)</option>
                </select>
                {features && (
                  <label className="mt-2 flex items-center gap-2 text-xs">
                    <input type="checkbox" className="accent-blue-500" checked={groupFocus} disabled={features.autofocusLevel !== "group"}
                      onChange={(e) => setGroupFocus(e.target.checked)} />
                    Detecção de vários participantes {features.autofocusLevel !== "group" && "(plano Agência)"}
                  </label>
                )}
                {autofocusMode === "manual" && (
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center gap-2 text-xs">X <input type="range" min={0} max={1} step={0.01} className="w-full accent-blue-500" value={manualFocus.x} onChange={(e) => setManualFocus({ ...manualFocus, x: Number(e.target.value) })} /></label>
                    <label className="flex items-center gap-2 text-xs">Y <input type="range" min={0} max={1} step={0.01} className="w-full accent-blue-500" value={manualFocus.y} onChange={(e) => setManualFocus({ ...manualFocus, y: Number(e.target.value) })} /></label>
                  </div>
                )}
              </div>
              <button className="btn-primary w-full" onClick={generate} disabled={busy}>{busy ? <Spinner /> : <Sparkles size={16} />} Gerar cortes com IA</button>
              <p className="text-[11px] muted">A análise combina transcrição, semântica, pausas e mudanças de cena. Os cortes nunca dividem uma frase.</p>
            </div>
          </div>
        </div>
      )}

      {processing && (
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            {analyzeJob?.status === "failed" ? <RefreshCw size={20} className="text-rose-400" /> : <Loader2 size={20} className="animate-spin text-blue-500" />}
            <div><h2 className="font-bold">A processar o seu vídeo</h2>
              <p className="text-xs muted">{stageMap[analyzeJob?.stage ?? ""] ?? (data.clips.some((c) => c.status === "rendering") ? "A renderizar cortes" : "A preparar a análise")}</p>
            </div>
            <span className="ml-auto text-sm font-bold text-blue-500">{analyzeJob?.progress ?? 0}%</span>
          </div>
          <Progress value={analyzeJob?.progress ?? 0} />
          <div className="mt-4 grid gap-2 text-[11px] muted sm:grid-cols-5">
            {["Análise", "Transcrição", "Detecção de momentos", "Tradução", "Renderização"].map((s, i) => (
              <div key={s} className={`rounded-lg border px-2 py-2 text-center ${(analyzeJob?.progress ?? 0) > i * 20 ? "border-blue-500/40 text-blue-500" : ""}`} style={{ borderColor: "var(--border)" }}>{s}</div>
            ))}
          </div>
          {analyzeJob?.error && <div className="mt-4"><Alert tone="error">{analyzeJob.error}</Alert></div>}
        </div>
      )}

      {data.moments.length > 0 && (
        <div className="card p-6">
          <h2 className="mb-1 text-lg font-bold">Momentos identificados pela IA</h2>
          <p className="mb-4 text-xs muted">Cada corte respeita as fronteiras das frases e inclui o motivo da selecção.</p>
          <div className="space-y-2">
            {data.moments.map((m) => (
              <div key={m.id} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{m.title}</span>
                  <span className="badge bg-blue-500/10 text-blue-500">{fmt(m.start_sec)} – {fmt(m.end_sec)}</span>
                  <span className="badge bg-cyan-500/10 text-cyan-500">Relevância {(m.score * 100).toFixed(0)}%</span>
                  <span className="badge bg-violet-500/10 text-violet-500">{m.category}</span>
                </div>
                <p className="mt-2 text-xs muted">{m.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.clips.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Cortes gerados <span className="text-sm muted">({data.clips.length})</span></h2>
            <span className="text-xs muted">Créditos: <strong className="text-blue-500">{credits}</strong> · Corte gratuito: {freeUsed ? "usado" : "disponível"}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.clips.map((c) => {
              const unlocked = Boolean(c.is_unlocked);
              const ready = c.status === "ready";
              const job = data.jobs.find((j) => j.type === "render" && (j.payload as { clipId?: string })?.clipId === c.id);
              return (
                <div key={c.id} className="card overflow-hidden">
                  <div className="relative aspect-[9/16] max-h-72 bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/clips/${c.id}/thumbnail`} alt="" className={`h-full w-full object-cover ${unlocked ? "" : "blur-xl scale-110"}`} />
                    {!unlocked && <div className="absolute inset-0 grid place-items-center bg-black/35"><span className="badge bg-black/70 text-white"><Lock size={12} /> BLOQUEADO</span></div>}
                    {unlocked && <span className="absolute left-2 top-2 badge bg-emerald-500/90 text-white"><Unlock size={12} /> {c.unlock_kind === "free" ? "GRÁTIS" : "DESBLOQUEADO"}</span>}
                    {!ready && <div className="absolute inset-0 grid place-items-center bg-black/60"><div className="text-center text-white"><Spinner size={22} /><p className="mt-2 text-xs">A renderizar… {job?.progress ?? 0}%</p></div></div>}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-sm font-bold">{c.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] muted">
                      <span className="flex items-center gap-1"><Clock size={12} /> {Math.round(c.duration)}s</span>
                      <span>{c.format}</span><span>{c.subtitle_lang}</span>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      {ready && unlocked && (
                        <a href={`/api/clips/${c.id}/download`} className="btn-primary w-full !py-2 !text-xs"><Download size={14} /> Descarregar</a>
                      )}
                      {ready && !unlocked && !freeUsed && (
                        <button onClick={() => unlock(c.id, "free")} className="btn-primary w-full !py-2 !text-xs"><Sparkles size={14} /> Escolher como corte grátis</button>
                      )}
                      {ready && !unlocked && (
                        <button onClick={() => unlock(c.id, "credit")} disabled={credits < 1} className="btn-ghost w-full !py-2 !text-xs"><Unlock size={14} /> Desbloquear com 1 crédito</button>
                      )}
                      <button onClick={() => setEditingClip(c.id)} className="btn-ghost w-full !py-2 !text-xs"><Pencil size={14} /> Editar legendas / enquadramento</button>
                      {!ready && job?.status === "failed" && <p className="text-xs text-rose-400">{job.error}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {!freeUsed && <p className="mt-4 text-center text-xs muted">Escolha um corte para desbloquear gratuitamente — apenas uma vez por conta.</p>}
        </div>
      )}

      {editingClip && (
        <ClipEditor
          clipId={editingClip}
          onClose={() => setEditingClip(null)}
          onSaved={() => load().catch(() => {})}
        />
      )}
    </div>
  );
}

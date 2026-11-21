"use client";

import { Check, Sparkles, Scissors, Captions, Play } from "lucide-react";

/** Ondas determinísticas — sem Math.random, para não quebrar a hidratação. */
const WAVE = Array.from({ length: 118 }, (_, i) => {
  const a = Math.abs(Math.sin(i * 0.91)) * 32;
  const b = Math.abs(Math.cos(i * 0.31)) * 20;
  const c = Math.abs(Math.sin(i * 2.13)) * 9;
  return Math.max(8, Math.round(a + b + c));
});

const REGIOES = [
  { inicio: 12, largura: 12, numero: 1 },
  { inicio: 46, largura: 13, numero: 2 },
  { inicio: 79, largura: 11, numero: 3 },
];

const CORTES = [
  {
    numero: 1, titulo: "O maior erro dos criadores", nota: 94, plataforma: "Shorts · 9:16",
    legenda: "NINGUÉM TE CONTA ISSO", duracao: "0:44", destaque: true,
  },
  {
    numero: 2, titulo: "A primeira contratação", nota: 88, plataforma: "Reels · 9:16",
    legenda: "CONTRATE POR ESTE MOTIVO", duracao: "0:38", destaque: false,
  },
  {
    numero: 3, titulo: "O hábito de sexta-feira", nota: 83, plataforma: "TikTok · 9:16",
    legenda: "FAZ ISTO TODA SEXTA", duracao: "0:51", destaque: false,
  },
];

function Janela({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-24px_rgba(30,41,90,.35)] sm:p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /></span>
        {children}
      </div>
      { /* conteúdo */ }
      <div className="contents">{arguments[1]}</div>
    </div>
  );
}

export function EditorAnimation() {
  return (
    <section className="relative overflow-hidden px-5 py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,.10),transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="badge border border-blue-500/30 bg-blue-500/10 text-blue-500">PROCESSAMENTO REAL · IA + FFMPEG</span>
            <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">Do vídeo longo aos cortes, automaticamente</h2>
            <p className="mt-1 text-sm muted">A IA lê a transcrição, escolhe os melhores momentos e entrega cortes verticais legendados.</p>
          </div>
          <span className="hidden items-center gap-2 text-xs muted sm:flex"><Sparkles size={14} /> Fluxo ilustrado em tempo real</span>
        </div>

        {/* Painel 1 — análise */}
        <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-24px_rgba(30,41,90,.35)] sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
            <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /></span>
            <span className="ml-2 text-sm font-semibold text-slate-800">Entrevista — gravação completa</span>
            <span className="ml-auto flex items-center gap-1 text-xs font-bold text-indigo-600"><Check size={13} /> 3 momentos encontrados</span>
          </div>

          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="relative h-36 overflow-hidden rounded-2xl bg-slate-900 md:h-full md:min-h-[150px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/podcast-studio.jpg" alt="Entrevista em estúdio" className="h-full w-full object-cover" />
              <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-1 font-mono text-[10px] font-bold text-white">58:40</span>
              <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-blue-700"><Play size={11} fill="currentColor" /></span>
            </div>

            <div>
              <p className="mb-3 text-xs text-slate-500">Ordenado por relevância de cada momento</p>
              <div className="relative h-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 px-2">
                <div className="absolute inset-0 flex items-end gap-[2px] px-2 pb-2">
                  {WAVE.map((h, i) => (
                    <span
                      key={i}
                      className="flex-1 rounded-full transition-colors duration-700"
                      style={{
                        height: `${h}%`,
                        background: REGIOES.find((r) => i >= r.inicio && i < r.inicio + r.largura) ? "#6366f1" : "#a5b4fc",
                        opacity: REGIOES.find((r) => i >= r.inicio && i < r.inicio + r.largura) ? 1 : 0.55,
                      }}
                    />
                  ))}
                </div>
                {REGIOES.map((r, i) => (
                  <span
                    key={r.numero}
                    className="region-mark absolute inset-y-1 rounded-xl border-2 border-indigo-500/70 bg-indigo-500/10"
                    style={{ left: `${r.inicio}%`, width: `${r.largura}%`, animationDelay: `${0.5 + i * 0.5}s` }}
                  >
                    <span className="absolute -top-0 left-1/2 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">{r.numero}</span>
                  </span>
                ))}
                <span className="playhead absolute inset-y-0 w-[2px] bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {CORTES.map((c) => (
                  <span key={c.numero} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-indigo-600 text-[9px] text-white">{c.numero}</span>
                    {c.titulo}
                    <span className="rounded-full bg-emerald-50 px-1.5 text-[10px] text-emerald-600">{c.nota}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Painel 2 — cortes */}
        <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-24px_rgba(30,41,90,.35)] sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
            <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /></span>
            <span className="ml-2 text-sm font-semibold text-slate-800">Os seus cortes, ordenados por relevância</span>
            <span className="ml-auto text-xs text-slate-500">Descarregue cada um em MP4</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {CORTES.map((c, i) => (
              <div
                key={c.numero}
                className={`clip-card rounded-2xl border p-2.5 ${c.destaque ? "border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-500/20" : "border-slate-200 bg-white"}`}
                style={{ animationDelay: `${1.1 + i * 0.6}s` }}
              >
                <div className="flex gap-3">
                  <div className="relative aspect-[9/14] w-[38%] shrink-0 overflow-hidden rounded-xl bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/podcast-studio.jpg" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-2 pb-3 pt-8">
                      <p className="text-[11px] font-black leading-tight text-white">{c.legenda}</p>
                    </div>
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] text-white">{c.duracao}</span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">{c.numero}</span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-600"><i className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {c.nota}</span>
                    </div>
                    <p className="mt-3 text-base font-bold leading-snug text-slate-900">{c.titulo}</p>
                    <p className="mt-2 text-xs text-slate-500">{c.plataforma}</p>
                    <div className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
                      <Scissors size={11} /> corte pronto
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Sem cortar frases</span>
            <span className="flex items-center gap-1.5"><Captions size={13} className="text-emerald-500" /> Legendas sincronizadas</span>
            <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> 9:16, 16:9 e 1:1</span>
            <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> H.264 / MP4</span>
          </div>
        </div>
      </div>
    </section>
  );
}

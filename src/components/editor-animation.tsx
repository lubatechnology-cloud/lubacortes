"use client";

import { Play, Scissors, Sparkles, Wand2, Captions, Check, Clock, MoveHorizontal } from "lucide-react";

const WAVE = Array.from({ length: 96 }, (_, i) => {
  const a = Math.abs(Math.sin(i * 1.13)) * 34;
  const b = Math.abs(Math.cos(i * 0.37)) * 18;
  const c = Math.abs(Math.sin(i * 2.7)) * 8;
  return Math.max(6, Math.round(a + b + c));
});

const SEGMENTS = [
  { start: 8, width: 17, label: "01 · Frase de impacto", color: "#3b82f6" },
  { start: 39, width: 19, label: "02 · Momento educativo", color: "#22d3ee" },
  { start: 70, width: 15, label: "03 · Curiosidade", color: "#6366f1" },
];

const CLIPS = [
  { title: "O maior erro dos criadores", time: "00:32 – 00:44", score: 94, tone: "from-blue-700 to-slate-900", label: "TikTok · 9:16" },
  { title: "A regra que ninguém explica", time: "05:18 – 05:31", score: 88, tone: "from-indigo-700 to-slate-900", label: "Reels · 9:16" },
  { title: "Transforme ideias em cortes", time: "11:42 – 11:54", score: 81, tone: "from-cyan-700 to-slate-900", label: "Shorts · 9:16" },
];

function Silhouette() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="edBg" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#101c3d" /><stop offset="1" stopColor="#050b1d" />
        </linearGradient>
        <linearGradient id="edShirt" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#132550" /><stop offset="1" stopColor="#0a1430" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#edBg)" />
      <circle cx="250" cy="40" r="90" fill="#2563eb" opacity=".12" />
      <circle cx="50" cy="150" r="70" fill="#22d3ee" opacity=".08" />
      <path d="M95 180c6-42 30-62 65-62s59 20 65 62z" fill="url(#edShirt)" />
      <ellipse cx="160" cy="100" rx="30" ry="36" fill="#294b86" />
      <path d="M130 96c0-25 13-37 30-37s30 12 30 37c-6-15-16-22-30-22s-24 7-30 22z" fill="#0b1224" />
      <path d="M149 110h6M165 110h6" stroke="#0b1224" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="227" y="118" width="7" height="52" rx="3.5" fill="#334155" />
      <circle cx="230.5" cy="114" r="11" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
    </svg>
  );
}

export function EditorAnimation() {
  return (
    <section className="relative overflow-hidden px-5 py-14">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="badge border border-blue-500/30 bg-blue-500/10 text-blue-500">MOTOR DE EDIÇÃO AUTOMÁTICA</span>
            <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">O vídeo entra. Os cortes saem primeiro.</h2>
            <p className="mt-1 text-sm muted">Análise, detecção, legendagem e enquadramento em tempo real.</p>
          </div>
          <span className="hidden items-center gap-2 text-xs muted sm:flex"><MoveHorizontal size={14} /> Animação do fluxo real</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
          {/* Editor */}
          <div className="card overflow-hidden !bg-[#0b1226] p-0 text-slate-200">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="flex gap-1.5"><i className="h-2 w-2 rounded-full bg-rose-500/80" /><i className="h-2 w-2 rounded-full bg-amber-400/80" /><i className="h-2 w-2 rounded-full bg-emerald-500/80" /></span>
              <span className="ml-2 truncate font-mono text-[11px] text-slate-400">projeto_lubacortes.mp4 · 1080p · 24 fps</span>
              <span className="ml-auto badge bg-cyan-500/15 text-cyan-300">A ANALISAR</span>
            </div>

            <div className="relative aspect-video overflow-hidden">
              <Silhouette />
              <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-cyan-300">00:00:12:04</span>
              <span className="absolute right-3 top-3 rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-slate-300">FOCUS · AUTO</span>
              {/* caixa de detecção animada */}
              <span className="focus-box absolute left-[38%] top-[26%] h-[46%] w-[26%] rounded-md border border-cyan-400/70" />
              <span className="absolute bottom-3 left-1/2 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-white/90 text-blue-800"><Play size={14} fill="currentColor" /></span>
              <div className="scanline absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-cyan-400/10 to-transparent" />
            </div>

            {/* Transporte */}
            <div className="flex items-center gap-3 border-y border-white/10 px-4 py-2 font-mono text-[10px] text-slate-400">
              <Play size={11} /> <span>00:12:04</span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"><i className="block h-full w-1/3 bg-gradient-to-r from-blue-500 to-cyan-400" /></span>
              <span>24:18:00</span>
            </div>

            {/* Timeline */}
            <div className="px-4 py-3">
              <div className="mb-1.5 flex justify-between font-mono text-[9px] text-slate-500">
                <span>00:00</span><span>00:06</span><span>00:12</span><span>00:18</span><span>00:24</span>
              </div>
              <div className="relative h-20 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
                <div className="absolute inset-0 flex items-end gap-[2px] px-1 pb-1">
                  {WAVE.map((h, i) => (
                    <span key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: SEGMENTS.find((s) => i >= s.start && i < s.start + s.width)?.color ?? "#475569", opacity: 0.7 }} />
                  ))}
                </div>
                {SEGMENTS.map((s) => (
                  <span key={s.label} className="absolute inset-y-0 border-x border-blue-400/60 bg-blue-500/10 segment-in" style={{ left: `${s.start}%`, width: `${s.width}%`, animationDelay: `${0.6 + s.start / 100}s` }}>
                    <span className="absolute left-1 top-1 whitespace-nowrap rounded bg-blue-500/25 px-1 py-0.5 font-mono text-[8px] text-blue-200">{s.label}</span>
                  </span>
                ))}
                <span className="playhead absolute inset-y-0 w-px bg-cyan-300 shadow-[0_0_12px_#22d3ee]" />
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1.5"><Wand2 size={12} className="text-blue-400" /> 3 momentos detetados</span>
                <span className="flex items-center gap-1.5"><Captions size={12} className="text-cyan-400" /> Legendas sincronizadas</span>
                <span className="flex items-center gap-1.5"><Scissors size={12} className="text-indigo-400" /> Cortes gerados</span>
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div className="space-y-3">
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold"><Sparkles size={14} className="text-blue-500" /> Cortes gerados</span>
                <span className="badge bg-emerald-500/10 text-emerald-500">3 NOVOS</span>
              </div>
              <div className="space-y-2">
                {CLIPS.map((c, i) => (
                  <div key={c.title} className="clip-in flex items-center gap-3 rounded-xl border p-2.5" style={{ borderColor: "var(--border)", animationDelay: `${1.2 + i * 0.7}s` }}>
                    <div className={`relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-gradient-to-br ${c.tone}`}>
                      <span className="absolute bottom-1 left-1 h-2.5 w-2.5 rounded-full bg-slate-300/70" />
                      <span className="absolute bottom-4 left-[9px] h-3 w-3 rounded-full bg-slate-400/70" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{c.title}</p>
                      <p className="flex items-center gap-1 text-[10px] muted"><Clock size={10} /> {c.time}</p>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                        <i className="block h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 score-bar" style={{ width: `${c.score}%`, animationDelay: `${1.6 + i * 0.7}s` }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-500">{c.score}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <p className="mb-3 text-xs font-bold">Exportação optimizada</p>
              <div className="flex flex-wrap gap-2">
                {["9:16 Vertical", "1:1 Quadrado", "16:9 Horizontal"].map((f) => (
                  <span key={f} className="badge border" style={{ borderColor: "var(--border)" }}><Check size={11} className="text-emerald-500" /> {f}</span>
                ))}
              </div>
              <p className="mt-3 text-[10px] muted">TikTok · Reels · Shorts · Facebook · LinkedIn</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

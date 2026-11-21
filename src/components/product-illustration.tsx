import {
  Play, Sparkles, Captions, Scissors, Wand2, Check, Clock, Film,
  Music2, Instagram, Youtube, Facebook, Linkedin, Upload, ArrowRight,
} from "lucide-react";

function Presenter({ light = false }: { light?: boolean }) {
  const skin = light ? "#d9e6ff" : "#1b2f6f";
  const shirt = light ? "#8fb4ff" : "#0b1740";
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`shirt-${light}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={shirt} /><stop offset="1" stopColor={light ? "#3b82f6" : "#1e3a8a"} />
        </linearGradient>
        <linearGradient id={`bg-${light}`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={light ? "#1e3a8a" : "#0b1533"} /><stop offset="1" stopColor={light ? "#0b1533" : "#060b1d"} />
        </linearGradient>
      </defs>
      <rect width="200" height="150" fill={`url(#bg-${light})`} />
      <circle cx="160" cy="30" r="55" fill="#2563eb" opacity=".16" />
      <circle cx="30" cy="120" r="45" fill="#22d3ee" opacity=".12" />
      <rect x="14" y="112" width="172" height="4" rx="2" fill="#1e3a8a" opacity=".7" />
      <path d="M42 150c4-30 22-45 58-45s54 15 58 45z" fill={`url(#shirt-${light})`} />
      <path d="M86 108h28v14c0 8-28 8-28 0z" fill={skin} opacity=".85" />
      <ellipse cx="100" cy="82" rx="25" ry="30" fill={skin} />
      <path d="M75 78c0-20 10-30 25-30s25 10 25 30c-5-12-13-17-25-17s-20 5-25 17z" fill="#0f172a" opacity=".85" />
      <circle cx="91" cy="83" r="2.4" fill="#0b1220" /><circle cx="109" cy="83" r="2.4" fill="#0b1220" />
      <path d="M94 96c4 3 8 3 12 0" stroke="#0b1220" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".7" />
      <rect x="126" y="104" width="7" height="34" rx="3.5" fill="#334155" />
      <circle cx="129.5" cy="100" r="9" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
    </svg>
  );
}

const WAVE = Array.from({ length: 52 }, (_, i) => {
  const base = 8 + Math.abs(Math.sin(i * 1.37) * 22) + Math.abs(Math.cos(i * 0.53) * 12);
  return Math.round(base);
});
const HIGHLIGHTS = new Set([6, 7, 8, 20, 21, 22, 23, 38, 39, 40]);

function VideoPanel() {
  return (
    <div className="relative">
      <div className="card overflow-hidden shadow-glow">
        <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
          <span className="flex items-center gap-1.5 text-[10px] font-bold muted"><Film size={12} /> Fonte: vídeo longo</span>
          <span className="badge bg-blue-500/10 text-blue-500">24:18</span>
        </div>
        <div className="relative aspect-video overflow-hidden bg-slate-950">
          <Presenter />
          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white">ORIGINAL · 16:9</span>
          <span className="absolute bottom-2 left-1/2 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full bg-white/90 text-blue-700 shadow-lg"><Play size={13} fill="currentColor" /></span>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="flex h-12 items-end gap-[2px] overflow-hidden rounded-lg p-1" style={{ background: "var(--surface-2)" }}>
            {WAVE.map((h, i) => (
              <span key={i} className="flex-1 rounded-full" style={{ height: `${h}px`, background: HIGHLIGHTS.has(i) ? "#2563eb" : "#94a3b8", opacity: HIGHLIGHTS.has(i) ? 1 : 0.55 }} />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[9px] muted"><Clock size={10} /> A waveform mostra onde a IA encontrou momentos de destaque</div>
        </div>
      </div>
      <div className="card absolute -bottom-6 -left-3 w-52 animate-floaty p-3 shadow-glow sm:-left-8">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold text-blue-500"><Sparkles size={12} /> Pontos altos</p>
        {[
          ["Frase de impacto", "00:32"],
          ["Momento educativo", "05:18"],
          ["História engraçada", "11:42"],
        ].map(([label, time]) => (
          <div key={label} className="flex items-center gap-1.5 py-1 text-[10px]">
            <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-emerald-500/15 text-emerald-500"><Check size={9} /></span>
            <span className="truncate">{label}</span><span className="ml-auto muted">{time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiPanel() {
  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="relative grid h-24 w-24 place-items-center">
        <span className="absolute inset-0 rounded-full border border-dashed border-blue-500/40 animate-orbit" />
        <span className="absolute inset-3 rounded-full bg-blue-500/10 blur-md" />
        <span className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-lg font-black text-white shadow-glow">IA</span>
        <span className="absolute -right-1 top-3 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
      </div>
      <div className="space-y-2">
        {[
          { icon: Captions, label: "Transcrição" },
          { icon: Wand2, label: "Detecção de momentos" },
          { icon: Scissors, label: "Cortes automáticos" },
        ].map((s, i) => (
          <div key={s.label} className={`card flex items-center gap-2 px-3 py-2 text-[10px] font-semibold animate-floaty ${i === 1 ? "!border-blue-500/50" : ""}`} style={{ animationDelay: `${i * 0.6}s` }}>
            <s.icon size={13} className="text-blue-500" /> {s.label}
            <Check size={11} className="ml-auto text-emerald-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

const SHORTS = [
  { caption: <>O maior <span className="text-cyan-300">erro</span> que os criadores cometem</>, time: "00:32", tone: "from-blue-800 to-slate-900" },
  { caption: <>A maioria das pessoas <span className="text-cyan-300">ignora</span> isto…</>, time: "05:18", tone: "from-indigo-800 to-blue-950" },
  { caption: <>Transforme conteúdo longo em <span className="text-cyan-300">impacto</span></>, time: "11:42", tone: "from-sky-800 to-slate-900" },
];

function ShortsPanel() {
  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500"><Sparkles size={12} /> Cortes gerados por IA</span>
        <span className="badge bg-cyan-500/10 text-cyan-500">9:16</span>
      </div>
      <div className="flex items-end justify-center gap-2 sm:gap-3">
        {SHORTS.map((s, i) => (
          <div key={s.time} className={`card relative w-[31%] max-w-[140px] overflow-hidden bg-gradient-to-br ${s.tone} p-0 animate-floaty`} style={{ animationDelay: `${i * 0.45}s` }}>
            <div className="relative aspect-[9/16]">
              <Presenter light />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-8">
                <p className="text-[10px] font-extrabold leading-tight text-white">{s.caption}</p>
                <p className="mt-1 text-[8px] text-cyan-300">Legenda automática</p>
              </div>
              <span className="absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[8px] font-bold text-white">{s.time}</span>
              <span className="absolute bottom-2 right-2 grid h-5 w-5 place-items-center rounded-full bg-white/85 text-blue-700"><Play size={9} fill="currentColor" /></span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
        <Music2 size={12} className="text-blue-500" />
        {["TikTok", "Reels", "Shorts", "Facebook", "LinkedIn"].map((p) => (
          <span key={p} className="badge border" style={{ borderColor: "var(--border)" }}>{p}</span>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  { icon: Upload, label: "Colocar o vídeo" },
  { icon: Wand2, label: "A IA analisa" },
  { icon: Captions, label: "Legendar e recortar" },
  { icon: ArrowRight, label: "Publicar" },
];

export function ProductIllustration() {
  return (
    <section className="relative overflow-hidden px-5 py-12">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <span className="badge border border-blue-500/30 bg-blue-500/10 text-blue-500">VEJA COMO FUNCIONA</span>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">De um vídeo longo a vários cortes prontos a publicar</h2>
          <p className="mt-2 text-sm muted">A Lubacortes encontra os melhores momentos, legenda e adapta a cada rede social — automaticamente.</p>
        </div>

        <svg className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block" aria-hidden="true">
          <path d="M 33% 42% L 45% 42%" className="animate-dash" stroke="#3b82f6" strokeWidth="1.5" fill="none" opacity=".6" />
          <path d="M 57% 42% L 68% 42%" className="animate-dash" stroke="#22d3ee" strokeWidth="1.5" fill="none" opacity=".6" />
        </svg>

        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.55fr_1fr] lg:gap-6">
          <VideoPanel />
          <AiPanel />
          <ShortsPanel />
        </div>

        <div className="card mt-14 flex flex-wrap items-center justify-center gap-3 p-4">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "var(--surface-2)" }}>
                <s.icon size={15} className="text-blue-500" />
                <span className="text-[11px] font-bold">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <span className="text-blue-500/50">→</span>}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] muted">
          <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Sem cortar frases ao meio</span>
          <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Legendas sincronizadas</span>
          <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Formatos 9:16, 16:9 e 1:1</span>
          <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" />1 corte grátis por conta</span>
        </div>
      </div>
    </section>
  );
}

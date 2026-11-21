import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { HeroForm } from "@/components/hero-form";
import { ProductIllustration } from "@/components/product-illustration";
import { EditorAnimation } from "@/components/editor-animation";
import { Logo, ThemeToggle } from "@/components/ui";
import { Scissors, Wand2, Captions, Crop, ShieldCheck, Zap, ArrowRight, Check } from "lucide-react";
import { formatKz, listPackages, listPlans } from "@/lib/billing";

export const dynamic = "force-dynamic";

const features = [
  { icon: Wand2, title: "IA que encontra o melhor", text: "Transcrição, análise semântica, mudanças de cena e ritmo para detectar momentos com potencial viral." },
  { icon: Captions, title: "Legendas multilíngues", text: "Transcreva, traduza e sincronize legendas. Estilo karaoke, cores, posição e animações." },
  { icon: Crop, title: "Autofoco e enquadramento", text: "Detecção de pessoas, acompanhamento do falante e recorte inteligente para cada rede social." },
  { icon: Scissors, title: "Cortes reais com FFmpeg", text: "Processamento assíncrono, fila com progresso, retomabilidade e ficheiros optimizados." },
  { icon: ShieldCheck, title: "Segurança por camadas", text: "Contas isoladas, ficheiros privados e autorização verificada no servidor antes de cada download." },
  { icon: Zap, title: "Fluxo simples", text: "Cole o URL, escolha idioma e formato, gere os cortes e descarregue o seu corte gratuito." },
];

export default async function Home() {
  const user = await currentUser();
  const plans = listPlans();
  const packages = listPackages();
  return (
    <main className="relative overflow-hidden">
      <div className="hero-gradient grid-bg absolute inset-0 -z-10" />
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Logo size={38} />
        <nav className="hidden items-center gap-7 text-sm muted md:flex">
          <a href="#funcionalidades" className="hover:text-blue-500">Funcionalidades</a>
          <a href="#como" className="hover:text-blue-500">Como funciona</a>
          <a href="#planos" className="hover:text-blue-500">Planos</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Link href="/dashboard" className="btn-primary">Ir para o painel <ArrowRight size={15} /></Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost hidden sm:inline-flex">Entrar</Link>
              <Link href="/registar" className="btn-primary">Criar conta grátis</Link>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-16 pt-16 text-center sm:pt-24">
        <div className="badge mx-auto mb-6 border border-blue-500/30 bg-blue-500/10 text-blue-400">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Inteligência artificial + processamento real de vídeo
        </div>
        <h1 className="animate-fade-up text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
          Vídeos longos.{" "}
          <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent">Cortes virais.</span>
          <br /> Automaticamente.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed muted sm:text-lg">
          A Lubacortes analisa o seu vídeo, encontra os momentos com maior potencial e cria cortes
          verticais, legendados e prontos para TikTok, Reels e Shorts — com um corte gratuito por conta.
        </p>
        <div className="mt-10"><HeroForm authenticated={Boolean(user)} /></div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs muted">
          <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> 1 corte grátis por conta</span>
          <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Sem cartão de crédito</span>
          <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Pagamentos em modo de teste</span>
        </div>
      </section>

      <EditorAnimation />

      <section className="mx-auto max-w-6xl px-5 pb-6">
        <div className="relative overflow-hidden rounded-[28px] border shadow-glow" style={{ borderColor: "var(--border)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/promo-banner.png" alt="Transforme vídeos longos em cortes incríveis" className="h-[320px] w-full object-cover object-[center_30%] sm:h-[420px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/35 to-transparent" />
          <div className="absolute inset-0 flex items-center p-6 sm:p-10">
            <div className="max-w-md">
              <span className="badge border border-cyan-400/40 bg-cyan-400/15 text-cyan-200">CRIADO EM ANGOLA · PT-AO</span>
              <p className="mt-4 text-2xl font-black leading-tight text-white sm:text-4xl">Cortes prontos em segundos, com legendas animadas e qualidade profissional.</p>
              <p className="mt-3 text-sm text-slate-200">Rápido. Automático. Fácil de usar.</p>
              <Link href={user ? "/dashboard" : "/registar?next=/dashboard"} className="btn-primary mt-6">
                Começar agora <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ProductIllustration />

      <section id="funcionalidades" className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Tudo o que precisa para criar cortes que convertem</h2>
          <p className="mt-3 muted">Uma plataforma completa, da análise à exportação.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card card-hover p-6">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white"><f.icon size={20} /></div>
              <h3 className="mb-2 font-bold">{f.title}</h3>
              <p className="text-sm leading-relaxed muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="como" className="mx-auto max-w-7xl px-5 py-16">
        <h2 className="mb-10 text-center text-3xl font-extrabold sm:text-4xl">Como funciona</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["01", "Cole o URL", "Ou carregue o seu ficheiro de vídeo."],
            ["02", "Analise", "A IA transcreve e encontra os melhores momentos."],
            ["03", "Configure", "Escolha idioma das legendas, formato e enquadramento."],
            ["04", "Gere e descarregue", "Cortes prontos. O primeiro é seu, grátis."],
          ].map(([n, t, d]) => (
            <div key={n} className="card p-6">
              <span className="text-3xl font-black text-blue-500/30">{n}</span>
              <h3 className="mt-2 font-bold">{t}</h3>
              <p className="mt-1 text-sm muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Planos para todos os ritmos</h2>
          <p className="mt-2 text-sm muted">Valores em Kz. Renovação mensal sem cobrança automática. Pagamentos em modo de teste.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div key={p.id} className={`card card-hover flex flex-col p-6 ${p.id === "plan_pro" ? "border-blue-500 ring-1 ring-blue-500/30" : ""}`}>
              <span className="badge w-fit bg-blue-500/10 text-blue-500">{p.name}</span>
              <p className="mt-4 text-2xl font-extrabold">{formatKz(p.price_cents)}<span className="text-xs font-normal muted">/mês</span></p>
              <p className="mt-3 min-h-[56px] text-xs muted">{p.description}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li className="flex gap-2"><Check size={14} className="text-emerald-400" /> {p.max_exports} cortes/mês · vídeos até {p.max_video_minutes} min</li>
                <li className="flex gap-2"><Check size={14} className="text-emerald-400" /> Qualidade até {p.max_width}p</li>
                <li className="flex gap-2"><Check size={14} className="text-emerald-400" /> {p.subtitle_styles} estilo(s) de legenda{p.autofocus_level !== "none" ? ` · autofoco ${p.autofocus_level === "basic" ? "inteligente" : p.autofocus_level === "tracking" ? "com rosto" : "em grupo"}` : ""}</li>
                <li className="flex gap-2">{p.watermark ? "• Com marca de água" : <><Check size={14} className="text-emerald-400" /> Sem marca de água</>}</li>
                {p.auto_publish > 0 && <li className="flex gap-2"><Check size={14} className="text-emerald-400" /> Agendamento (modo teste)</li>}
              </ul>
              <Link href={user ? "/faturacao" : "/registar?next=/faturacao"} className="btn-primary mt-6 w-full !text-xs">
                {p.id === "plan_free" ? "Começar grátis" : "Escolher plano"}
              </Link>
            </div>
          ))}
        </div>
        <div className="card mt-5 p-6">
          <h3 className="font-bold">Pacotes adicionais de minutos</h3>
          <p className="mt-1 text-xs muted">Compre minutos extra quando precisar — sem subscrição obrigatória.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {packages.map((p) => (
              <div key={p.id} className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--border)" }}>
                <p className="font-semibold">{p.name}</p><p className="text-cyan-500">{formatKz(p.price_cents)}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] muted">Preços configuráveis pelo administrador. Nenhum valor é cobrado nesta fase.</p>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs muted" style={{ borderColor: "var(--border)" }}>
        © {new Date().getFullYear()} Lubacortes — Plataforma inteligente de criação de cortes de vídeo.
      </footer>
    </main>
  );
}

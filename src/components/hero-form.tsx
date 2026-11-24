"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight, Upload, Link2 } from "lucide-react";
import { post } from "@/lib/client/api";
import { Alert, Spinner } from "@/components/ui";
import { isPlatformPage, isYoutubeUrl, isDirectVideoUrl } from "@/lib/client/source-url";
import { uploadDirecto } from "@/lib/client/upload";

export function HeroForm({ authenticated }: { authenticated: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"url" | "file">("url");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [yt, setYt] = useState<{ titulo: string; autor: string; miniatura: string } | null>(null);
  const [ytLoading, setYtLoading] = useState(false);

  useEffect(() => {
    if (mode !== "url" || !isYoutubeUrl(url)) { setYt(null); return; }
    let cancelado = false;
    setYtLoading(true);
    const t = setTimeout(() => {
      post<{ info: { titulo: string; autor: string; miniatura: string } }>("/api/sources/youtube", { url })
        .then((r) => { if (!cancelado) setYt(r.info); })
        .catch(() => { if (!cancelado) setYt(null); })
        .finally(() => { if (!cancelado) setYtLoading(false); });
    }, 500);
    return () => { cancelado = true; clearTimeout(t); };
  }, [url, mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!authenticated) {
      router.push("/registar?next=/dashboard");
      return;
    }
    if (mode === "url" && !url.trim()) return setError("Introduza o URL do vídeo.");
    if (mode === "file" && !file) return setError("Selecione um ficheiro de vídeo.");
    setLoading(true);
    try {
      let data: { project: { id: string } };
      if (mode === "file") {
        const caminho = await uploadDirecto(file!);
        data = await post("/api/projects", {
          sourceType: "upload", remotePath: caminho, fileName: file!.name, size: file!.size,
        });
      } else {
        data = await post("/api/projects", { sourceType: "url", url: url.trim() });
      }
      router.push(`/projecto/${data.project.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card mx-auto w-full max-w-3xl p-2 shadow-glow">
      <div className="mb-1 flex gap-1 px-2 pt-2">
        <button onClick={() => setMode("url")} className={`btn ${mode === "url" ? "btn-primary" : "btn-ghost"} !px-3 !py-1.5 !text-xs`}>
          <Link2 size={14} /> URL do vídeo
        </button>
        <button onClick={() => setMode("file")} className={`btn ${mode === "file" ? "btn-primary" : "btn-ghost"} !px-3 !py-1.5 !text-xs`}>
          <Upload size={14} /> Carregar ficheiro
        </button>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2 p-2 sm:flex-row">
        {mode === "url" ? (
          <input
            className="input flex-1 !border-transparent !bg-transparent !text-base"
            placeholder="Coloque o URL do seu vídeo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
          />
        ) : (
          <input className="input flex-1 !border-transparent !bg-transparent !text-sm" type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        )}
        <button className="btn-primary whitespace-nowrap !px-6" disabled={loading || (mode === "url" && isPlatformPage(url) && !isDirectVideoUrl(url))} title={mode === "url" && isPlatformPage(url) && !isDirectVideoUrl(url) ? "Link de plataforma protegida: carregue o ficheiro ou use um URL directo" : undefined}>
          {loading ? <Spinner /> : <Sparkles size={17} />}
          {authenticated ? "Analisar vídeo" : "Começar grátis"}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>
      {error && <div className="px-3 pb-3"><Alert tone="error">{error}</Alert></div>}
      {mode === "url" && isYoutubeUrl(url) && (yt || ytLoading) && (
        <div className="mx-3 mb-3 flex items-center gap-3 rounded-xl border p-3 text-left" style={{ borderColor: "var(--border)" }}>
          {yt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={yt.miniatura} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover" />
          ) : <div className="h-14 w-24 shrink-0 animate-pulse rounded-lg bg-slate-300/30" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{yt?.titulo ?? "A identificar vídeo…"}</p>
            <p className="text-[11px] muted">{yt?.autor ?? "YouTube"}</p>
            <p className="mt-1 text-[11px] muted">Encontrámos o vídeo. Carregue o ficheiro para garantir o processamento — é só arrastar e largar. Use apenas conteúdos que possui ou tem licença para processar.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button className="btn-primary !px-3 !py-2 !text-xs" onClick={async () => {
              if (!authenticated) { router.push("/registar?next=/dashboard"); return; }
              setLoading(true); setError("");
              try {
                const r = await post<{ project: { id: string } }>("/api/sources/youtube/import", { url });
                router.push(`/projecto/${r.project.id}`);
              } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
            }} disabled={loading}>{loading ? <Spinner /> : "Tentar importar"}</button>
            <button className="btn-ghost !px-3 !py-1 !text-[10px]" onClick={() => setMode("file")}>Carregar ficheiro</button>
          </div>
        </div>
      )}
      {mode === "url" && isPlatformPage(url) && !isYoutubeUrl(url) && (
        <div className="px-3 pb-3">
          <Alert>
            Esse link é de uma plataforma que exige extracção/autenticação — não contornamos protecções.
            Carregue o ficheiro ou use um <strong>URL directo</strong> para o vídeo (.mp4, .webm, .mov) do seu alojamento/CDN.
            {" "}<button className="font-bold text-blue-500 underline" onClick={() => setMode("file")}>Carregar ficheiro</button>
          </Alert>
        </div>
      )}
      <p className="px-3 pb-2 text-center text-[11px] muted">
        Apenas URLs directos de vídeo e ficheiros autorizados. Não contornamos protecções de plataformas externas.
        {!authenticated && <> <Link href="/login" className="text-blue-500 underline">Já tem conta?</Link></>}
      </p>
    </div>
  );
}

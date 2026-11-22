"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Link2, Upload, Radio } from "lucide-react";
import { post } from "@/lib/client/api";
import { Alert, Spinner } from "@/components/ui";
import { isPlatformPage, isYoutubeUrl, isDirectVideoUrl } from "@/lib/client/source-url";
import { uploadDirecto } from "@/lib/client/upload";

export function NewProjectBox() {
  const router = useRouter();
  const [mode, setMode] = useState<"url" | "file" | "live">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [liveUrl, setLiveUrl] = useState("");
  const [segundos, setSegundos] = useState(60);
  const [liveValida, setLiveValida] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [yt, setYt] = useState<{ titulo: string; autor: string; miniatura: string } | null>(null);
  const [ytLoading, setYtLoading] = useState(false);

  useEffect(() => {
    if (mode !== "live" || !liveUrl) { setLiveValida(false); return; }
    let cancelado = false;
    const t = setTimeout(() => {
      post<{ valida: boolean }>("/api/live/validar", { url: liveUrl })
        .then((r) => { if (!cancelado) setLiveValida(r.valida); })
        .catch(() => { if (!cancelado) setLiveValida(false); });
    }, 600);
    return () => { cancelado = true; clearTimeout(t); };
  }, [liveUrl, mode]);

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
    e.preventDefault(); setError(""); setLoading(true);
    try {
      let data: { project: { id: string } };
      if (mode === "file") {
        const caminho = await uploadDirecto(file!);
        data = await post("/api/projects", {
          sourceType: "upload", remotePath: caminho, fileName: file!.name, size: file!.size,
        });
      } else if (mode === "live") {
        data = await post("/api/projects", { sourceType: "live", url: liveUrl, captureSeconds: segundos });
      } else {
        data = await post("/api/projects", { sourceType: "url", url });
      }
      router.push(`/projecto/${data.project.id}`);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Novo projecto</h2>
          <p className="text-xs muted">Cole um URL directo de vídeo ou carregue um ficheiro.</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setMode("url")} className={`btn ${mode === "url" ? "btn-primary" : "btn-ghost"} !px-3 !py-1.5 !text-xs`}><Link2 size={14} /> URL</button>
          <button onClick={() => setMode("file")} className={`btn ${mode === "file" ? "btn-primary" : "btn-ghost"} !px-3 !py-1.5 !text-xs`}><Upload size={14} /> Ficheiro</button>
          <button onClick={() => setMode("live")} className={`btn ${mode === "live" ? "btn-primary" : "btn-ghost"} !px-3 !py-1.5 !text-xs`}><Radio size={14} /> Live</button>
        </div>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        {mode === "url" ? (
          <input className="input flex-1" placeholder="Coloque o URL do seu vídeo" value={url} onChange={(e) => setUrl(e.target.value)} />
        ) : mode === "live" ? (
          <>
            <input className="input flex-1" placeholder="URL da live HLS (.m3u8)" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} />
            <select className="input !w-32" value={segundos} onChange={(e) => setSegundos(Number(e.target.value))}>
              <option value={30}>30 segundos</option><option value={60}>60 segundos</option>
              <option value={120}>2 minutos</option><option value={300}>5 minutos</option>
            </select>
          </>
        ) : (
          <input className="input flex-1" type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        )}
        <button className="btn-primary" disabled={loading || (mode === "live" && !liveValida) || (mode === "url" && isPlatformPage(url) && !isDirectVideoUrl(url))}>{loading ? <Spinner /> : <Sparkles size={16} />} {mode === "live" ? "Capturar live" : "Importar vídeo"}</button>
      </form>
      {mode === "live" && (
        <p className="mt-2 text-[11px] muted">
          {liveValida ? "✓ Live HLS detectada. O worker vai capturar o trecho escolhido e gerar os cortes." : "Use o URL da sua própria live HLS (.m3u8). Não extraímos streams de plataformas protegidas."}
        </p>
      )}
      {error && <div className="mt-3"><Alert tone="error">{error}</Alert></div>}
      {mode === "url" && isYoutubeUrl(url) && (yt || ytLoading) && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border p-3 text-left" style={{ borderColor: "var(--border)" }}>
          {yt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={yt.miniatura} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover" />
          ) : <div className="h-14 w-24 shrink-0 animate-pulse rounded-lg bg-slate-300/30" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{yt?.titulo ?? "A identificar vídeo…"}</p>
            <p className="text-[11px] muted">{yt?.autor ?? "YouTube"} · carregue o ficheiro para processar</p>
          </div>
          <button className="btn-primary shrink-0 !px-3 !py-2 !text-xs" onClick={() => setMode("file")}>Carregar ficheiro</button>
        </div>
      )}
      {mode === "url" && isPlatformPage(url) && !isYoutubeUrl(url) && (
        <div className="mt-3">
          <Alert>
            Link de plataforma protegida: use o carregamento de ficheiro ou um URL directo (.mp4/.webm/.mov) do seu alojamento.
            {" "}<button className="font-bold text-blue-500 underline" onClick={() => setMode("file")}>Carregar ficheiro</button>
          </Alert>
        </div>
      )}
    </div>
  );
}

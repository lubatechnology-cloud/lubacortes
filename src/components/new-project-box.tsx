"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Link2, Upload } from "lucide-react";
import { post } from "@/lib/client/api";
import { Alert, Spinner } from "@/components/ui";
import { isPlatformPage, isYoutubeUrl } from "@/lib/client/source-url";

export function NewProjectBox() {
  const router = useRouter();
  const [mode, setMode] = useState<"url" | "file">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
    e.preventDefault(); setError(""); setLoading(true);
    try {
      let data: { project: { id: string } };
      if (mode === "file") {
        const fd = new FormData();
        fd.append("file", file!);
        const res = await fetch("/api/projects", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error?.message ?? "Falha.");
        data = json.data;
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
        </div>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        {mode === "url" ? (
          <input className="input flex-1" placeholder="Coloque o URL do seu vídeo" value={url} onChange={(e) => setUrl(e.target.value)} />
        ) : (
          <input className="input flex-1" type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        )}
        <button className="btn-primary" disabled={loading}>{loading ? <Spinner /> : <Sparkles size={16} />} Importar vídeo</button>
      </form>
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

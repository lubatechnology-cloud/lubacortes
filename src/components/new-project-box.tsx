"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Link2, Upload } from "lucide-react";
import { post } from "@/lib/client/api";
import { Alert, Spinner } from "@/components/ui";

export function NewProjectBox() {
  const router = useRouter();
  const [mode, setMode] = useState<"url" | "file">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    </div>
  );
}

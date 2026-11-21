"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight, Upload, Link2 } from "lucide-react";
import { post } from "@/lib/client/api";
import { Alert, Spinner } from "@/components/ui";
import { isPlatformPage } from "@/lib/client/source-url";

export function HeroForm({ authenticated }: { authenticated: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"url" | "file">("url");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        const fd = new FormData();
        fd.append("file", file!);
        const res = await fetch("/api/projects", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error?.message ?? "Falha ao carregar.");
        data = json.data;
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
        <button className="btn-primary whitespace-nowrap !px-6" disabled={loading}>
          {loading ? <Spinner /> : <Sparkles size={17} />}
          {authenticated ? "Analisar vídeo" : "Começar grátis"}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>
      {error && <div className="px-3 pb-3"><Alert tone="error">{error}</Alert></div>}
      {mode === "url" && isPlatformPage(url) && (
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { Alert, EmptyState, Spinner, StatusBadge } from "@/components/ui";
import { Download, Lock, Unlock, Clock, Play } from "lucide-react";
import { ClipPlayer } from "@/components/clip-player";

type Clip = {
  id: string; title: string; duration: number; format: string; subtitle_lang: string;
  status: string; is_unlocked: number; unlock_kind: string | null; canDownload: boolean;
  project_id: string; created_at: string;
};

export default function LibraryPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  useEffect(() => {
    api<{ clips: Clip[] }>("/api/library")
      .then((r) => setClips(r.clips))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  if (error) return <Alert tone="error">{error}</Alert>;
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Biblioteca de cortes</h1>
      <p className="mb-6 text-sm muted">Os seus cortes gerados. Downloads disponíveis apenas para cortes desbloqueados.</p>
      {clips.length === 0 ? <EmptyState title="Biblioteca vazia" description="Os cortes gerados aparecerão aqui." action={<Link href="/dashboard" className="btn-primary">Novo projecto</Link>} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((c) => (
            <div key={c.id} className="card overflow-hidden">
              <div className="relative aspect-[9/16] max-h-56 bg-gradient-to-br from-blue-900 to-blue-600">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/clips/${c.id}/thumbnail`} alt="" className={`h-full w-full object-cover ${c.canDownload ? "" : "blur-sm scale-105"}`} />
                {c.status === "ready" && (
                  <button className="absolute inset-0 grid place-items-center bg-black/25 transition hover:bg-black/10" onClick={() => setPlayerId(c.id)} aria-label={`Reproduzir ${c.title}`}>
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-slate-900 shadow-lg"><Play size={18} fill="currentColor" /></span>
                  </button>
                )}
                {!c.canDownload && <span className="pointer-events-none absolute bottom-2 left-2 badge bg-black/60 text-white"><Lock size={12} /> PRÉ-VISUALIZAÇÃO</span>}
              </div>
              <div className="p-4">
                <h3 className="truncate text-sm font-bold">{c.title}</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] muted">
                  <span className="flex items-center gap-1"><Clock size={12} /> {Math.round(c.duration)}s</span>
                  <span>{c.format}</span><span>{c.subtitle_lang}</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <StatusBadge status={c.status} />
                  {c.status === "ready" && <button onClick={() => setPlayerId(c.id)} className="btn-ghost !px-3 !py-1.5 !text-xs"><Play size={13} /> Ver</button>}
                  {c.canDownload ? (
                    <a href={`/api/clips/${c.id}/download`} className="btn-primary !px-3 !py-1.5 !text-xs"><Download size={14} /> Descarregar</a>
                  ) : (
                    <Link href={`/projecto/${c.project_id}`} className="btn-ghost !px-3 !py-1.5 !text-xs"><Unlock size={14} /> Desbloquear</Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {playerId && clips.some((c) => c.id === playerId) && (
        <ClipPlayer
          clips={clips.filter((c) => c.status === "ready").map((c) => ({ id: c.id, title: c.title, duration: c.duration, is_unlocked: c.canDownload ? 1 : 0 }))}
          index={clips.filter((c) => c.status === "ready").findIndex((c) => c.id === playerId)}
          onIndex={(i) => setPlayerId(clips.filter((c) => c.status === "ready")[i].id)}
          onClose={() => setPlayerId(null)}
        />
      )}
    </div>
  );
}

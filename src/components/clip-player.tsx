"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Download, Lock, X } from "lucide-react";

export type PlayerClip = { id: string; title: string; duration: number; is_unlocked: number };

export function ClipPlayer({
  clips, index, onIndex, onClose,
}: {
  clips: PlayerClip[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const clip = clips[index];

  const mudar = useCallback((delta: number) => {
    const proximo = index + delta;
    if (proximo >= 0 && proximo < clips.length) onIndex(proximo);
  }, [clips.length, index, onIndex]);

  useEffect(() => {
    const v = video.current;
    if (v) { v.load(); void v.play().catch(() => {}); }
  }, [clip?.id]);

  useEffect(() => {
    function teclado(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") mudar(1);
      if (e.key === "ArrowLeft") mudar(-1);
    }
    window.addEventListener("keydown", teclado);
    return () => window.removeEventListener("keydown", teclado);
  }, [mudar, onClose]);

  if (!clip) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 p-3 sm:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold sm:text-base">{clip.title}</p>
          <p className="text-[11px] text-white/60">Pré-visualização {index + 1} de {clips.length} · {Math.round(clip.duration)}s</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {clip.is_unlocked ? (
            <a className="btn-primary !px-3 !py-2 !text-xs" href={`/api/clips/${clip.id}/download`}><Download size={14} /> Descarregar</a>
          ) : (
            <span className="badge bg-white/10 text-white/80"><Lock size={12} /> Pré-visualização</span>
          )}
          <button className="btn-ghost !px-2 !py-2 !text-white" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>
      </div>

      <div className="mx-auto mt-3 flex min-h-0 flex-1 items-center justify-center gap-2 sm:gap-4">
        <button className="btn-ghost !px-2 !py-3 !text-white disabled:opacity-30" onClick={() => mudar(-1)} disabled={index === 0} aria-label="Corte anterior">
          <ChevronLeft size={24} />
        </button>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={video}
          key={clip.id}
          className="max-h-full max-w-full rounded-xl bg-black shadow-2xl"
          style={{ aspectRatio: "9 / 16", height: "min(78vh, 900px)" }}
          src={`/api/clips/${clip.id}/preview`}
          poster={`/api/clips/${clip.id}/thumbnail`}
          controls
          playsInline
          preload="metadata"
        />
        <button className="btn-ghost !px-2 !py-3 !text-white disabled:opacity-30" onClick={() => mudar(1)} disabled={index === clips.length - 1} aria-label="Corte seguinte">
          <ChevronRight size={24} />
        </button>
      </div>
      <p className="mx-auto mt-2 text-center text-[11px] text-white/50">Use as setas para navegar · Esc para fechar</p>
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { ApiError, fail } from "@/lib/http";
import { readStorage, statStorage } from "@/lib/storage";
import { descarregarRemoto } from "@/lib/storage-remote";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
type Clip = {
  id: string; title: string; storage_path: string | null; remote_path: string | null; status: string;
};

async function carregar(clip: Clip): Promise<Buffer | null> {
  const stat = clip.storage_path ? statStorage(clip.storage_path) : null;
  if (stat && clip.storage_path) return readStorage(clip.storage_path);
  if (clip.remote_path) return descarregarRemoto(clip.remote_path);
  return null;
}

/** Reprodução interna: qualquer corte pronto do próprio utilizador pode ser visto. */
export async function GET(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const clip = get<Clip>("SELECT id,title,storage_path,remote_path,status FROM clips WHERE id=? AND user_id=?", id, user.id);
    if (!clip || clip.status !== "ready") throw new ApiError(404, "Corte não encontrado ou ainda não está pronto.", "not_found");
    const dados = await carregar(clip);
    if (!dados) throw new ApiError(404, "Ficheiro não encontrado.", "file_missing");

    const total = dados.length;
    const range = req.headers.get("range");
    const cabecalhos: Record<string, string> = {
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    };
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (m) {
        const ini = m[1] ? Number(m[1]) : 0;
        const fim = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
        if (ini > fim || ini >= total) {
          return new Response(null, { status: 416, headers: { ...cabecalhos, "Content-Range": `bytes */${total}` } });
        }
        return new Response(new Uint8Array(dados.subarray(ini, fim + 1)), {
          status: 206,
          headers: {
            ...cabecalhos,
            "Content-Range": `bytes ${ini}-${fim}/${total}`,
            "Content-Length": String(fim - ini + 1),
          },
        });
      }
    }
    return new Response(new Uint8Array(dados), { headers: { ...cabecalhos, "Content-Length": String(total) } });
  } catch (e) {
    return fail(e);
  }
}

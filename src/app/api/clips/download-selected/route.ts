import { z } from "zod";
import { zipSync } from "fflate";
import { requireUser } from "@/lib/auth";
import { ApiError, fail, readJson } from "@/lib/http";
import { canDownload } from "@/lib/services/entitlements";
import { readStorage, statStorage } from "@/lib/storage";
import { descarregarRemoto } from "@/lib/storage-remote";

export const dynamic = "force-dynamic";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1).max(24) });

/** Descarrega vários cortes desbloqueados num único ZIP. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { ids } = schema.parse(await readJson(req));
    const unicos = [...new Set(ids)];
    const bloqueados: string[] = [];
    const ficheiros: Record<string, Uint8Array> = {};

    for (const [i, id] of unicos.entries()) {
      const clip = canDownload(user.id, id);
      if (!clip) { bloqueados.push(id); continue; }
      let dados: Buffer | null = null;
      const stat = clip.storage_path ? statStorage(clip.storage_path) : null;
      if (stat && clip.storage_path) dados = readStorage(clip.storage_path);
      if (!dados && clip.remote_path) dados = await descarregarRemoto(clip.remote_path);
      if (!dados) throw new ApiError(404, `Ficheiro do corte ${id} não encontrado.`, "file_missing");
      const titulo = String(clip.title).replace(/[^\p{L}\p{N} -]/gu, "").slice(0, 48) || "corte";
      ficheiros[`${String(i + 1).padStart(2, "0")}-${titulo}.mp4`] = new Uint8Array(dados);
    }

    if (bloqueados.length) {
      throw new ApiError(402, `${bloqueados.length} corte(s) ainda não estão desbloqueados.`, "locked_selected");
    }
    if (!Object.keys(ficheiros).length) throw new ApiError(400, "Nenhum corte seleccionado.", "empty_selection");

    const zip = zipSync(ficheiros, { level: 1 });
    return new Response(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="lubacortes-cortes.zip"`,
        "Content-Length": String(zip.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}

import { requireUser } from "@/lib/auth";
import { ApiError, fail } from "@/lib/http";
import { canDownload } from "@/lib/services/entitlements";
import { readStorage, statStorage } from "@/lib/storage";
import { descarregarRemoto } from "@/lib/storage-remote";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Serviço de download protegido: o ficheiro nunca fica exposto em /public. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const clip = canDownload(user.id, id);
    if (!clip) throw new ApiError(403, "Este corte não está desbloqueado.", "locked");
    let data: Buffer | null = null;
    let tamanho = 0;
    const stat = clip.storage_path ? statStorage(clip.storage_path) : null;
    if (stat && clip.storage_path) { data = readStorage(clip.storage_path); tamanho = stat.size; }
    if (!data && clip.remote_path) {
      data = await descarregarRemoto(clip.remote_path);
      tamanho = data?.length ?? 0;
    }
    if (!data) throw new ApiError(404, "Ficheiro não encontrado.", "file_missing");
    const title = String(clip.title).replace(/[^\p{L}\p{N} -]/gu, "").slice(0, 60) || "corte";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(tamanho),
        "Content-Disposition": `attachment; filename="lubacortes-${title}.mp4"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return fail(e);
  }
}

import { requireUser } from "@/lib/auth";
import { ApiError, fail } from "@/lib/http";
import { canDownload } from "@/lib/services/entitlements";
import { readStorage, statStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Serviço de download protegido: o ficheiro nunca fica exposto em /public. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const clip = canDownload(user.id, id);
    if (!clip || !clip.storage_path) throw new ApiError(403, "Este corte não está desbloqueado.", "locked");
    const stat = statStorage(clip.storage_path);
    if (!stat) throw new ApiError(404, "Ficheiro não encontrado.", "file_missing");
    const data = readStorage(clip.storage_path);
    const title = String(clip.title).replace(/[^\p{L}\p{N} -]/gu, "").slice(0, 60) || "corte";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="lubacortes-${title}.mp4"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return fail(e);
  }
}

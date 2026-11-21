import { requireUser } from "@/lib/auth";
import { readStorage, statStorage } from "@/lib/storage";
import { getProject } from "@/lib/services/projects";
import { ApiError, fail } from "@/lib/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const project = getProject(user.id, id);
    if (!project?.thumbnail_path || !statStorage(project.thumbnail_path)) throw new ApiError(404, "Miniatura indisponível.", "not_found");
    return new Response(new Uint8Array(readStorage(project.thumbnail_path)), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store" },
    });
  } catch (e) { return fail(e); }
}

import { requireUser } from "@/lib/auth";
import { all, get } from "@/lib/db";
import { ApiError, fail, ok } from "@/lib/http";
import { deleteProject, getProject } from "@/lib/services/projects";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const project = getProject(user.id, id);
    if (!project) throw new ApiError(404, "Projecto não encontrado.", "not_found");
    const moments = all("SELECT id,start_sec,end_sec,title,description,reason,score,category,emocao,intensidade FROM moments WHERE project_id=? ORDER BY score DESC", id);
    const clips = all("SELECT * FROM clips WHERE project_id=? AND user_id=? ORDER BY start_sec ASC", id, user.id);
    const jobs = all("SELECT id,type,status,progress,stage,error,payload_json,created_at,updated_at FROM jobs WHERE project_id=? AND user_id=? ORDER BY created_at DESC", id, user.id)
      .map((j) => {
        let payload: Record<string, unknown> = {};
        try { payload = JSON.parse(String(j.payload_json || "{}")); } catch { /* ignorar */ }
        const { payload_json, ...rest } = j;
        return { ...rest, payload };
      });
    return ok({ project, moments, clips, jobs });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    deleteProject(user.id, id);
    return ok({ deleted: true });
  } catch (e) {
    return fail(e);
  }
}

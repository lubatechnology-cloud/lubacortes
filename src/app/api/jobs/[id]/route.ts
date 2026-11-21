import { requireUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { ApiError, fail, ok } from "@/lib/http";
import { publicJob, type Job } from "@/lib/queue";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const job = get<Job>("SELECT * FROM jobs WHERE id=? AND user_id=?", id, user.id);
    if (!job) throw new ApiError(404, "Tarefa não encontrada.", "not_found");
    return ok({ job: publicJob(job) });
  } catch (e) {
    return fail(e);
  }
}

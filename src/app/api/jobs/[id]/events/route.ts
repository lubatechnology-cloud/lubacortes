import { requireUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { ApiError, fail } from "@/lib/http";
import type { Job } from "@/lib/queue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const job = get<Job>("SELECT * FROM jobs WHERE id=? AND user_id=?", id, user.id);
    if (!job) throw new ApiError(404, "Tarefa não encontrada.", "not_found");

    const encoder = new TextEncoder();
    let timer: ReturnType<typeof setInterval> | undefined;
    const stream = new ReadableStream({
      start(controller) {
        const enviar = () => {
          const atual = get<Job>("SELECT * FROM jobs WHERE id=? AND user_id=?", id, user.id);
          if (!atual) { controller.close(); if (timer) clearInterval(timer); return; }
          const Terminal = ["succeeded", "failed", "cancelled"].includes(atual.status);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: atual.status, progress: atual.progress, stage: atual.stage, error: atual.error, terminal: Terminal,
          })}\n\n`));
          if (Terminal) { controller.close(); if (timer) clearInterval(timer); }
        };
        enviar();
        timer = setInterval(enviar, 1000);
        req.signal.addEventListener("abort", () => { if (timer) clearInterval(timer); try { controller.close(); } catch {} });
      },
      cancel() { if (timer) clearInterval(timer); },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (e) { return fail(e); }
}

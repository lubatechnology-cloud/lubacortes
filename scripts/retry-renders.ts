/** Utilitário: volta a colocar na fila tarefas de renderização falhadas. */
import { all, run } from "../src/lib/db";
import { enqueue, type Job } from "../src/lib/queue";

const jobs = all<Job>("SELECT * FROM jobs WHERE type='render' AND status IN ('failed','cancelled')");
const seen = new Set<string>();
for (const job of jobs) {
  const payload = JSON.parse(job.payload_json) as Record<string, unknown>;
  const clipId = String(payload.clipId ?? "");
  if (seen.has(clipId)) continue;
  seen.add(clipId);
  run("UPDATE jobs SET status='cancelled' WHERE id=?", job.id);
  enqueue("render", payload, job.user_id, job.project_id ?? undefined);
  console.log("Reagendado:", job.id, "clip:", clipId);
}

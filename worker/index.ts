import { config } from "../src/lib/config";
import { getDb, nowIso, uid } from "../src/lib/db";
import { claim, complete, failJob, progress, recoverStaleJobs, type Job } from "../src/lib/queue";
import { runAnalyzeJob } from "../src/lib/services/analysis";
import { runRenderJob } from "../src/lib/services/rendering";
import { expireOldPayments } from "../src/lib/services/payments";
import { processDuePublications } from "../src/lib/services/publications";

const workerId = `worker_${process.pid}_${uid("")}`;
let running = true;
let active: Job | null = null;

process.on("SIGINT", () => (running = false));
process.on("SIGTERM", () => (running = false));

async function dispatch(job: Job) {
  switch (job.type) {
    case "analyze":
      return runAnalyzeJob(job);
    case "render":
      return runRenderJob(job);
    case "translate":
      return { skipped: true };
  }
}

async function main() {
  getDb(); // inicializa esquema
  const recovered = recoverStaleJobs(workerId);
  console.log(`[worker] ${workerId} iniciado. ${recovered} tarefa(s) recuperadas.`);
  let lastExpire = 0;

  while (running) {
    try {
      const job = claim(workerId);
      if (!job) {
        await new Promise((r) => setTimeout(r, 1000));
        if (Date.now() - lastExpire > 60_000) {
          expireOldPayments();
          processDuePublications(); // sempre em modo TESTE
          lastExpire = Date.now();
        }
        continue;
      }
      active = job;
      console.log(`[worker] ▶ ${job.type} ${job.id} (tentativa ${job.attempts})`);
      try {
        const result = await dispatch(job);
        complete(job.id, result);
        console.log(`[worker] ✔ ${job.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[worker] ✘ ${job.id}: ${message}`);
        progress(job.id, 0, "erro");
        failJob(job.id, message, job.project_id, job.user_id);
      } finally {
        active = null;
      }
    } catch (err) {
      console.error("[worker] erro no ciclo:", err);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.log(`[worker] ${workerId} encerrado.`, nowIso(), "concorrência:", config.workerConcurrency);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

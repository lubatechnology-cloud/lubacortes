import { config } from "../src/lib/config";
import { getDb, nowIso, uid } from "../src/lib/db";
import { claim, complete, failJob, progress, recoverStaleJobs, type Job } from "../src/lib/queue";
import { runAnalyzeJob } from "../src/lib/services/analysis";
import { runRenderJob } from "../src/lib/services/rendering";
import { expireOldPayments } from "../src/lib/services/payments";
import { processDuePublications } from "../src/lib/services/publications";
import { notificarSePronto } from "../src/lib/services/notifications";

const workerId = `gha_${process.pid}_${uid("")}`;
const MAX_JOBS = Number(process.env.GHA_MAX_JOBS || 8);

async function dispatch(job: Job) {
  switch (job.type) {
    case "analyze": return runAnalyzeJob(job);
    case "render": return runRenderJob(job);
    case "translate": return { skipped: true };
  }
}

async function main() {
  getDb();
  recoverStaleJobs(workerId);
  expireOldPayments();
  processDuePublications();
  let processed = 0;
  console.log(`[gha-worker] limite=${MAX_JOBS}`);
  for (let i = 0; i < MAX_JOBS; i++) {
    const job = claim(workerId);
    if (!job) break;
    processed++;
    console.log(`[gha-worker] ▶ ${job.type} ${job.id}`);
    try {
      const result = await dispatch(job);
      complete(job.id, result);
      if (job.project_id) {
        try { await notificarSePronto(job.user_id, job.project_id); } catch { /* ignorar */ }
      }
      console.log(`[gha-worker] ✔ ${job.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      progress(job.id, 0, "erro");
      failJob(job.id, msg, job.project_id, job.user_id);
      console.error(`[gha-worker] ✘ ${job.id}: ${msg.slice(0, 300)}`);
    }
  }
  console.log(`[gha-worker] processadas=${processed} em ${nowIso()} (concorrência=${config.workerConcurrency})`);
}

main().catch((e) => { console.error(e); process.exit(1); });

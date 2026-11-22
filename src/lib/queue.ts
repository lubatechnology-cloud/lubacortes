import { all, get, getDb, nowIso, run, uid } from "./db";

export type JobType = "analyze" | "render" | "translate";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type Job = {
  id: string;
  user_id: string;
  project_id: string | null;
  type: JobType;
  status: JobStatus;
  progress: number;
  priority: number;
  stage: string | null;
  attempts: number;
  max_attempts: number;
  payload_json: string;
  result_json: string | null;
  error: string | null;
  run_after: string;
  created_at: string;
  updated_at: string;
};

export function enqueue(
  type: JobType,
  payload: Record<string, unknown>,
  userId: string,
  projectId?: string,
  priority = 0,
): string {
  const id = uid("job_");
  const now = nowIso();
  run(
    "INSERT INTO jobs (id, user_id, project_id, type, status, priority, payload_json, run_after, created_at, updated_at) VALUES (?,?,?,?, 'queued', ?, ?, ?, ?, ?)",
    id,
    userId,
    projectId ?? null,
    type,
    priority,
    JSON.stringify(payload),
    now,
    now,
    now,
  );
  return id;
}

export function claim(workerId: string): Job | null {
  const db = getDb();
  const tx = db.transaction(() => {
    const now = nowIso();
    const row = get<Job>(
      "SELECT * FROM jobs WHERE status = 'queued' AND run_after <= ? ORDER BY priority DESC, created_at ASC LIMIT 1",
      now,
    );
    if (!row) return null;
    run(
      "UPDATE jobs SET status='running', attempts=attempts+1, locked_at=?, locked_by=?, updated_at=? WHERE id=?",
      now,
      workerId,
      now,
      row.id,
    );
    return { ...row, status: "running" as const, attempts: row.attempts + 1 };
  });
  return tx();
}

export function progress(jobId: string, pct: number, stage?: string) {
  run(
    "UPDATE jobs SET progress=?, stage=COALESCE(?, stage), updated_at=? WHERE id=?",
    Math.max(0, Math.min(100, Math.round(pct))),
    stage ?? null,
    nowIso(),
    jobId,
  );
}

export function complete(jobId: string, result: Record<string, unknown>) {
  const now = nowIso();
  run(
    "UPDATE jobs SET status='succeeded', progress=100, stage='concluido', result_json=?, updated_at=?, finished_at=? WHERE id=?",
    JSON.stringify(result),
    now,
    now,
    jobId,
  );
}

export function failJob(jobId: string, error: string, projectId?: string | null, userId?: string) {
  const now = nowIso();
  const job = get<Job>("SELECT * FROM jobs WHERE id = ?", jobId);
  if (!job) return;
  run(
    "INSERT INTO processing_errors (id, job_id, project_id, user_id, message, created_at) VALUES (?,?,?,?,?,?)",
    uid("err_"),
    jobId,
    projectId ?? job.project_id,
    userId ?? job.user_id,
    error.slice(0, 4000),
    now,
  );
  if (job.attempts < job.max_attempts) {
    // Retentativa com espera exponencial curta; volta a 'queued' (retomável).
    const delay = Math.min(60_000, 2000 * 2 ** (job.attempts - 1));
    run(
      "UPDATE jobs SET status='queued', error=?, run_after=?, locked_at=NULL, locked_by=NULL, updated_at=? WHERE id=?",
      error.slice(0, 4000),
      new Date(Date.now() + delay).toISOString(),
      now,
      jobId,
    );
  } else {
    run(
      "UPDATE jobs SET status='failed', error=?, locked_at=NULL, locked_by=NULL, updated_at=?, finished_at=? WHERE id=?",
      error.slice(0, 4000),
      now,
      now,
      jobId,
    );
    if (job.type === "analyze" && job.project_id) {
      run("UPDATE projects SET status='failed', error=?, updated_at=? WHERE id=?", error.slice(0, 4000), now, job.project_id);
    }
    if (job.type === "render") {
      const payload = JSON.parse(job.payload_json || "{}") as { clipId?: string };
      if (payload.clipId) {
        run("UPDATE clips SET status='failed', error=?, updated_at=? WHERE id=?", error.slice(0, 4000), now, payload.clipId);
      }
    }
  }
}

/** No arranque, trabalhos órfãos (worker morto) voltam à fila — retomabilidade. */
export function recoverStaleJobs(workerId: string) {
  const rows = allJobIds();
  for (const id of rows) {
    run(
      "UPDATE jobs SET status='queued', locked_at=NULL, locked_by=?, updated_at=? WHERE id=?",
      workerId,
      nowIso(),
      id,
    );
  }
  return rows.length;
}

function allJobIds(): string[] {
  return all<{ id: string }>("SELECT id FROM jobs WHERE status='running'").map((r) => r.id);
}

export function publicJob(job: Job) {
  let payload: Record<string, unknown> = {};
  let result: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(job.payload_json);
    result = job.result_json ? JSON.parse(job.result_json) : null;
  } catch {
    /* ignorar */
  }
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    attempts: job.attempts,
    error: job.error,
    payload,
    result,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  };
}

import { enqueue } from "../src/lib/queue";
import { run } from "../src/lib/db";

const projectId = process.argv[2];
if (!projectId) throw new Error("Uso: retry-project.ts <projectId>");
run("UPDATE projects SET status='analyzing', error=NULL WHERE id=?", projectId);
const jobId = enqueue("analyze", {
  projectId,
  subtitleLang: "pt",
  formatId: "reels",
  style: {},
}, "usr_658ace67-ddc3-44c3-95ff-6b0753c84b39", projectId, 2);
console.log(jobId);

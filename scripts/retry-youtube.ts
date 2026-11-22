import { all, run, get } from "../src/lib/db";
import { enqueue } from "../src/lib/queue";

const projectId = process.argv[2];
if (!projectId) throw new Error("Uso: retry-youtube.ts <projectId>");
const projeto = get<{ source_url: string | null; user_id: string }>("SELECT source_url,user_id FROM projects WHERE id=?", projectId);
if (!projeto?.source_url) throw new Error("Projecto sem source_url");
run("UPDATE projects SET status='importing', error=NULL WHERE id=?", projectId);
const jobId = enqueue("analyze", {
  projectId, youtubeUrl: projeto.source_url, subtitleLang: "pt", formatId: "reels", style: {},
}, projeto.user_id, projectId, 2);
console.log(jobId);

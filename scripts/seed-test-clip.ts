import { run, nowIso } from "../src/lib/db";

const id = "clip_teste_ia_001";
const n = nowIso();
run(
  `INSERT INTO clips (id,project_id,user_id,title,description,start_sec,end_sec,duration,format,subtitle_lang,style_json,status,created_at,updated_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,'ready',?,?)
   ON CONFLICT(id) DO NOTHING`,
  id, "prj_37b846b5-ed71-4d4d-9cf9-3b8f48660ec1", "usr_658ace67-ddc3-44c3-95ff-6b0753c84b39",
  "Teste IA", "Corte de teste", 0, 10, 10, "reels", "pt", "{}", n, n,
);
console.log("clip", id);

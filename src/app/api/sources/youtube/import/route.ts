import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { get, nowIso, run, uid } from "@/lib/db";
import { fail, ok, readJson } from "@/lib/http";
import { enqueue } from "@/lib/queue";
import { infoYouTube } from "@/lib/video/youtube";
import { featuresForUser } from "@/lib/billing";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { url } = z.object({ url: z.string().trim().url() }).parse(await readJson(req));
    const info = await infoYouTube(url);
    const id = uid("prj_");
    const now = nowIso();
    run(
      "INSERT INTO projects (id,user_id,title,source_type,source_url,status,created_at,updated_at) VALUES (?,?,?,'url',?,'importing',?,?)",
      id, user.id, info.titulo, url, now, now,
    );
    const jobId = enqueue("analyze", {
      projectId: id,
      youtubeUrl: url,
      subtitleLang: "pt",
      formatId: "reels",
      style: {},
    }, user.id, id, featuresForUser(user.id).priority);
    return ok({ project: get("SELECT * FROM projects WHERE id=?", id), jobId }, 202);
  } catch (e) { return fail(e); }
}

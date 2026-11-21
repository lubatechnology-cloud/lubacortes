import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { all, get, getDb, nowIso, run, uid } from "@/lib/db";
import { ApiError, fail, ok, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  segments: z.array(z.object({
    start: z.number().min(0),
    end: z.number().min(0),
    text: z.string().max(500),
  })).max(500).optional(),
  style: z.record(z.unknown()).optional(),
  focus: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).nullable().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const clip = get<Record<string, unknown>>("SELECT * FROM clips WHERE id=? AND user_id=?", id, user.id);
    if (!clip) throw new ApiError(404, "Corte não encontrado.", "not_found");
    const segments = all(
      "SELECT idx,start_sec,end_sec,source_text,display_text FROM subtitle_segments WHERE clip_id=? ORDER BY idx",
      id,
    );
    return ok({
      clip: {
        id: clip.id, title: clip.title, description: clip.description,
        hashtags: clip.hashtags, cta: clip.cta, format: clip.format,
        subtitleLang: clip.subtitle_lang, status: clip.status,
        style: JSON.parse(String(clip.style_json || "{}")),
        focus: clip.focus_x !== null && clip.focus_y !== null ? { x: clip.focus_x, y: clip.focus_y } : null,
      },
      segments,
    });
  } catch (e) { return fail(e); }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = schema.parse(await readJson(req));
    const clip = get<{ id: string }>("SELECT id FROM clips WHERE id=? AND user_id=?", id, user.id);
    if (!clip) throw new ApiError(404, "Corte não encontrado.", "not_found");

    const tx = getDb().transaction(() => {
      if (body.segments) {
        run("DELETE FROM subtitle_segments WHERE clip_id=?", id);
        body.segments.forEach((s, idx) => {
          run(
            "INSERT INTO subtitle_segments (id,clip_id,idx,start_sec,end_sec,source_text,display_text,created_at) VALUES (?,?,?,?,?,?,?,?)",
            uid("sub_"), id, idx, s.start, s.end, "", s.text, nowIso(),
          );
        });
      }
      const updates: string[] = [];
      const values: unknown[] = [];
      if (body.style) { updates.push("style_json=?"); values.push(JSON.stringify(body.style)); }
      if (body.focus !== undefined) {
        updates.push("focus_x=?", "focus_y=?");
        values.push(body.focus ? body.focus.x : null, body.focus ? body.focus.y : null);
      }
      if (body.title) { updates.push("title=?"); values.push(body.title); }
      if (body.description !== undefined) { updates.push("description=?"); values.push(body.description); }
      if (updates.length) {
        updates.push("updated_at=?");
        values.push(nowIso(), id);
        run(`UPDATE clips SET ${updates.join(",")} WHERE id=?`, ...values);
      }
    });
    tx();
    return ok({ saved: true });
  } catch (e) { return fail(e); }
}

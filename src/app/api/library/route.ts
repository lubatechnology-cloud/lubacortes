import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const clips = all(
      "SELECT id, project_id, title, duration, format, subtitle_lang, status, is_unlocked, unlock_kind, created_at FROM clips WHERE user_id=? ORDER BY created_at DESC LIMIT 200",
      user.id,
    ).map((c) => ({ ...c, canDownload: Boolean(c.is_unlocked && c.status === "ready") }));
    return ok({ clips });
  } catch (e) {
    return fail(e);
  }
}

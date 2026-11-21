import { requireUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { creditBalance, hasUsedFreeClip } from "@/lib/services/entitlements";
import { featuresForUser } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const n = (sql: string, ...p: unknown[]) => Number((get<{ c: number }>(sql, ...p)?.c ?? 0));
    return ok({
      credits: creditBalance(user.id),
      freeUsed: hasUsedFreeClip(user.id),
      features: featuresForUser(user.id),
      stats: {
        projects: n("SELECT COUNT(*) c FROM projects WHERE user_id=?", user.id),
        clips: n("SELECT COUNT(*) c FROM clips WHERE user_id=?", user.id),
        unlocked: n("SELECT COUNT(*) c FROM clips WHERE user_id=? AND is_unlocked=1", user.id),
        locked: n("SELECT COUNT(*) c FROM clips WHERE user_id=? AND is_unlocked=0", user.id),
      },
      sessions: n("SELECT COUNT(*) c FROM sessions WHERE user_id=? AND revoked_at IS NULL", user.id),
    });
  } catch (e) {
    return fail(e);
  }
}

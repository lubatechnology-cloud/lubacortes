import { clientIp, requireAdmin } from "@/lib/auth";
import { all } from "@/lib/db";
import { fail, ok, readJson } from "@/lib/http";
import { savePlan } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return ok({ plans: all("SELECT * FROM plans ORDER BY sort_order") });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await readJson(req)) as Record<string, unknown>;
    return ok({ plan: savePlan(admin.id, body, clientIp(req)) }, 201);
  } catch (e) {
    return fail(e);
  }
}

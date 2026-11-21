import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { financeOverview } from "@/lib/billing";
import { all } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return ok({
      finance: financeOverview(),
      plans: all("SELECT * FROM plans ORDER BY sort_order"),
      packages: all("SELECT * FROM minute_packages ORDER BY sort_order"),
      usage: all("SELECT u.email, p.plan_id, p.input_seconds_used, p.exports_used, p.period_start, p.period_end FROM usage_periods p JOIN users u ON u.id=p.user_id ORDER BY p.period_start DESC LIMIT 100"),
      users: all("SELECT id,email,plan_id,plan_period_start,plan_period_end,plan_status,auto_renew FROM users ORDER BY created_at DESC LIMIT 200"),
    });
  } catch (e) { return fail(e); }
}

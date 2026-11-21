import { requireAdmin } from "@/lib/auth";
import { all } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { listUsers, stats } from "@/lib/services/admin";
import { financeOverview } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return ok({
      stats: stats(),
      users: listUsers(),
      payments: all("SELECT p.*, u.email FROM payments p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 100"),
      transactions: all("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100"),
      errors: all("SELECT * FROM processing_errors ORDER BY created_at DESC LIMIT 50"),
      jobs: all("SELECT id,type,status,progress,stage,error,project_id,user_id,created_at FROM jobs ORDER BY created_at DESC LIMIT 100"),
      apiUsage: all("SELECT service, operation, SUM(units) AS units, COUNT(*) AS calls FROM api_usage GROUP BY service,operation ORDER BY calls DESC"),
      audit: all("SELECT a.*, u.email AS admin_email FROM audit_logs a JOIN users u ON u.id=a.admin_id ORDER BY a.created_at DESC LIMIT 100"),
      plans: all("SELECT * FROM plans ORDER BY sort_order"),
      packages: all("SELECT * FROM minute_packages ORDER BY sort_order"),
      finance: financeOverview(),
      publications: all("SELECT p.*, c.title AS clip_title FROM publications p JOIN clips c ON c.id=p.clip_id ORDER BY p.created_at DESC LIMIT 100"),
      brands: all("SELECT * FROM brands ORDER BY created_at DESC LIMIT 100"),
    });
  } catch (e) {
    return fail(e);
  }
}

import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { listPackages, listPlans, usage, usageHistory } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return ok({
      usage: usage(user.id),
      plans: listPlans(),
      packages: listPackages(),
      history: usageHistory(user.id),
    });
  } catch (e) { return fail(e); }
}

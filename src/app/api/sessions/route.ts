import { requireUser } from "@/lib/auth";
import { listSessions } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ sessions: listSessions(user.id) });
  } catch (e) { return fail(e); }
}

import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await currentUser();
    return ok({ user, authenticated: Boolean(user) });
  } catch (e) {
    return fail(e);
  }
}

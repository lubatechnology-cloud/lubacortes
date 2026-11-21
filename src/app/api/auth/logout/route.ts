import { assertSameOrigin, clearSessionCookie, revokeCurrentSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
    await revokeCurrentSession();
    await clearSessionCookie();
    return ok({ loggedOut: true });
  } catch (e) {
    return fail(e);
  }
}

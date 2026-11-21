import { z } from "zod";
import { consumeEmailToken, hashPassword, revokeAllUserSessions } from "@/lib/auth";
import { nowIso, run } from "@/lib/db";
import { ApiError, fail, ok, readJson } from "@/lib/http";

const schema = z.object({ token: z.string().min(10), password: z.string().min(8).max(128) });

export async function POST(req: Request) {
  try {
    const body = schema.parse(await readJson(req));
    const userId = consumeEmailToken(body.token, "reset");
    if (!userId) throw new ApiError(400, "Link inválido ou expirado.", "invalid_token");
    run("UPDATE users SET password_hash=?, failed_logins=0, locked_until=NULL, updated_at=? WHERE id=?",
      hashPassword(body.password), nowIso(), userId);
    revokeAllUserSessions(userId);
    return ok({ reset: true });
  } catch (e) {
    return fail(e);
  }
}

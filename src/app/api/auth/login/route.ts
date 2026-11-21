import { z } from "zod";
import { assertSameOrigin, createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { get, nowIso, run } from "@/lib/db";
import { ApiError, fail, ok, readJson } from "@/lib/http";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

type UserRow = { id: string; email: string; name: string; password_hash: string; role: string; is_active: number; failed_logins: number; locked_until: string | null };

export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
    const body = schema.parse(await readJson(req));
    const user = get<UserRow>("SELECT * FROM users WHERE email=?", body.email);
    if (!user || !user.is_active) throw new ApiError(401, "E-mail ou palavra-passe incorrectos.", "invalid_credentials");
    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      throw new ApiError(429, "Conta temporariamente bloqueada. Tente novamente mais tarde.", "locked");
    }
    if (!verifyPassword(body.password, user.password_hash)) {
      const attempts = user.failed_logins + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null;
      run("UPDATE users SET failed_logins=?, locked_until=?, updated_at=? WHERE id=?", attempts, lockedUntil, nowIso(), user.id);
      throw new ApiError(401, "E-mail ou palavra-passe incorrectos.", "invalid_credentials");
    }
    run("UPDATE users SET failed_logins=0, locked_until=NULL, updated_at=? WHERE id=?", nowIso(), user.id);
    const session = createSession(user.id, undefined, req.headers.get("user-agent") ?? undefined);
    await setSessionCookie(session.token, session.expiresAt);
    return ok({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    return fail(e);
  }
}

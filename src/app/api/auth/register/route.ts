import { z } from "zod";
import { assertSameOrigin, createSession, hashPassword, issueEmailToken, setSessionCookie } from "@/lib/auth";
import { get, nowIso, run, uid } from "@/lib/db";
import { deliverToken } from "@/lib/mail";
import { ApiError, fail, ok, readJson } from "@/lib/http";

const schema = z.object({
  name: z.string().trim().min(2, "O nome deve ter pelo menos 2 caracteres.").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(8, "A palavra-passe deve ter pelo menos 8 caracteres.").max(128),
});

export async function POST(req: Request) {
  try {
    await assertSameOrigin(req);
    const body = schema.parse(await readJson(req));
    if (get("SELECT 1 FROM users WHERE email=?", body.email)) throw new ApiError(409, "Já existe uma conta com este e-mail.", "email_exists");
    const id = uid("usr_");
    const now = nowIso();
    run(
      "INSERT INTO users (id, email, name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)",
      id, body.email, body.name, hashPassword(body.password), now, now,
    );
    const token = issueEmailToken(id, "verify", 24 * 60);
    deliverToken(body.email, "verify", token);
    const session = createSession(id, undefined, req.headers.get("user-agent") ?? undefined);
    await setSessionCookie(session.token, session.expiresAt);
    return ok({
      user: { id, email: body.email, name: body.name, role: "user" },
      verificationToken: token,
      message: "Conta criada. Verifique o seu e-mail (em desenvolvimento o link aparece no terminal).",
    }, 201);
  } catch (e) {
    return fail(e);
  }
}

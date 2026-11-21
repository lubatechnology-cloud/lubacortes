import { consumeEmailToken } from "@/lib/auth";
import { nowIso, run } from "@/lib/db";
import { fail, ok, readJson } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ token: z.string().min(10) });

export async function POST(req: Request) {
  try {
    const { token } = schema.parse(await readJson(req));
    const userId = consumeEmailToken(token, "verify");
    if (!userId) return fail(new Error("TOKEN_INVALIDO"));
    run("UPDATE users SET email_verified_at=?, updated_at=? WHERE id=?", nowIso(), nowIso(), userId);
    return ok({ verified: true });
  } catch (e) {
    if (e instanceof Error && e.message === "TOKEN_INVALIDO") {
      return fail(new (await import("@/lib/http")).ApiError(400, "Link de verificação inválido ou expirado.", "invalid_token"));
    }
    return fail(e);
  }
}

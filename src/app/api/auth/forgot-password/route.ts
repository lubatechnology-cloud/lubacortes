import { z } from "zod";
import { issueEmailToken } from "@/lib/auth";
import { get } from "@/lib/db";
import { deliverToken } from "@/lib/mail";
import { fail, ok, readJson } from "@/lib/http";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

export async function POST(req: Request) {
  try {
    const { email } = schema.parse(await readJson(req));
    const user = get<{ id: string; email: string }>("SELECT id, email FROM users WHERE email=?", email);
    if (user) {
      const token = issueEmailToken(user.id, "reset", 60);
      deliverToken(user.email, "reset", token);
    }
    // Não revelar se a conta existe.
    return ok({ message: "Se a conta existir, foi enviado um link de recuperação." });
  } catch (e) {
    return fail(e);
  }
}

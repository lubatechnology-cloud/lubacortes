import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { get, nowIso, run, uid } from "@/lib/db";
import { ApiError, fail } from "@/lib/http";
import { exchangeGoogleCode, fetchGoogleProfile, googleEnabled } from "@/lib/google";
import { clientIp } from "@/lib/auth";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: number;
  google_sub: string | null;
};

export async function GET(req: Request) {
  try {
    if (!googleEnabled()) {
      throw new ApiError(503, "Entrar com Google não está configurado.", "google_not_configured");
    }

    const store = await cookies();
    const params = new URL(req.url).searchParams;
    const code = params.get("code");
    const state = params.get("state");
    const savedState = store.get("luba_google_state")?.value;
    const verifier = store.get("luba_google_verifier")?.value;
    const rawNext = store.get("luba_google_next")?.value || "/dashboard";
    const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

    if (params.get("error")) {
      throw new ApiError(401, "Autorização do Google cancelada ou recusada.", "google_denied");
    }
    if (!code || !state || !savedState || !verifier || state !== savedState) {
      throw new ApiError(400, "O pedido de login Google expirou. Tente novamente.", "google_invalid_state");
    }

    for (const name of ["luba_google_state", "luba_google_verifier", "luba_google_next"]) {
      store.delete(name);
    }

    const tokens = await exchangeGoogleCode(code, verifier);
    const profile = await fetchGoogleProfile(tokens.access_token);
    if (!profile.email_verified) {
      throw new ApiError(403, "O e-mail da conta Google não está verificado.", "google_email_unverified");
    }

    const now = nowIso();
    let user = get<UserRow>("SELECT * FROM users WHERE google_sub=?", profile.sub);

    if (!user) {
      const byEmail = get<UserRow & { email_verified_at: string | null }>(
        "SELECT * FROM users WHERE email=?",
        profile.email,
      );
      if (byEmail) {
        if (!byEmail.is_active) {
          throw new ApiError(403, "Esta conta está desactivada.", "account_inactive");
        }
        if (byEmail.google_sub && byEmail.google_sub !== profile.sub) {
          throw new ApiError(409, "Este e-mail já está associado a outra conta Google.", "google_email_conflict");
        }
        run(
          "UPDATE users SET google_sub=?, google_email=?, avatar_url=?, email_verified_at=COALESCE(email_verified_at,?), updated_at=? WHERE id=?",
          profile.sub, profile.email, profile.picture ?? null, now, now, byEmail.id,
        );
        user = get<UserRow>("SELECT * FROM users WHERE id=?", byEmail.id);
      } else {
        const id = uid("usr_");
        const name = (profile.name || profile.email.split("@")[0]).slice(0, 80);
        // Palavra-passe aleatória: o utilizador entra sempre pelo Google e pode
        // definir uma palavra-passe através de "Esqueci a palavra-passe".
        const senha = hashPassword(crypto.randomBytes(32).toString("hex"));
        run(
          "INSERT INTO users (id,email,name,password_hash,role,email_verified_at,google_sub,google_email,avatar_url,created_at,updated_at) VALUES (?,?,?,?,'user',?,?,?,?,?,?)",
          id, profile.email, name, senha, now, profile.sub, profile.email, profile.picture ?? null, now, now,
        );
        user = get<UserRow>("SELECT * FROM users WHERE id=?", id);
      }
    }

    if (!user || !user.is_active) {
      throw new ApiError(403, "Não foi possível entrar com esta conta Google.", "google_login_failed");
    }

    const session = createSession(user.id, clientIp(req), req.headers.get("user-agent") ?? undefined);
    await setSessionCookie(session.token, session.expiresAt);
    // Usa a origem do próprio pedido: não depende de APP_URL estar configurado.
    return NextResponse.redirect(new URL(next, new URL(req.url).origin));
  } catch (e) {
    return fail(e);
  }
}

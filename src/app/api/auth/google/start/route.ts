import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError, fail } from "@/lib/http";
import { generatePkce, googleAuthUrl, googleEnabled } from "@/lib/google";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 10,
};

export async function GET(req: Request) {
  try {
    if (!googleEnabled()) {
      throw new ApiError(503, "Entrar com Google não está configurado.", "google_not_configured");
    }
    const raw = new URL(req.url).searchParams.get("next") || "/dashboard";
    const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";

    const state = crypto.randomBytes(24).toString("base64url");
    const { verifier, challenge } = generatePkce();

    const res = NextResponse.redirect(googleAuthUrl(state, challenge));
    res.cookies.set("luba_google_state", state, COOKIE_OPTS);
    res.cookies.set("luba_google_verifier", verifier, COOKIE_OPTS);
    res.cookies.set("luba_google_next", next, COOKIE_OPTS);
    return res;
  } catch (e) {
    return fail(e);
  }
}

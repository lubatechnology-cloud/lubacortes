import crypto from "node:crypto";
import { config } from "./config";

/**
 * Login com Google (OpenID Connect / OAuth 2.0 com PKCE).
 * Isto é apenas IDENTIDADE — não é usado para descarregar vídeos do YouTube
 * (o YouTube desactivou o login OAuth no yt-dlp; ver docs/YOUTUBE.md).
 */

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
};

export function googleEnabled(): boolean {
  return Boolean(config.google.clientId && config.google.clientSecret);
}

export function googleRedirectUri(): string {
  return (
    config.google.redirectUri ||
    `${config.appUrl.replace(/\/$/, "")}/api/auth/google/callback`
  );
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

export function googleAuthUrl(state: string, challenge: string): string {
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
  codeVerifier: string,
): Promise<GoogleTokens> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Falha ao trocar código Google (${res.status}).`);
  }
  return (await res.json()) as GoogleTokens;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Falha ao ler perfil Google (${res.status}).`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  if (!data.sub || !data.email) {
    throw new Error("O perfil Google não continha e-mail.");
  }
  return {
    sub: String(data.sub),
    email: String(data.email).toLowerCase(),
    email_verified: Boolean(data.email_verified),
    name: data.name ? String(data.name) : undefined,
    picture: data.picture ? String(data.picture) : undefined,
  };
}

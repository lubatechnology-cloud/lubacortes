import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function carregarGoogle() {
  vi.resetModules();
  return import("../src/lib/google");
}

describe("Login com Google (OAuth PKCE)", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "cliente.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "segredo-de-teste");
    vi.stubEnv("GOOGLE_REDIRECT_URI", "");
    vi.stubEnv("APP_URL", "https://lubacortes.vercel.app");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("gera um PKCE S256 válido e diferente a cada chamada", async () => {
    const g = await carregarGoogle();
    const a = g.generatePkce();
    const b = g.generatePkce();
    expect(a.verifier).not.toBe(b.verifier);
    expect(a.challenge).not.toBe(a.verifier);
    const esperado = crypto
      .createHash("sha256")
      .update(a.verifier)
      .digest("base64url");
    expect(a.challenge).toBe(esperado);
  });

  it("só activa o botão quando cliente e segredo existem", async () => {
    const g = await carregarGoogle();
    expect(g.googleEnabled()).toBe(true);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    const semSegredo = await carregarGoogle();
    expect(semSegredo.googleEnabled()).toBe(false);
  });

  it("constrói a URL de autorização com state, PKCE e redirect correctos", async () => {
    const g = await carregarGoogle();
    const url = new URL(g.googleAuthUrl("estado123", "desafio456"));
    expect(url.host).toBe("accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("cliente.apps.googleusercontent.com");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://lubacortes.vercel.app/api/auth/google/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge")).toBe("desafio456");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe("estado123");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
  });

  it("respeita GOOGLE_REDIRECT_URI quando definido", async () => {
    vi.stubEnv("GOOGLE_REDIRECT_URI", "https://exemplo.ao/callback");
    const g = await carregarGoogle();
    expect(g.googleRedirectUri()).toBe("https://exemplo.ao/callback");
  });
});

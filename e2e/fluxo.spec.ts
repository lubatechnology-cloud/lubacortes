import { test, expect } from "@playwright/test";

test("página inicial mostra planos, logótipos e animação", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page).toHaveTitle(/Lubacortes/);
  const corpo = page.locator("body");
  await expect(corpo).toContainText("3.500 Kz", { timeout: 30_000 });
  await expect(corpo).toContainText("TikTok");
  await expect(corpo).toContainText("YouTube");
  await expect(corpo).toContainText("PROCESSAMENTO REAL");
});

test("link do YouTube é reconhecido mas não processado", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  const input = page.getByPlaceholder("Coloque o URL do seu vídeo");
  await input.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const botao = page.getByRole("button", { name: /Analisar vídeo|Começar grátis/ });
  await expect(botao).toBeDisabled({ timeout: 20_000 });
  await expect(page.locator("body")).toContainText(/plataforma que exige extracção|Encontrámos o vídeo/);
});

test("registo, dashboard e preferências de notificação", async ({ page }) => {
  const email = `e2e_${Date.now()}@exemplo.ao`;
  await page.goto("/registar", { waitUntil: "domcontentloaded", timeout: 60_000 });
  const campos = page.locator("form input");
  await campos.nth(0).fill("Utilizador E2E");
  await campos.nth(1).fill(email);
  await campos.nth(2).fill("senha12345");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
  await expect(page.locator("body")).toContainText(/Olá,/);

  await page.goto("/definicoes", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByPlaceholder("+244 9xx xxx xxx").fill("+244923000000");
  await page.getByRole("button", { name: /Guardar alterações/ }).click();
  await expect(page.locator("body")).toContainText(/actualizados/, { timeout: 30_000 });
});

test("isolamento: utilizador sem sessão é redirecionado", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
});

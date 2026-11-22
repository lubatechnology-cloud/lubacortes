# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fluxo.spec.ts >> link do YouTube é reconhecido mas não processado
- Location: e2e\fluxo.spec.ts:13:1

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator:  getByRole('button', { name: /Analisar vídeo|Começar grátis/ })
Expected: disabled
Received: enabled
Timeout:  20000ms

Call log:
  - Expect "toBeDisabled" getByRole('button', { name: /Analisar vídeo|Começar grátis/ }) with timeout 20000ms
  - waiting for getByRole('button', { name: /Analisar vídeo|Começar grátis/ })
    41 × locator resolved to <button class="btn-primary whitespace-nowrap !px-6">…</button>
       - unexpected value "enabled"

```

```yaml
- button "Começar grátis":
  - img
  - text: Começar grátis
  - img
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("página inicial mostra planos, logótipos e animação", async ({ page }) => {
  4  |   await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  5  |   await expect(page).toHaveTitle(/Lubacortes/);
  6  |   const corpo = page.locator("body");
  7  |   await expect(corpo).toContainText("3.500 Kz", { timeout: 30_000 });
  8  |   await expect(corpo).toContainText("TikTok");
  9  |   await expect(corpo).toContainText("YouTube");
  10 |   await expect(corpo).toContainText("PROCESSAMENTO REAL");
  11 | });
  12 | 
  13 | test("link do YouTube é reconhecido mas não processado", async ({ page }) => {
  14 |   await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  15 |   const input = page.getByPlaceholder("Coloque o URL do seu vídeo");
  16 |   await input.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  17 |   const botao = page.getByRole("button", { name: /Analisar vídeo|Começar grátis/ });
> 18 |   await expect(botao).toBeDisabled({ timeout: 20_000 });
     |                       ^ Error: expect(locator).toBeDisabled() failed
  19 |   await expect(page.locator("body")).toContainText(/plataforma que exige extracção|Encontrámos o vídeo/);
  20 | });
  21 | 
  22 | test("registo, dashboard e preferências de notificação", async ({ page }) => {
  23 |   const email = `e2e_${Date.now()}@exemplo.ao`;
  24 |   await page.goto("/registar", { waitUntil: "domcontentloaded", timeout: 60_000 });
  25 |   const campos = page.locator("form input");
  26 |   await campos.nth(0).fill("Utilizador E2E");
  27 |   await campos.nth(1).fill(email);
  28 |   await campos.nth(2).fill("senha12345");
  29 |   await page.getByRole("button", { name: "Criar conta" }).click();
  30 |   await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
  31 |   await expect(page.locator("body")).toContainText(/Olá,/);
  32 | 
  33 |   await page.goto("/definicoes", { waitUntil: "domcontentloaded", timeout: 60_000 });
  34 |   await page.getByPlaceholder("+244 9xx xxx xxx").fill("+244923000000");
  35 |   await page.getByRole("button", { name: /Guardar alterações/ }).click();
  36 |   await expect(page.locator("body")).toContainText(/actualizados/, { timeout: 30_000 });
  37 | });
  38 | 
  39 | test("isolamento: utilizador sem sessão é redirecionado", async ({ page }) => {
  40 |   await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 60_000 });
  41 |   await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  42 | });
  43 | 
```
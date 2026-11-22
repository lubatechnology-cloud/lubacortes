# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fluxo.spec.ts >> registo, dashboard e preferências de notificação
- Location: e2e\fluxo.spec.ts:22:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('body')
Expected pattern: /actualizados/
Received string:  "Lubacortes Painel Projectos Biblioteca Planos e pagamentos Definições Novo projectoUtilizador E2Ee2e_1795363975265@exemplo.ao Terminar sessãoLubacortesModo testeDefiniçõesResposta inesperada do servidor (405):  PerfilNomeE-mailTelefone (WhatsApp) Avisar por e-mail quando estiver pronto Avisar por WhatsApp (requer credenciais oficiais)E-mail: por verificarGuardar alterações Segurança da contaCada utilizador tem uma conta individual. Os seus vídeos, projectos e pagamentos não são acessíveis a outras contas — o isolamento é aplicado no servidor.✓ Autenticação por sessão com cookie httpOnly✓ Palavras-passe com hashing scrypt✓ Protecção CSRF e bloqueio após tentativas falhadas Sessões activasMozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36— · 22/11/2026, 17:13:01Revogar"
Timeout: 30000ms

Call log:
  - Expect "toContainText" locator('body') with timeout 30000ms
  - waiting for locator('body')
    4 × locator resolved to <body class="min-h-screen antialiased">…</body>
      - unexpected value "Lubacortes Painel Projectos Biblioteca Planos e pagamentos Definições Novo projectoUtilizador E2Ee2e_1795363975265@exemplo.ao Terminar sessãoLubacortesModo testeDefinições PerfilNomeE-mailTelefone (WhatsApp) Avisar por e-mail quando estiver pronto Avisar por WhatsApp (requer credenciais oficiais)E-mail: por verificar Segurança da contaCada utilizador tem uma conta individual. Os seus vídeos, projectos e pagamentos não são acessíveis a outras contas — o isolamento é aplicado no servidor.✓ Autenticação por sessão com cookie httpOnly✓ Palavras-passe com hashing scrypt✓ Protecção CSRF e bloqueio após tentativas falhadas Sessões activasMozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36— · 22/11/2026, 17:13:01Revogar"
    57 × locator resolved to <body class="min-h-screen antialiased">…</body>
       - unexpected value "Lubacortes Painel Projectos Biblioteca Planos e pagamentos Definições Novo projectoUtilizador E2Ee2e_1795363975265@exemplo.ao Terminar sessãoLubacortesModo testeDefiniçõesResposta inesperada do servidor (405):  PerfilNomeE-mailTelefone (WhatsApp) Avisar por e-mail quando estiver pronto Avisar por WhatsApp (requer credenciais oficiais)E-mail: por verificarGuardar alterações Segurança da contaCada utilizador tem uma conta individual. Os seus vídeos, projectos e pagamentos não são acessíveis a outras contas — o isolamento é aplicado no servidor.✓ Autenticação por sessão com cookie httpOnly✓ Palavras-passe com hashing scrypt✓ Protecção CSRF e bloqueio após tentativas falhadas Sessões activasMozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36— · 22/11/2026, 17:13:01Revogar"

```

```yaml
- complementary:
  - link "Lubacortes Lubacortes":
    - /url: /
    - img "Lubacortes"
    - text: Lubacortes
  - navigation:
    - link "Painel":
      - /url: /dashboard
      - img
      - text: Painel
    - link "Projectos":
      - /url: /projectos
      - img
      - text: Projectos
    - link "Biblioteca":
      - /url: /biblioteca
      - img
      - text: Biblioteca
    - link "Planos e pagamentos":
      - /url: /faturacao
      - img
      - text: Planos e pagamentos
    - link "Definições":
      - /url: /definicoes
      - img
      - text: Definições
  - link "Novo projecto":
    - /url: /dashboard
    - img
    - text: Novo projecto
  - paragraph: Utilizador E2E
  - paragraph: e2e_1795363975265@exemplo.ao
  - button "Alternar tema":
    - img
  - button "Terminar sessão":
    - img
    - text: Terminar sessão
- banner: Lubacortes Modo teste
- main:
  - heading "Definições" [level=1]
  - text: "Resposta inesperada do servidor (405):"
  - heading "Perfil" [level=2]:
    - img
    - text: Perfil
  - text: Nome
  - textbox: Utilizador E2E
  - text: E-mail
  - textbox: e2e_1795363975265@exemplo.ao
  - text: Telefone (WhatsApp)
  - textbox "+244 9xx xxx xxx": "+244923000000"
  - checkbox "Avisar por e-mail quando estiver pronto" [checked]
  - text: Avisar por e-mail quando estiver pronto
  - checkbox "Avisar por WhatsApp (requer credenciais oficiais)"
  - text: Avisar por WhatsApp (requer credenciais oficiais)
  - paragraph: "E-mail: por verificar"
  - button "Guardar alterações"
  - heading "Segurança da conta" [level=2]:
    - img
    - text: Segurança da conta
  - paragraph: Cada utilizador tem uma conta individual. Os seus vídeos, projectos e pagamentos não são acessíveis a outras contas — o isolamento é aplicado no servidor.
  - text: ✓ Autenticação por sessão com cookie httpOnly ✓ Palavras-passe com hashing scrypt ✓ Protecção CSRF e bloqueio após tentativas falhadas
  - heading "Sessões activas" [level=2]:
    - img
    - text: Sessões activas
  - paragraph: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36
  - paragraph: — · 22/11/2026, 17:13:01
  - button "Revogar"
- alert
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
  18 |   await expect(botao).toBeDisabled({ timeout: 20_000 });
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
> 36 |   await expect(page.locator("body")).toContainText(/actualizados/, { timeout: 30_000 });
     |                                      ^ Error: expect(locator).toContainText(expected) failed
  37 | });
  38 | 
  39 | test("isolamento: utilizador sem sessão é redirecionado", async ({ page }) => {
  40 |   await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 60_000 });
  41 |   await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  42 | });
  43 | 
```
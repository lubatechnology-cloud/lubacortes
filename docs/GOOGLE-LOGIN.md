# Entrar com Google — estado actual

**Estado: ACTIVO em produção.** O botão «Entrar com Google» aparece no login e no registo
de `https://lubacortes.vercel.app` e o fluxo foi testado de ponta a ponta.

Isto é apenas **identidade/login**. Não é usado para descarregar vídeos do YouTube
(ver última secção).

## Configuração em produção

| Item | Valor |
|---|---|
| Projecto Google Cloud | `balancerts` |
| Cliente OAuth | Aplicação Web, nome «Lubacortes» |
| URI de redirecionamento | `https://lubacortes.vercel.app/api/auth/google/callback` |
| Ecrã de consentimento | Externo, **em produção** (não em teste) |
| Domínio autorizado | `lubacortes.vercel.app` |
| Política de Privacidade | `/privacidade` |
| Termos de Utilização | `/termos` |
| Escopos | `openid email profile` (não sensíveis) |
| Verificação Google | **Não necessária** — o Centro de Verificação confirma que não há escopos sensíveis/restritos e o check-up do projecto não apresenta recomendações |

As credenciais (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`) estão
guardadas na Vercel, nos GitHub Actions Secrets e em `.env.local` — nunca no git e nunca
expostas na interface.

## Como funciona

- OAuth 2.0 com **PKCE S256** e parâmetro `state` validado em cookie `httpOnly` (10 min).
- O redirect `?next=` só aceita caminhos locais (`/...`), evitando redirecionamentos externos.
- O callback troca o código pelo token, lê o perfil em `openidconnect.googleapis.com/v1/userinfo`
  e recusa e-mails não verificados.
- Se já existir conta Lubacortes com o mesmo e-mail verificado, as contas são **ligadas**
  automaticamente — não se perdem projectos, planos nem pagamentos.
- Se não existir, é criada uma conta com e-mail verificado e palavra-passe aleatória; para entrar
  com palavra-passe no futuro, usar «Esqueci a palavra-passe».
- Guardamos apenas `google_sub`, `google_email` e `avatar_url`. **Não guardamos tokens do Google.**
- O e-mail Google ligado aparece em «Definições → Perfil».

## Manutenção

- Para rodar as credenciais: actualizar o cliente no Google Cloud e correr
  `./scripts/vercel-env.ps1` e `node scripts/set-github-secrets.mjs` (os nomes já estão incluídos).
- `APP_URL` deve ser `https://lubacortes.vercel.app` na Vercel; o callback usa a origem do pedido
  como fallback, por isso um `APP_URL` vazio não quebra o login.
- Para adicionar logotipo ao ecrã de consentimento: upload em «Branding». Atenção: com logotipo,
  o Google passa a exigir verificação externa — por agora omitimo-lo de propósito.

## Por que é que isto não descarrega vídeos do YouTube

O yt-dlp indica oficialmente: *«Due to new restrictions enacted by YouTube, logging in with OAuth
no longer works with yt-dlp. You should use cookies instead.»* O YouTube também exige um
**PO Token** que o yt-dlp não consegue gerar. O OAuth dá acesso a metadados (YouTube Data API),
nunca ao conteúdo do vídeo.

Por isso os links do YouTube são «melhor esforço»: se o YouTube bloquear o download a partir dos
servidores, a interface convida a **carregar o ficheiro**, que é o caminho garantido, isolado por
conta e sem qualquer questão técnica para o utilizador.

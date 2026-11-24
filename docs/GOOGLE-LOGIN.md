# Entrar com Google — configuração

O botão **Entrar com Google** é um método de **identidade/login**. Não é usado para
descarregar vídeos do YouTube (ver secção final).

Quando as credenciais não estão configuradas, o botão simplesmente não aparece e a
plataforma continua a funcionar normalmente com e-mail e palavra-passe.

## 1. Criar as credenciais (uma vez)

1. Abrir <https://console.cloud.google.com/apis/credentials>.
2. Criar/seleccionar um projecto.
3. **APIs e serviços → Biblioteca** — activar **Google Identity Services / OpenID Connect**
   (a API "Google+"/"People" antiga já não é necessária; o endpoint `openidconnect` funciona
   com qualquer projecto).
4. **Ecrã de consentimento OAuth** — configurar como *Externo*, acrescentar o domínio
   `lubacortes.vercel.app` e o e-mail de contacto. Publicar o ecrã (ou manter em testes e
   acrescentar os e-mails autorizados).
5. **Credenciais → Criar credenciais → ID de cliente OAuth → Aplicação Web**.
6. Em **URI de redirecionamento autorizada**, acrescentar **exactamente**:
   - `http://localhost:3000/api/auth/google/callback` (desenvolvimento)
   - `https://lubacortes.vercel.app/api/auth/google/callback` (produção)
7. Anotar o **ID de cliente** e o **segredo de cliente**.

## 2. Configurar valores

**Local** — acrescentar a `.env.local`:

```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

**Produção (Vercel)** — acrescentar as mesmas variáveis, mudando apenas
`GOOGLE_REDIRECT_URI` para `https://lubacortes.vercel.app/api/auth/google/callback`.
Depois de gravar as credenciais em `keys.txt`, correr:

```powershell
.\scripts\vercel-env.ps1
```

**Worker (GitHub Actions)** — os nomes já estão incluídos em `scripts/set-github-secrets.mjs`.

## 3. Aplicar a migração na base de dados

Foram acrescentadas três colunas em `users`: `google_sub`, `google_email` e `avatar_url`,
com um índice único em `google_sub`.

```powershell
npx tsx scripts/migrate-postgres.ts
```

Em SQLite local a migração é aplicada automaticamente ao iniciar a aplicação.

## 4. Comportamento

- Clique em **Entrar com Google** → escolha da conta Google → regresso a `/dashboard`
  (ou à página pedida em `?next=`).
- Se já existir uma conta Lubacortes com o **mesmo e-mail verificado pelo Google**,
  as contas são ligadas automaticamente — não perde projectos, planos nem pagamentos.
- Se não existir conta, é criada uma com e-mail verificado e uma palavra-passe aleatória.
  Para entrar com palavra-passe no futuro, usar **Esqueci a palavra-passe**.
- O segredo do Google **nunca** é guardado na base de dados; só o `sub` (identificador
  estável), o e-mail e o avatar.

## 5. Segurança

- OAuth 2.0 com **PKCE (S256)** e parâmetro `state` verificado em cookie `httpOnly`.
- Cookies temporários com 10 minutos de validade, apagados no callback.
- Redirecionamento `next` restrito a caminhos locais (`/...`), sem abertura para sites externos.
- E-mail recusado se `email_verified` for falso.

## 6. Por que é que isto não descarrega vídeos do YouTube

O yt-dlp indica oficialmente: *"Due to new restrictions enacted by YouTube, logging in with
OAuth no longer works with yt-dlp. You should use cookies instead."* Além disso, o YouTube
exige um **PO Token** que o yt-dlp não consegue gerar. O OAuth só dá acesso a metadados
(YouTube Data API), nunca ao conteúdo do vídeo.

Por isso, a Lubacortes trata **links do YouTube como melhor esforço**: se o YouTube bloquear
o download a partir dos servidores, a interface convida a **carregar o ficheiro**, que é o
caminho garantido, isolado por conta e sem nenhuma questão técnica para o utilizador.

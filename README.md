# LUBACORTES

Plataforma SaaS de cortes inteligentes de vídeo com IA. Interface em Português de Angola,
tema claro/escuro, processamento **real** com FFmpeg, fila assíncrona, sistema freemium
com aplicação no backend e pagamentos **em modo de teste**.

## Arranque rápido (Windows / Node 24)

```powershell
npm install
npm install-scripts approve better-sqlite3 ffmpeg-static esbuild onnxruntime-node protobufjs sharp
Copy-Item .env.example .env.local
# edite APP_SECRET e PAYMENT_TEST_CONFIRM_TOKEN em .env.local
npm run db:init
npm run db:seed
npm run dev:all        # web + worker no mesmo comando
```

Abra `http://localhost:3000`. O `db:seed` cria `admin@lubacortes.local` e imprime a palavra-passe.

### Sem `concurrently`

Use dois terminais:

```powershell
npm run dev
npm run worker
```

## Configuração das APIs

Todas as chaves ficam **apenas no servidor** (`.env.local`). Ver `.env.example` e
`docs/ARQUITECTURA.md`.

- **Transcrição real — GRATUITA:** `TRANSCRIPTION_PROVIDER=groq` com `GROQ_API_KEY`
  (uma chave serve também para tradução). Whisper Large v3 Turbo, 20 req/min e
  2.000 req/dia no plano gratuito; áudios longos são divididos automaticamente.
- **Sem chave nenhuma:** `TRANSCRIPTION_PROVIDER=local` (Whisper via Transformers.js,
  mais lento na primeira execução).
- **Tradução real — GRATUITA:** `TRANSLATION_PROVIDER=groq` (LLM `llama-3.3-70b-versatile`)
  ou `TRANSLATION_PROVIDER=libretranslate` com `LIBRETRANSLATE_URL` (open-source, servidor próprio).
- **Alternativa paga:** `TRANSCRIPTION_PROVIDER=openai` e `TRANSLATION_PROVIDER=openai`
  com `OPENAI_API_KEY`.
- **Autofoco:** `AUTOFOCUS_PROVIDER=model` (detecção de rostos ONNX); sem modelo, aplica
  enquadramento central. O foco manual tem sempre prioridade.
- **Pagamentos:** permanecem em `test`. Para simular uma confirmação é obrigatório
  `PAYMENT_TEST_CONFIRM_TOKEN`. Nunca desbloqueamos cortes apenas por clique num botão.

## Fluxo do utilizador

1. Registar conta → 2. Colar URL/carregar ficheiro → 3. Escolher idioma das legendas →
4. Escolher formato/opções → 5. Gerar cortes → 6. Acompanhar progresso →
7. Escolher o corte gratuito → 8. Desbloquear restantes com créditos de teste.

## Sistema comercial

| Plano | Preço | Minutos de entrada | Cortes exportados | Marca de água |
|---|---|---|---|---|
| GRATUITO | 0 Kz | 1 corte, 9:16 até 720p, legendas automáticas | 1 | Sim |
| CRIADOR | 3.500 Kz/mês | 30 cortes, vídeos até 30 min, HD, autofoco inteligente, 5 estilos | 30 | Não |
| PROFISSIONAL | 7.500 Kz/mês | 100 cortes, até 90 min, legendas animadas, rastreamento de rosto, Full HD, agendamento (teste) | 100 | Não |
| AGÊNCIA | 17.500 Kz/mês | 300 cortes, até 3 h, várias contas/marcas, lote, prioridade | 300 | Não |

Pacotes adicionais: 60 min (2.000 Kz), 150 min (4.500 Kz), 300 min (8.000 Kz), 600 min (14.000 Kz).

- Minutos são consumidos pela **duração do vídeo original**, no momento da importação.
- Exportações são reservadas antes da geração (limite por plano + créditos de desbloqueio).
- Renovação mensal sem cobrança automática (sem integração oficial autorizada).
- Minutos não utilizados não acumulam para o mês seguinte.
- Saldo de minutos/cortes visível no dashboard e em "Planos e pagamentos".
- Gestão financeira regista custos medidos por utilizador/projecto/serviço com tarifas
  configuradas pelo administrador (`cost.<serviço>.<operação>_cents`). Receita e custo são
  apresentados separadamente — **sem margens de lucro fictícias**.

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor Next.js |
| `npm run worker` | Processador de tarefas de vídeo |
| `npm run dev:all` | Ambos em paralelo |
| `npm run typecheck` | Verificação de tipos |
| `npm test` | Testes (auth, momentos, legendas, freemium, pagamentos, SSRF) |
| `npm run build` | Build de produção |
| `npm run db:init` / `db:seed` | Base de dados e administrador |

## Monitorização e modelos próprios
- Métricas Prometheus em `/api/metrics` (protegidas por `METRICS_TOKEN`).
- Grafana/Prometheus: `docker compose -f docker-compose.monitoring.yml up -d`. Ver `docs/MONITORING.md`.
- Sentry opcional via `SENTRY_DSN`.
- Adaptadores self-hosted (WhisperX, vLLM, DeepFace): ver `docs/SELF-HOSTED.md`.
- Testes E2E: `npm run test:e2e` (usa Chrome instalado; `E2E_BASE_URL` para outro destino).

## Deploy na Vercel

A configuração está preparada mas **não foi publicada**: o deploy completo exige
Postgres, storage privado e um worker externo (a Vercel não suporta SQLite persistente
nem renderização de vídeo em funções serverless). Ver `docs/VERCEL.md` para o guia
passo a passo, `docs/postgres-schema.sql` para o Supabase e `Dockerfile.worker` para o
worker. Validar variáveis com `npm run check:deploy` (não revela segredos).

## Estrutura

Ver `docs/ARQUITECTURA.md`. O logótipo oficial está em `public/logo.png`; o símbolo
simplificado (favicon) em `public/icon.svg`.

## Estado funcional

- [x] Autenticação completa, isolamento por conta, perfis e sessões
- [x] Importação segura por URL directa e upload, com validação SSRF
- [x] IA de detecção de momentos com pontuação e motivos
- [x] Geração real de cortes com FFmpeg, legendas ASS/SRT, karaoke e formatos sociais
- [x] Fila assíncrona com progresso, retentativas e retomabilidade
- [x] Freemium (1 corte por conta) aplicado no backend; downloads protegidos
- [x] Pagamentos simulados com confirmação controlada por segredo e webhook assinado
- [x] Dashboard, biblioteca, facturação, definições e painel administrativo com auditoria
- [x] Planos comerciais, limites de minutos/cortes, pacotes, renovação mensal, histórico de consumo
- [x] Gestão financeira com custos medidos e sem margens fictícias
- [x] Editor de cortes: correcção manual das legendas, estilo (fonte/tamanho/cor/posição/karaoke/animação)
- [x] Enquadramento manual com coordenadas X/Y e selecção de autofoco (centro/modelo/manual)
- [x] Hashtags e chamada para acção apresentadas e copiáveis no editor
- [x] Registo de fontes autorizadas (sem extractores de plataformas protegidas)
- [x] Planos GRATUITO/CRIADOR/PROFISSIONAL/AGÊNCIA com funcionalidades distintas por backend
- [x] Várias marcas e membros, logótipos e intro/encerramento personalizados
- [x] Exportação em lote e prioridade de processamento
- [x] Agendamento de publicações em modo TESTE (sem integração real)
- [ ] Transcrição/tradução/autofoco por modelo — dependem de credenciais configuradas
      (ver adaptadores em `src/lib/ai` e `src/lib/video/focus.ts`)

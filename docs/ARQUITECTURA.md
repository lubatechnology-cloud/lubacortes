# Lubacortes — Arquitectura técnica

## Visão geral

```
 next (App Router, TypeScript)
 ├── Route Handlers (API REST) ──> serviços ──> SQLite (repositório isolado por user_id)
 │                                     ├──> FFmpeg / FFprobe (processamento real)
 │                                     ├──> adaptadores de IA (transcrição/tradução)
 │                                     └──> adaptadores de pagamento (modo TESTE)
 └── worker independente (tsx) ──> fila persistente em SQLite (analyze / render / translate)
```

O worker é um **processo separado**, para que renderização pesada nunca corra dentro de
funções serverless. A fila é persistida na base de dados: tarefas interrompidas são
recuperadas no arranque (`recoverStaleJobs`) e podem ser retomadas.

## Camadas

| Directório | Responsabilidade |
|---|---|
| `src/app/api` | Route Handlers. Autenticação, isolamento, validação, entregas de ficheiros. |
| `src/app/(app)` | Dashboard, projectos, biblioteca, facturação, definições, admin. |
| `src/lib/services` | Regras de negócio (projectos, análise, renderização, entitlements, pagamentos). |
| `src/lib/ai` | Motores de transcrição, tradução e detecção de momentos (adaptadores). |
| `src/lib/video` | FFmpeg, sondagem, detecção de cenas/silêncio, legendas ASS/SRT, recorte, autofoco. |
| `src/lib/db.ts` / `schema.sql` | Base de dados e esquema (equivalente ao modelo Supabase/Postgres). |
| `worker/index.ts` | Consumidor assíncrono da fila. |

## Segurança

- **Isolamento de contas:** todas as consultas de projectos, cortes, pagamentos e tarefas
  filtram por `user_id`. Não existe qualquer endpoint que aceite um `user_id` do cliente.
- **Ficheiros privados:** vídeos, miniaturas e cortes ficam em `STORAGE_DIR`, fora de
  `/public`. O acesso passa sempre por `/api/clips/[id]/download`, que verifica a
  autorização no servidor (`canDownload`). Não existe URL directo para os ficheiros.
- **Corte gratuito:** `free_selections` tem `UNIQUE(user_id)`; a escolha é uma transacção
  atómica. Bloqueio e desbloqueio são campos da base de dados, não CSS.
- **Pagamentos:** modo de teste fixo. Nenhum botão de simulação desbloqueia cortes: só a
  rota `confirm-test` com `PAYMENT_TEST_CONFIRM_TOKEN` (segredo do ambiente) altera o
  estado para `paid` e credita créditos. Webhook exige assinatura HMAC **e** token de teste.
- **SSRF:** URLs são validadas (http/https, sem credenciais, bloqueio de IPs privados e
  redirecções para redes internas). Plataformas que exigem extracção/autenticação estão
  na denylist — não há código para contornar protecções.
- **Autenticação:** scrypt + salt, sessões opacas em cookie httpOnly/SameSite, verificação
  de e-mail, recuperação, bloqueio após 5 falhas, revogação de sessões, protecção CSRF.
- **Admin:** role `admin`; operações registadas em `audit_logs`.

## Processamento de vídeo

1. Importação: download seguro ou upload → `ffprobe` (duração/resolução) → miniatura.
2. Análise (`runAnalyzeJob`): cenas (`select=gt(scene,0.32)`), silêncios
   (`silencedetect`), áudio 16 kHz, transcrição (adaptador) e detecção de momentos.
3. Detecção de momentos: combina palavras-chave de 10 categorias, perguntas, ritmo de
   fala, posição no vídeo, pausas e mudanças de cena. As fronteiras dos cortes são sempre
   fronteiras de segmentos transcritos — **nenhuma frase é cortada ao meio**.
4. Renderização (`runRenderJob`): legenda ASS (com karaoke opcional), tradução por
   segmento, plano de foco (centro / manual / modelo de detecção de rostos), recorte
   inteligente para o formato, H.264/AAC, miniatura.
5. Progresso, tentativas, erros e retomabilidade ficam registados em `jobs` e
   `processing_errors`.

## Adaptadores e credenciais

| Função | Modo sem credenciais | Com credenciais |
|---|---|---|
| Transcrição | `none` — sem legenda e aviso explícito | `groq` (gratuito, Whisper Turbo), `local` (sem chave) ou `openai` (pago) |
| Tradução | `none` — texto original marcado como **NÃO TRADUZIDO** | `groq` (gratuito), `libretranslate` (próprio) ou `openai` (pago) |
| Autofoco | centro / manual | `model` (detector ONNX) |
| Pagamentos | simulação controlada por token | substituir adaptadores + desactivar modo teste |

**Nenhuma funcionalidade é representada como concluída quando o provedor não está
configurado.** A interface apresenta o aviso devolvido pelo backend.

## Migrar para Supabase / Postgres

O esquema em `src/lib/schema.sql` usa tipos e conceitos directamente traduzíveis. Para produção:

1. Criar as mesmas tabelas em Postgres/Supabase, com `auth.users` ligado a `users.id`.
2. Substituir `src/lib/db.ts` por um cliente Postgres (o resto do código usa apenas
   `get/all/run/setting`).
3. Tornar `storage_path` um bucket privado no Supabase Storage e gerar URLs assinadas
   **após** `canDownload`.
4. Mover a fila para Postgres (SKIP LOCKED) ou Redis/BullMQ, mantendo a interface de
   `src/lib/queue.ts`.
5. RLS por `user_id` como segunda camada de isolamento.

## Editor de cortes

- `subtitle_segments` guarda o texto original e o texto apresentado de cada legenda,
  permitindo correcção manual e re-renderização sem repetir a análise (`/api/clips/[id]/subtitles`).
- O editor expõe estilo (fonte, tamanho, cores, posição, negrito, karaoke, animação), foco
  manual (X/Y) e modo de autofoco (centro/modelo/manual). "Guardar e regenerar" cria uma
  tarefa `render` com `regenerate:true`, que lê as legendas guardadas em vez as recalcular.
- Hashtags e CTA são gerados por formato e guardados no corte, copiáveis na interface.
- `src/lib/video/platforms.ts` regista apenas fontes autorizadas (URL directo/upload) e
  deixa integrações oficiais futuras desactivadas — sem código de bypass.

## Sistema comercial (camada `src/lib/billing.ts`)

- `plans` (4 planos) e `minute_packages` (4 pacotes) com preços em cêntimos Kz,
  configuráveis pelo administrador via `/api/admin/plans` e `/api/admin/packages`.
- `usage_periods`: período mensal por utilizador; `ensurePeriod` repõe o período e, sem
  renovação automática paga, faz downgrade para GRATUITO no mês seguinte.
- `minute_ledger` / `usage_events`: histórico de consumo; `chargeInputMinutes` debita a
  duração original do vídeo (plano primeiro, depois pacotes comprados) e rejeita excesso.
- `reserveExports` reserva cortes antes da geração, impedindo exportação ilimitada.
- Marca de água do plano GRATUITO aplicada no filtro drawtext do FFmpeg.
- `cost_records`: custos medidos por utilizador/projecto/job com tarifa configurada em
  `settings` (`cost.<service>.<operation>_cents`). Sem cálculo de margem.
- Um pagamento de teste com `kind='plan'` ou `kind='minute_pack'` só activa o benefício
  depois de `confirmTestPayment` validar o segredo do ambiente.

## Limites conhecidos (honestidade funcional)

- Sem `TRANSCRIPTION_PROVIDER`, não existe transcrição real: a detecção de momentos usa
  apenas sinais acústicos/visuais e a legenda não é gerada.
- Sem `TRANSLATION_PROVIDER`, as legendas mantêm o idioma original e são marcadas como
  não traduzidas.
- Groq gratuito tem limites de taxa (20 req/min, 2.000/dia, 25 MB por upload); o motor
  divide áudios longos em pedaços e reporta erros 429 ao utilizador em vez de os esconder.
- URLs de plataformas que exigem extractores não são suportadas por política; use upload
  ou URL directa de media autorizada.
- Os preços são valores de configuração de teste, definidos no painel administrativo.

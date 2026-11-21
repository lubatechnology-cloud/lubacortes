# Guia de deploy — Vercel + Supabase + worker externo

**Estado: preparado, mas NÃO publicado.** O token da Vercel foi encontrado na conta
`lubatechnology-9737`, mas não foi usado. O deploy completo exige infraestrutura que ainda
não existe (Postgres, storage privado e host do worker). Este guia descreve exactamente o
que falta e a ordem dos passos.

## Por que não publicar o código actual tal como está

| Item | Local (SQLite + ficheiros) | Vercel (serverless) |
|---|---|---|
| Base de dados | `data/lubacortes.db` gravável | filesystem efémero/readonly — dados perdidos |
| Vídeos/cortes | `storage/` fora de `/public` | não persistente entre invocações |
| Worker FFmpeg | processo `npm run worker` | funções têm limite de tempo; renderização pesada não cabe |

Publicar agora resultaria numa aplicação com login e vídeos quebrados. Por isso o deploy
está preparado mas adiado até existirem as credenciais abaixo.

## 1. Criar a base de dados (Supabase)

1. Criar projecto em https://supabase.com.
2. SQL Editor → colar o conteúdo de `docs/postgres-schema.sql` → Executar.
3. Activar RLS nas tabelas com `user_id` como segunda camada de isolamento (o backend já
   filtra por `user_id`; RLS é defesa adicional).
4. Copiar `Project URL`, `service_role key`, `anon key` e a string de ligação Postgres.

## 2. Criar storage privado (Supabase Storage)

1. Storage → New bucket → nome `lubacortes-private`, **Private** (não público).
2. Políticas: apenas `service_role` acede; nunca expor URLs directas dos cortes.
3. O código de `src/lib/storage.ts` deve ser trocado para usar o SDK de Storage, mantendo
   as funções `readStorage` / `writeStorage` / `statStorage`. O download continua a passar
   por `/api/clips/[id]/download`, que verifica `canDownload` no servidor.

## 3. Publicar o worker num host com FFmpeg

Opção recomendada: Railway, Render ou Fly.io com o `Dockerfile.worker` incluído:

```bash
docker build -f Dockerfile.worker -t lubacortes-worker .
```

Variáveis do worker: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_STORAGE_BUCKET`, `OPENAI_API_KEY`, `WORKER_API_TOKEN`, `APP_SECRET`,
`PAYMENT_TEST_CONFIRM_TOKEN`.

## 4. Configurar a Vercel

1. `vercel link` (conta `lubatechnology-9737`) ou importar o repositório no dashboard.
2. Project → Settings → Environment Variables: copiar todas as variáveis de
   `.env.vercel.example` com os valores reais. **Nunca** colocar chaves no frontend.
3. `npm run check:deploy` valida o que falta sem mostrar valores secretos.
4. `vercel --prod` para publicar.

## 5. Adaptadores de IA (Groq — gratuito)

Uma única `GROQ_API_KEY` serve para transcrição e tradução:

- **Transcrição:** `TRANSCRIPTION_PROVIDER=groq` → `whisper-large-v3-turbo` com timestamps
  por segmento. Camada gratuita: 20 req/min, 2.000 req/dia, 7.200 s de áudio/hora,
  uploads até 25 MB. O código divide áudios longos em pedaços de 10 min (`TRANSCRIBE_CHUNK_SECONDS`)
  e reajusta os tempos — ver `src/lib/ai/transcribe.ts`.
- **Tradução:** `TRANSLATION_PROVIDER=groq` → `llama-3.3-70b-versatile`, um segmento de cada
  vez (`src/lib/ai/translate.ts`). Idiomas: pt, pt-AO, en, fr, es, it, de, ar, zh.
- Alternativa paga: `OPENAI_API_KEY` com `TRANSCRIPTION_PROVIDER=openai` e
  `TRANSLATION_PROVIDER=openai`.
- Alternativa 100% gratuita sem chave: `TRANSCRIPTION_PROVIDER=local` (Whisper via
  Transformers.js) e `TRANSLATION_PROVIDER=libretranslate` (servidor próprio).

Sem chave, o sistema mantém o estado honesto: aviso de "sem transcrição" e legenda marcada
como NÃO TRADUZIDA. Não simula resultados. Erros 429 do Groq são reportados com o tempo
de espera indicado pelo provedor.

## 6. Verificação depois do deploy

- [ ] Registo/login e isolamento de contas
- [ ] Importação de vídeo e consumo de minutos do plano
- [ ] Análise → momentos → cortes gerados pelo worker externo
- [ ] Legendas em vários idiomas
- [ ] Download bloqueado para cortes não desbloqueados
- [ ] Planos/pacotes e confirmação de pagamento de teste com token
- [ ] Painel administrativo e registos financeiros

## Trabalho de código restante para o deploy real

O esquema, as variáveis e o worker estão prontos. Antes de publicar é necessário trocar
apenas a camada de repositório:

1. `src/lib/db.ts` — implementar `get/all/run` com `pg` quando `DATABASE_URL` existir
   (manter SQLite como fallback local).
2. `src/lib/storage.ts` — implementar leitura/escrita com Supabase Storage.
3. `src/lib/queue.ts` — passar a fila para Postgres com `SKIP LOCKED` ou Redis/BullMQ;
   a interface `claim/complete/failJob` mantém-se.
4. O worker passa a ligar-se à mesma base de dados Postgres partilhada.

Nenhuma funcionalidade existente é removida — apenas o backend de persistência é
substituído por serviços geridos.

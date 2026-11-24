# Importação de vídeos do YouTube

**Estado: funcional na nuvem.** Um link público do YouTube é descarregado pelo worker em
GitHub Actions, analisado e convertido em cortes — sem qualquer passo técnico para o utilizador.

## Como funciona

1. O utilizador cola o link; `/api/sources/youtube/import` cria o projecto e coloca um job `analyze`
   na fila com `youtubeUrl`.
2. O worker (`worker/index.ts` → `worker/once.ts` → `runAnalyzeJob`) chama
   `baixarYouTube()` em `src/lib/video/youtube-download.ts`, que usa `yt-dlp` com vários clientes
   públicos (`web_safari`, `android`, `tv_embedded`, `ios`).
3. O vídeo é guardado no Supabase Storage e o processamento normal (FFmpeg, transcrição Groq,
   momentos, cortes, legendas) continua igual ao de um upload.

## Por que é que foi preciso o Cloudflare WARP

O YouTube bloqueia intervalos IP de datacenters (GitHub Actions, Vercel, AWS) com o erro
`Sign in to confirm you're not a bot`. O mesmo `yt-dlp` funciona num IP residencial.

O `.github/workflows/worker.yml` instala o cliente **Cloudflare WARP** (gratuito) antes de
processar. Como nem todos os IPs de saída do WARP são aceites, o workflow **roda a ligação até
o YouTube aceitar**: para cada tentativa liga/desliga o WARP, obtém um IP novo e valida com um
`yt-dlp --dump-single-json --skip-download` num vídeo de teste. Só depois corre `npm run worker:once`.

Isto substitui a antiga dependência de cookies da máquina do proprietário: **nenhum cookie pessoal
é usado no worker**. A variável `YOUTUBE_COOKIES` ficou apenas como fallback opcional e está vazia.

## PO Tokens — o que foi considerado

O `bgutil-ytdlp-pot-provider` (open-source, mantido por um maintainer do yt-dlp) gera Proof-of-Origin
tokens que ajudam com erros 403. Contudo, o próprio projecto avisa:
> *"a PO Token does not bypass IP-based login restrictions. If you still get 'Sign in to confirm
> you're not a bot' ... you additionally need to pass cookies."*

Por isso o PO Token não resolve o bloqueio de IP; a solução adoptada foi a saída de rede WARP.

## O que o OpusClip faz

A documentação do OpusClip reconhece que *"users have faced challenges uploading videos from
YouTube links due to YouTube's download policy updates... temporarily increased failure rates"*
e recomenda o upload local como alternativa. A sua funcionalidade estável é o **Auto Import**:
o utilizador liga o **próprio canal** via Google/YouTube e o serviço processa apenas os vídeos
públicos desse canal.

## Limites e boas práticas

- Só devem ser processados vídeos que o utilizador possui ou tem licença para editar.
- Links privados, não listados ou com restrição etária podem continuar a falhar.
- Se o YouTube bloquear, a interface mostra um convite simples para carregar o ficheiro —
  sem mensagens técnicas.
- O download consome minutos do plano; um vídeo de 87 min exige 87 min disponíveis.

## Verificação usada

Projecto de teste com `dQw4w9WgXcQ` (213 s): job `succeeded`, projecto `ready`,
**1 momento e 1 corte `ready`**, gerados inteiramente no GitHub Actions.

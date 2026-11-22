# Modelos self-hosted (open-source)

O Lubacortes aceita substituir os adaptadores geridos por inferência própria.

## Variáveis

```
TRANSCRIPTION_PROVIDER=selfhost
WHISPERX_URL=http://whisperx:8000

TRANSLATION_PROVIDER=selfhost
VLLM_BASE_URL=http://vllm:8000
VLLM_MODEL=Qwen/Qwen2.5-14B-Instruct
VLLM_API_KEY=

AUTOFOCUS_PROVIDER=selfhost
DEEPFACE_URL=http://deepface:5000
```

## Contratos

### WhisperX (`POST /transcribe`)
Recebe multipart `file` (wav) e devolve:
```json
{ "language": "pt", "segments": [{ "start": 0, "end": 3.2, "text": "..." }] }
```

### vLLM (`POST /v1/chat/completions`)
Compatível com a API OpenAI — basta apontar `VLLM_BASE_URL`.

### DeepFace (`POST /detect`)
Recebe `{ "image": "<base64>" }` e devolve `{ "x": 0.5, "y": 0.4 }` (coordenadas normalizadas).

## Exemplos de arranque

```bash
# WhisperX
docker run -p 8000:8000 ghcr.io/m-bain/whisperx:latest

# vLLM (requer GPU)
docker run --gpus all -p 8001:8000 vllm/vllm-openai:latest --model Qwen/Qwen2.5-14B-Instruct

# DeepFace
docker run -p 5000:5000 serengil/deepface:latest
```

Estes serviços podem correr no mesmo host do worker. O Groq continua disponível como alternativa gratuita sem GPU.

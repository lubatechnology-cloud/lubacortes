import path from "node:path";
import "./env";

function str(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function int(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

const root = process.cwd();

export const config = {
  root,
  appUrl: str("APP_URL") || (process.env.VERCEL === "1" ? "https://lubacortes.vercel.app" : "http://localhost:3000"),
  secret: str("APP_SECRET", "dev-secret-change-me-immediately"),
  databasePath: path.resolve(root, str("DATABASE_PATH", "./data/lubacortes.db")),
  storageDir: path.resolve(root, str("STORAGE_DIR", "./storage")),
  maxUploadBytes: int("MAX_UPLOAD_MB", 2048) * 1024 * 1024,
  ffmpegPath: str("FFMPEG_PATH") || undefined,
  ffprobePath: str("FFPROBE_PATH") || undefined,
  workerConcurrency: int("WORKER_CONCURRENCY", 1),
  renderTimeoutMs: int("RENDER_TIMEOUT_MS", 900000),
  watermarkFont: str("WATERMARK_FONT_PATH", "C:/Windows/Fonts/arial.ttf"),
  allowedVideoHosts: str("ALLOWED_VIDEO_HOSTS", "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  transcription: {
    provider: str("TRANSCRIPTION_PROVIDER", "none") as "none" | "local" | "openai" | "groq" | "selfhost",
    openaiKey: str("OPENAI_API_KEY"),
    openaiModel: str("OPENAI_TRANSCRIBE_MODEL", "whisper-1"),
    localModel: str("LOCAL_WHISPER_MODEL", "Xenova/whisper-tiny"),
    // Groq — camada gratuita com Whisper Large v3 Turbo e API compatível com OpenAI
    groqKey: str("GROQ_API_KEY"),
    groqModel: str("GROQ_TRANSCRIBE_MODEL", "whisper-large-v3-turbo"),
    groqBaseUrl: str("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
    groqMaxBytes: int("GROQ_MAX_UPLOAD_MB", 24) * 1024 * 1024,
    // Duração de cada pedaço de áudio enviado ao provedor (respeita o limite de upload)
    chunkSeconds: int("TRANSCRIBE_CHUNK_SECONDS", 600),
  },
  translation: {
    provider: str("TRANSLATION_PROVIDER", "none") as "none" | "openai" | "libretranslate" | "groq" | "selfhost",
    libretranslateUrl: str("LIBRETRANSLATE_URL"),
    libretranslateKey: str("LIBRETRANSLATE_API_KEY"),
    groqKey: str("GROQ_API_KEY"),
    groqModel: str("GROQ_CHAT_MODEL", "openai/gpt-oss-20b"),
    groqBaseUrl: str("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
  },
  ai: {
    minClipSeconds: int("AI_MIN_CLIP_SECONDS", 8),
    maxClipSeconds: int("AI_MAX_CLIP_SECONDS", 60),
    maxClips: int("AI_MAX_CLIPS", 12),
  },
  autofocus: {
    provider: str("AUTOFOCUS_PROVIDER", "none") as "none" | "model" | "manual" | "selfhost",
    model: str("AUTOFOCUS_MODEL", "AdamCodd/YOLOv11n-face-detection"),
    intervalSeconds: int("AUTOFOCUS_INTERVAL_SECONDS", 2),
  },
  payments: {
    mode: "test" as const, // modo de teste é fixo: nunca cobrar dinheiro real
    referenceEnabled: bool("PAYMENT_REFERENCE_ENABLED", true),
    expressEnabled: bool("PAYMENT_EXPRESS_ENABLED", true),
    testConfirmToken: str("PAYMENT_TEST_CONFIRM_TOKEN", ""),
    webhookSecret: str("PAYMENT_WEBHOOK_SECRET", ""),
  },
  mail: {
    smtpUrl: str("SMTP_URL"),
    from: str("MAIL_FROM", "noreply@lubacortes.local"),
  },
  google: {
    clientId: str("GOOGLE_CLIENT_ID"),
    clientSecret: str("GOOGLE_CLIENT_SECRET"),
    redirectUri: str("GOOGLE_REDIRECT_URI"),
  },
};

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  // Preços são apenas SIMULAÇÕES em modo de teste e podem ser alterados pelo admin.
  "pricing.reference_price_cents": 1500,
  "pricing.express_price_cents": 1500,
  "pricing.transfer_price_cents": 1500,
  "pricing.currency": "AOA",
  // Dados de teste fornecidos pelo proprietário; configuráveis no painel administrativo.
  "payments.transfer_iban": str("PAYMENT_TRANSFER_IBAN", "0040 0000 4040 6279 1012 5"),
  "payments.transfer_bank": str("PAYMENT_TRANSFER_BANK", "BAI"),
  "payments.transfer_account_name": str("PAYMENT_TRANSFER_ACCOUNT_NAME", "Fausto Silva"),
  "pricing.unlock_all_credits": 1,
  "pricing.credits_per_purchase": 3,
  "pricing.credit_per_clip": 1,
  "limits.projects_per_user": 100,
  "limits.clips_per_project": 12,
  "limits.max_video_minutes": 180,
  "ai.enabled_categories": [
    "impacto",
    "educativo",
    "historia",
    "humor",
    "opiniaoforte",
    "pergunta",
    "explicacao",
    "emocao",
    "curiosidade",
    "partilha",
  ],
  "ai.min_score": 0.28,
  "payments.reference_enabled": true,
  "payments.express_enabled": true,
  "transcription.provider": config.transcription.provider,
  "translation.provider": config.translation.provider,
};

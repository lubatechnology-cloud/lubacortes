-- =============================================================================
-- LUBACORTES — Esquema da base de dados
-- Desenhado para SQLite (local) com equivalentes directos em PostgreSQL/Supabase.
-- Toda a propriedade é isolada por user_id; o backend aplica esse isolamento.
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  email_verified_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  plan_id TEXT NOT NULL DEFAULT 'plan_free',
  plan_period_start TEXT,
  plan_period_end TEXT,
  plan_status TEXT NOT NULL DEFAULT 'active',
  auto_renew INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('verify','reset')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('url','upload')),
  source_url TEXT,
  storage_path TEXT,
  thumbnail_path TEXT,
  duration REAL,
  width INTEGER,
  height INTEGER,
  detected_language TEXT,
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','importing','analyzing','ready','failed')),
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('analyze','render','translate')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  progress INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  stage TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  payload_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT,
  error TEXT,
  run_after TEXT NOT NULL,
  locked_at TEXT,
  locked_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_queue ON jobs(status, run_after);
CREATE INDEX IF NOT EXISTS idx_jobs_project ON jobs(project_id);

CREATE TABLE IF NOT EXISTS moments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  start_sec REAL NOT NULL,
  end_sec REAL NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reason TEXT NOT NULL,
  score REAL NOT NULL,
  category TEXT NOT NULL,
  emocao TEXT NOT NULL DEFAULT 'neutro',
  intensidade REAL NOT NULL DEFAULT 0,
  transcript TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_moments_project ON moments(project_id, score DESC);

CREATE TABLE IF NOT EXISTS clips (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  moment_id TEXT REFERENCES moments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  start_sec REAL NOT NULL,
  end_sec REAL NOT NULL,
  duration REAL NOT NULL,
  format TEXT NOT NULL,
  subtitle_lang TEXT NOT NULL,
  style_json TEXT NOT NULL DEFAULT '{}',
  storage_path TEXT,
  thumb_path TEXT,
  focus_x REAL,
  focus_y REAL,
  style_preset TEXT NOT NULL DEFAULT 'padrao',
  intro_path TEXT,
  outro_path TEXT,
  hashtags TEXT NOT NULL DEFAULT '',
  cta TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','rendering','ready','failed')),
  is_unlocked INTEGER NOT NULL DEFAULT 0,
  unlock_kind TEXT CHECK (unlock_kind IN ('free','paid')),
  unlocked_by_payment_id TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clips_project ON clips(project_id);
CREATE INDEX IF NOT EXISTS idx_clips_user ON clips(user_id);

-- Uma conta só pode escolher UM corte gratuito, uma única vez.
-- Legendas editáveis por corte (texto original e texto apresentado).
CREATE TABLE IF NOT EXISTS subtitle_segments (
  id TEXT PRIMARY KEY,
  clip_id TEXT NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  start_sec REAL NOT NULL,
  end_sec REAL NOT NULL,
  source_text TEXT NOT NULL DEFAULT '',
  display_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE(clip_id, idx)
);
CREATE INDEX IF NOT EXISTS idx_subtitles_clip ON subtitle_segments(clip_id, idx);

-- Modelos de marca e utilizadores adicionais (plano Agência).
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_path TEXT,
  subtitle_style_json TEXT NOT NULL DEFAULT '{}',
  intro_path TEXT,
  outro_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS brand_members (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  created_at TEXT NOT NULL,
  UNIQUE(brand_id, user_id)
);

-- Publicação/agendamento — preparado, mas SEMPRE em modo TESTE até integração oficial.
CREATE TABLE IF NOT EXISTS publications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clip_id TEXT NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'test_pending'
    CHECK (status IN ('test_pending','test_sent','test_failed','cancelled')),
  mode TEXT NOT NULL DEFAULT 'test' CHECK (mode IN ('test','live')),
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS processing_queue (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS free_selections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  clip_id TEXT NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_credits_user ON credit_ledger(user_id);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AOA',
  credits INTEGER NOT NULL DEFAULT 0,
  input_minutes INTEGER NOT NULL DEFAULT 0,
  max_video_minutes INTEGER NOT NULL DEFAULT 0,
  max_exports INTEGER NOT NULL DEFAULT 1,
  watermark INTEGER NOT NULL DEFAULT 1,
  recurring_credits INTEGER NOT NULL DEFAULT 0,
  max_width INTEGER NOT NULL DEFAULT 0,
  autofocus_level TEXT NOT NULL DEFAULT 'none' CHECK (autofocus_level IN ('none','basic','tracking','group')),
  subtitle_styles INTEGER NOT NULL DEFAULT 1,
  animated_subtitles INTEGER NOT NULL DEFAULT 0,
  custom_branding INTEGER NOT NULL DEFAULT 0,
  multiple_users INTEGER NOT NULL DEFAULT 0,
  batch_export INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  auto_publish INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS minute_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AOA',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Período mensal de utilização (renovação sem cobrança automática).
CREATE TABLE IF NOT EXISTS usage_periods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  input_seconds_used INTEGER NOT NULL DEFAULT 0,
  exports_used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, period_start)
);

CREATE TABLE IF NOT EXISTS minute_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta_seconds INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_minutes_user ON minute_ledger(user_id);

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('input_minutes','export_clip','plan_allowance','minute_pack')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_events(user_id, created_at DESC);

-- Custos medidos por utilizador/projecto/processamento (sem margens fictícias).
CREATE TABLE IF NOT EXISTS cost_records (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  project_id TEXT,
  job_id TEXT,
  service TEXT NOT NULL,
  operation TEXT NOT NULL,
  units REAL NOT NULL,
  unit_cost_cents REAL NOT NULL DEFAULT 0,
  cost_cents REAL NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_costs_user ON cost_records(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('reference','express','transfer')),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AOA',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','paid','expired','cancelled','failed')),
  provider_ref TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'test' CHECK (mode IN ('test','live')),
  confirmed_at TEXT,
  confirmed_by TEXT,
  kind TEXT NOT NULL DEFAULT 'credits' CHECK (kind IN ('credits','plan','minute_pack')),
  reference_id TEXT,
  period_months INTEGER NOT NULL DEFAULT 1,
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('charge','credit','refund')),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AOA',
  status TEXT NOT NULL,
  external_ref TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  project_id TEXT,
  service TEXT NOT NULL,
  operation TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS processing_errors (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  project_id TEXT,
  user_id TEXT,
  message TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  meta_json TEXT NOT NULL DEFAULT '{}',
  ip TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

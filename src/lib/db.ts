import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import Database from "better-sqlite3";
import { config, DEFAULT_SETTINGS } from "./config";

let instance: Database.Database | null = null;
let pgStub: unknown = null;

/** Em produção (Vercel) usamos o Postgres do Supabase; em dev, SQLite local. */
function usePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL) && (process.env.VERCEL === "1" || process.env.NODE_ENV === "production");
}

const PG_BRIDGE = `
(async () => {
  let input = '';
  process.stdin.on('data', d => input += d);
  process.stdin.on('end', async () => {
    try {
      const { url, key, sql, params } = JSON.parse(input);
      const lit = v => v === null || v === undefined ? 'NULL'
        : typeof v === 'number' ? String(v)
        : typeof v === 'boolean' ? (v ? 'true' : 'false')
        : "'" + String(v).replace(/'/g, "''") + "'";
      let i = 0;
      const query = sql.replace(/\\?/g, () => lit(params[i++]));
      const res = await fetch(String(url).replace(/\\/$/, '') + '/rest/v1/rpc/exec_sql', {
        method: 'POST',
        headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const text = await res.text();
      if (!res.ok) { process.stdout.write(JSON.stringify({ error: text.slice(0, 600) })); return; }
      const rows = JSON.parse(text || '[]');
      process.stdout.write(JSON.stringify({ rows, rowCount: rows.length || 1 }));
    } catch (e) {
      process.stdout.write(JSON.stringify({ error: String((e && e.message) || e) }));
    }
  });
})();
`;

function pgQuery<T>(sql: string, params: unknown[]): { rows: T[]; rowCount: number } {
  const raw = execFileSync(process.execPath, ["-e", PG_BRIDGE], {
    input: JSON.stringify({
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      sql,
      params,
    }),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 30_000,
  });
  const out = JSON.parse(raw) as { rows: T[]; rowCount: number; error?: string };
  if (out.error) throw new Error(out.error);
  return out;
}

export function getDb(): Database.Database {
  if (usePostgres()) {
    if (!pgStub) pgStub = { transaction: (fn: () => unknown) => () => fn() };
    return pgStub as Database.Database;
  }
  if (instance) return instance;
  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
  const db = new Database(config.databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(path.join(config.root, "src", "lib", "schema.sql"), "utf8");
  db.exec(schema);
  migrate(db);
  instance = db;
  seedSettings(db);
  return db;
}

/**
 * Migração idempotente: bases criadas antes do método "transfer" são reconstruídas.
 * SQLite não permite alterar CHECK constraints, daí a recriação da tabela.
 */
function addColumnIfMissing(db: Database.Database, table: string, column: string, definition: string) {
  const cols = db.pragma(`table_info(${table})`) as { name: string }[];
  if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function migrate(db: Database.Database) {
  // Colunas adicionadas pelo sistema comercial (seguras para bases já existentes).
  addColumnIfMissing(db, "users", "plan_id", "TEXT NOT NULL DEFAULT 'plan_free'");
  addColumnIfMissing(db, "users", "plan_period_start", "TEXT");
  addColumnIfMissing(db, "users", "plan_period_end", "TEXT");
  addColumnIfMissing(db, "users", "plan_status", "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfMissing(db, "users", "auto_renew", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "plans", "input_minutes", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "plans", "max_video_minutes", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "plans", "max_exports", "INTEGER NOT NULL DEFAULT 1");
  addColumnIfMissing(db, "plans", "watermark", "INTEGER NOT NULL DEFAULT 1");
  addColumnIfMissing(db, "plans", "recurring_credits", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "plans", "max_width", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "plans", "autofocus_level", "TEXT NOT NULL DEFAULT 'none'");
  addColumnIfMissing(db, "plans", "subtitle_styles", "INTEGER NOT NULL DEFAULT 1");
  addColumnIfMissing(db, "plans", "animated_subtitles", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "plans", "custom_branding", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "plans", "multiple_users", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "plans", "batch_export", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "plans", "priority", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "plans", "auto_publish", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "clips", "style_preset", "TEXT NOT NULL DEFAULT 'padrao'");
  addColumnIfMissing(db, "clips", "intro_path", "TEXT");
  addColumnIfMissing(db, "clips", "outro_path", "TEXT");
  addColumnIfMissing(db, "payments", "kind", "TEXT NOT NULL DEFAULT 'credits'");
  addColumnIfMissing(db, "payments", "reference_id", "TEXT");
  addColumnIfMissing(db, "payments", "period_months", "INTEGER NOT NULL DEFAULT 1");
  addColumnIfMissing(db, "users", "phone", "TEXT");
  addColumnIfMissing(db, "users", "notify_email", "INTEGER NOT NULL DEFAULT 1");
  addColumnIfMissing(db, "users", "notify_whatsapp", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "projects", "notified_at", "TEXT");
  addColumnIfMissing(db, "projects", "remote_path", "TEXT");
  addColumnIfMissing(db, "clips", "remote_path", "TEXT");
  addColumnIfMissing(db, "clips", "thumb_remote_path", "TEXT");
  addColumnIfMissing(db, "moments", "emocao", "TEXT NOT NULL DEFAULT 'neutro'");
  addColumnIfMissing(db, "moments", "intensidade", "REAL NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "jobs", "priority", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "clips", "focus_x", "REAL");
  addColumnIfMissing(db, "clips", "focus_y", "REAL");
  addColumnIfMissing(db, "clips", "hashtags", "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "clips", "cta", "TEXT NOT NULL DEFAULT ''");
  seedCommercial(db);

  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='payments'").get() as { sql: string } | undefined;
  if (!row || row.sql.includes("'transfer'")) return;
  db.pragma("foreign_keys = OFF");
  const tx = db.transaction(() => {
    db.exec(`
      CREATE TABLE payments_new (
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
        kind TEXT NOT NULL DEFAULT 'credits',
        reference_id TEXT,
        period_months INTEGER NOT NULL DEFAULT 1,
        meta_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO payments_new SELECT id,user_id,method,amount_cents,currency,status,provider_ref,idempotency_key,credits,description,mode,confirmed_at,confirmed_by,kind,reference_id,period_months,meta_json,created_at,updated_at FROM payments;
      DROP TABLE payments;
      ALTER TABLE payments_new RENAME TO payments;
      CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);
    `);
  });
  tx();
  db.pragma("foreign_keys = ON");
  console.log("[db] migração aplicada: método de transferência IBAN adicionado.");
}

function seedCommercial(db: Database.Database) {
  const now = new Date().toISOString();
  // Planos legados são desactivados (mantidos na BD para compatibilidade de registos antigos).
  db.prepare("UPDATE plans SET is_active=0 WHERE id IN ('plan_essential','plan_enterprise')").run();
  const already = db.prepare("SELECT value_json FROM settings WHERE key='commercial.v2_seeded'").get() as { value_json: string } | undefined;
  if (!already) {
    const upsert = db.prepare(
      "INSERT INTO plans (id,name,description,price_cents,currency,credits,input_minutes,max_video_minutes,max_exports,watermark,recurring_credits,max_width,autofocus_level,subtitle_styles,animated_subtitles,custom_branding,multiple_users,batch_export,priority,auto_publish,is_active,sort_order,created_at,updated_at) " +
      "VALUES (?,?,?,?,'AOA',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?) " +
      "ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, price_cents=excluded.price_cents, credits=excluded.credits, input_minutes=excluded.input_minutes, max_video_minutes=excluded.max_video_minutes, max_exports=excluded.max_exports, watermark=excluded.watermark, max_width=excluded.max_width, autofocus_level=excluded.autofocus_level, subtitle_styles=excluded.subtitle_styles, animated_subtitles=excluded.animated_subtitles, custom_branding=excluded.custom_branding, multiple_users=excluded.multiple_users, batch_export=excluded.batch_export, priority=excluded.priority, auto_publish=excluded.auto_publish, sort_order=excluded.sort_order, updated_at=excluded.updated_at",
    );
    // id, nome, descrição, preço, créditos, min/mês, max min/vídeo, cortes, marca, créditos recorrentes,
    // largura máx., autofoco, estilos, animadas, branding, multi-utilizador, lote, prioridade, auto-publicação, ordem
    const plans: (string | number)[][] = [
      ["plan_free", "GRATUITO", "Ideal para novos utilizadores. 1 corte grátis, legendas automáticas, idioma à escolha, 9:16 até 720p, com marca de água.", 0, 0, 10, 10, 1, 1, 0, 720, "none", 1, 0, 0, 0, 0, 0, 0, 0],
      ["plan_creator", "CRIADOR", "Para criadores individuais. 30 cortes/mês, vídeos até 30 min, vários idiomas, sem marca de água, 9:16/1:1/16:9, autofoco e HD.", 350000, 0, 120, 30, 30, 0, 0, 1280, "basic", 5, 0, 0, 0, 0, 0, 0, 1],
      ["plan_pro", "PROFISSIONAL", "Para influenciadores, YouTubers e empresas. 100 cortes/mês, até 90 min, legendas animadas, rastreamento de rosto, Full HD e agendamento (teste).", 750000, 0, 400, 90, 100, 0, 0, 1920, "tracking", 5, 1, 1, 0, 0, 1, 1, 2],
      ["plan_agency", "AGÊNCIA", "Para agências e equipas. 300 cortes/mês, até 3 h, várias contas e marcas, exportação em lote, estatísticas e prioridade.", 1750000, 0, 1200, 180, 300, 0, 0, 1920, "group", 5, 1, 1, 1, 1, 2, 1, 3],
    ];
    const tx = db.transaction(() => {
      for (const p of plans) upsert.run(...p, now, now);
      db.prepare("UPDATE users SET plan_id='plan_creator' WHERE plan_id='plan_essential'").run();
      db.prepare("UPDATE users SET plan_id='plan_agency' WHERE plan_id='plan_enterprise'").run();
      db.prepare("INSERT INTO settings (key,value_json,updated_at) VALUES ('commercial.v2_seeded','true',?) ON CONFLICT(key) DO UPDATE SET value_json='true'").run(now);
    });
    tx();
  }
  const pack = db.prepare(
    "INSERT OR IGNORE INTO minute_packages (id,name,minutes,price_cents,currency,is_active,sort_order,created_at,updated_at) VALUES (?,?,?,?,'AOA',1,?,?,?)",
  );
  const tx = db.transaction(() => {
    pack.run("pack_60", "60 minutos", 60, 200000, 1, now, now);
    pack.run("pack_150", "150 minutos", 150, 450000, 2, now, now);
    pack.run("pack_300", "300 minutos", 300, 800000, 3, now, now);
    pack.run("pack_600", "600 minutos", 600, 1400000, 4, now, now);
  });
  tx();
}

function seedSettings(db: Database.Database) {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)",
  );
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insert.run(key, JSON.stringify(value), now);
    }
  });
  tx();
}

export function all<T = Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
): T[] {
  if (usePostgres()) return pgQuery<T>(sql, params).rows;
  return getDb().prepare(sql).all(...params) as T[];
}

export function get<T = Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
): T | undefined {
  if (usePostgres()) return pgQuery<T>(sql, params).rows[0];
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export function run(sql: string, ...params: unknown[]): Database.RunResult {
  if (usePostgres()) {
    const r = pgQuery<Record<string, unknown>>(sql, params);
    return { changes: r.rowCount, lastInsertRowid: BigInt(0) };
  }
  return getDb().prepare(sql).run(...params);
}

export function setting<T>(key: string, fallback: T): T {
  try {
    const row = get<{ value_json: string }>("SELECT value_json FROM settings WHERE key = ?", key);
    if (!row) return fallback;
    return JSON.parse(row.value_json) as T;
  } catch {
    // Base de dados indisponível (ex.: filesystem efémero em serverless).
    return fallback;
  }
}

export function setSetting(key: string, value: unknown): void {
  run(
    "INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?) " +
      "ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at",
    key,
    JSON.stringify(value),
    new Date().toISOString(),
  );
}

export function uid(prefix = ""): string {
  return prefix + crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

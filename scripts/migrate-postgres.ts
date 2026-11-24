import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

async function main() {
  const url = fs.readFileSync(path.join(process.cwd(), "keys.txt"), "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="))!.slice(13);
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const alterations: [string, string][] = [
    ["plans", "max_video_minutes INTEGER NOT NULL DEFAULT 0"],
    ["plans", "max_width INTEGER NOT NULL DEFAULT 0"],
    ["plans", "autofocus_level TEXT NOT NULL DEFAULT 'none'"],
    ["plans", "subtitle_styles INTEGER NOT NULL DEFAULT 1"],
    ["plans", "animated_subtitles INTEGER NOT NULL DEFAULT 0"],
    ["plans", "custom_branding INTEGER NOT NULL DEFAULT 0"],
    ["plans", "multiple_users INTEGER NOT NULL DEFAULT 0"],
    ["plans", "batch_export INTEGER NOT NULL DEFAULT 0"],
    ["plans", "priority INTEGER NOT NULL DEFAULT 0"],
    ["plans", "auto_publish INTEGER NOT NULL DEFAULT 0"],
    ["clips", "focus_x REAL"], ["clips", "focus_y REAL"],
    ["clips", "style_preset TEXT NOT NULL DEFAULT 'padrao'"],
    ["clips", "intro_path TEXT"], ["clips", "outro_path TEXT"],
    ["clips", "hashtags TEXT NOT NULL DEFAULT ''"], ["clips", "cta TEXT NOT NULL DEFAULT ''"],
    ["jobs", "priority INTEGER NOT NULL DEFAULT 0"],
    ["payments", "kind TEXT NOT NULL DEFAULT 'credits'"],
    ["payments", "reference_id TEXT"],
    ["payments", "period_months INTEGER NOT NULL DEFAULT 1"],
    ["users", "plan_id TEXT NOT NULL DEFAULT 'plan_free'"],
    ["users", "plan_period_start TEXT"], ["users", "plan_period_end TEXT"],
    ["users", "plan_status TEXT NOT NULL DEFAULT 'active'"],
    ["users", "auto_renew INTEGER NOT NULL DEFAULT 0"],
    ["users", "google_sub TEXT"],
    ["users", "google_email TEXT"],
    ["users", "avatar_url TEXT"],
  ];
  for (const [table, def] of alterations) {
    await c.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${def}`);
  }
  await c.query("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL");
  console.log("Migração de colunas concluída.");
  await c.end();
}
main().catch((e) => { console.error("ERRO:", (e as Error).message); process.exit(1); });

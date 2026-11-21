import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

async function main() {
  const url = fs.readFileSync(path.join(process.cwd(), "keys.txt"), "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="))!.slice(13);
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const tables = ["users", "sessions", "email_tokens", "projects", "jobs", "moments", "clips", "subtitle_segments", "free_selections", "credit_ledger", "plans", "minute_packages", "usage_periods", "minute_ledger", "usage_events", "cost_records", "payments", "payment_events", "transactions", "api_usage", "processing_errors", "audit_logs", "settings", "brands", "brand_members", "publications", "processing_queue"];
  for (const t of tables) {
    await c.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
  }
  console.log("RLS activado em", tables.length, "tabelas.");
  const r = await c.query("SELECT id,name,price_cents FROM plans ORDER BY sort_order");
  console.log("Planos:", r.rows.map((x: { name: string; price_cents: string }) => `${x.name}=${x.price_cents}`).join(", "));
  await c.end();
}
main().catch((e) => { console.error("ERRO:", (e as Error).message); process.exit(1); });

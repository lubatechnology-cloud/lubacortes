import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

function readKey(file: string, name: string): string {
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith(name + "="));
  return line ? line.slice(name.length + 1).trim() : "";
}

async function main() {
  const url = readKey(path.join(process.cwd(), "keys.txt"), "DATABASE_URL");
  if (!url) throw new Error("DATABASE_URL não encontrada em keys.txt");
  const sql = fs.readFileSync(path.join(process.cwd(), "docs", "postgres-schema.sql"), "utf8");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("Ligação Postgres estabelecida.");
  await client.query(sql);
  console.log("Esquema aplicado.");
  const r = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log("Tabelas:", r.rows.map((x: { table_name: string }) => x.table_name).join(", "));
  await client.end();
}

main().catch((e) => { console.error("ERRO:", (e as Error).message); process.exit(1); });

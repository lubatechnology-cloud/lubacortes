/** Gera docs/postgres-schema.sql a partir do esquema SQLite, para o Supabase. */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = fs.readFileSync(path.join(root, "src", "lib", "schema.sql"), "utf8");
const body = src
  .split(/\r?\n/)
  .filter((line) => !/^PRAGMA\s/i.test(line))
  .map((line) => line.replace(/COLLATE NOCASE/gi, ""))
  .join("\n");
const header = [
  "-- LUBACORTES — esquema PostgreSQL para Supabase",
  "-- Gerado por: npm run schema:postgres",
  "-- Executar no SQL Editor do Supabase antes do deploy na Vercel.",
  "-- Os e-mails são normalizados para minúsculas no código (COLLATE NOCASE removido).",
  "",
].join("\n");
const out = path.join(root, "docs", "postgres-schema.sql");
fs.writeFileSync(out, header + "\n" + body, "utf8");
console.log("Esquema PostgreSQL gerado em", out);

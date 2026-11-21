import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

async function main() {
  const url = fs.readFileSync(path.join(process.cwd(), "keys.txt"), "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="))!.slice(13);
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(`
    CREATE OR REPLACE FUNCTION public.exec_sql(query text)
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
    DECLARE result jsonb;
    BEGIN
      IF lower(ltrim(query)) ~ '^(select|with)' THEN
        EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) FROM (%s) x', query) INTO result;
      ELSE
        EXECUTE query;
        result := '[]'::jsonb;
      END IF;
      RETURN result;
    END;
    $$;
    GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
  `);
  console.log("Função exec_sql criada.");
  await c.end();
}
main().catch((e) => { console.error((e as Error).message); process.exit(1); });

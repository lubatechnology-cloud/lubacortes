import fs from "node:fs";
import path from "node:path";

function readKey(file: string, name: string) {
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith(name + "="));
  return line ? line.slice(name.length + 1).trim() : "";
}

async function main() {
  const keyFile = path.join(process.cwd(), "keys.txt");
  const url = readKey(keyFile, "SUPABASE_URL");
  const key = readKey(keyFile, "SUPABASE_SERVICE_ROLE_KEY");
  const bucket = readKey(keyFile, "SUPABASE_STORAGE_BUCKET") || "lubacortes-private";
  const res = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
    body: JSON.stringify({ name: bucket, public: false }),
  });
  const body = await res.text();
  console.log("bucket HTTP", res.status, res.ok ? "criado" : body.slice(0, 300));
}
main().catch((e) => { console.error("ERRO:", (e as Error).message); process.exit(1); });

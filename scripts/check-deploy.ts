/** Valida a configuração de deploy sem revelar valores secretos. */
import fs from "node:fs";
import path from "node:path";

function loadEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let value = t.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value) out[key] = value;
  }
  return out;
}

const env = { ...loadEnv(path.join(process.cwd(), ".env.vercel.local")), ...process.env } as Record<string, string | undefined>;
const required = [
  "APP_URL", "APP_SECRET", "DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET", "WORKER_URL", "WORKER_API_TOKEN",
  "PAYMENT_TEST_CONFIRM_TOKEN", "PAYMENT_WEBHOOK_SECRET",
];
// A chave de IA depende do provedor escolhido: Groq (gratuito) ou OpenAI (pago).
const transcription = env.TRANSCRIPTION_PROVIDER || "groq";
const translation = env.TRANSLATION_PROVIDER || "groq";
const needsGroq = [transcription, translation].includes("groq");
const needsOpenAI = [transcription, translation].includes("openai");
if (needsGroq) required.push("GROQ_API_KEY");
if (needsOpenAI) required.push("OPENAI_API_KEY");
const recommended = ["SMTP_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "WATERMARK_FONT_PATH"];

let missing = 0;
console.log("Lubacortes — verificação de configuração para Vercel\n");
for (const key of required) {
  const ok = Boolean(env[key]);
  if (!ok) missing++;
  console.log(`${ok ? "OK     " : "FALTA  "} ${key}`);
}
for (const key of recommended) {
  console.log(`${env[key] ? "OK     " : "AVISO  "} ${key}`);
}
console.log("\nModo de pagamentos:", env.PAYMENT_MODE === "test" || !env.PAYMENT_MODE ? "test (correcto)" : "❌ NÃO TESTE — corrigir");
console.log("Transcrição:", transcription);
console.log("Tradução:", translation);
console.log("Provedor de IA:", needsGroq ? "Groq (camada gratuita)" : needsOpenAI ? "OpenAI (pago)" : "sem chave necessária");
console.log(`\n${missing === 0 ? "Configuração completa." : `Faltam ${missing} variável(is) obrigatória(s).`}`);
console.log("Nenhum valor secreto foi apresentado.");
process.exit(missing === 0 ? 0 : 1);

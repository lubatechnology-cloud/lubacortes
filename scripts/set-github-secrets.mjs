import fs from "node:fs";
import sodium from "libsodium-wrappers";

const token = fs.readFileSync(".github-token.txt", "utf8").trim();
const repo = "lubatechnology-cloud/lubacortes";
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "lubacortes-setup",
  "X-GitHub-Api-Version": "2022-11-28",
};

function readKey(file, name) {
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith(name + "="));
  return line ? line.slice(name.length + 1).trim() : "";
}

await sodium.ready;

const pubRes = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/public-key`, { headers });
if (!pubRes.ok) throw new Error(`Falha ao obter chave pública (${pubRes.status}): ${await pubRes.text()}`);
const pub = await pubRes.json();
pub.key = String(pub.key).replace(/\s/g, "");

const defaults = {
  APP_URL: "https://lubacortes.vercel.app",
  MAIL_FROM: "lubatechnology@gmail.com",
  TRANSCRIPTION_PROVIDER: "groq",
  TRANSLATION_PROVIDER: "groq",
  AUTOFOCUS_PROVIDER: "none",
  PAYMENT_MODE: "test",
  PAYMENT_REFERENCE_ENABLED: "true",
  PAYMENT_EXPRESS_ENABLED: "true",
  PAYMENT_TRANSFER_IBAN: "0040 0000 4040 6279 1012 5",
  PAYMENT_TRANSFER_BANK: "BAI",
  PAYMENT_TRANSFER_ACCOUNT_NAME: "Fausto Silva",
  GROQ_TRANSCRIBE_MODEL: "whisper-large-v3-turbo",
  GROQ_CHAT_MODEL: "openai/gpt-oss-20b",
  GROQ_BASE_URL: "https://api.groq.com/openai/v1",
  SUPABASE_STORAGE_BUCKET: "lubacortes-private",
};

const names = [
  "DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET",
  "GROQ_API_KEY", "APP_SECRET", "PAYMENT_TEST_CONFIRM_TOKEN", "PAYMENT_WEBHOOK_SECRET",
  "SMTP_URL", "MAIL_FROM", "APP_URL", "TRANSCRIPTION_PROVIDER", "TRANSLATION_PROVIDER",
  "GROQ_TRANSCRIBE_MODEL", "GROQ_CHAT_MODEL", "GROQ_BASE_URL", "AUTOFOCUS_PROVIDER",
  "PAYMENT_MODE", "PAYMENT_REFERENCE_ENABLED", "PAYMENT_EXPRESS_ENABLED",
  "PAYMENT_TRANSFER_IBAN", "PAYMENT_TRANSFER_BANK", "PAYMENT_TRANSFER_ACCOUNT_NAME",
  "YOUTUBE_COOKIES", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI",
  "KURSINHA_WEBHOOK_SECRET", "KURSINHA_PRODUCTS",
];

const keys = {};
for (const line of fs.readFileSync("keys.txt", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) keys[m[1]] = m[2];
}

let ok = 0;
for (const name of names) {
  let value = keys[name] || defaults[name] || "";
  if (name === "YOUTUBE_COOKIES" && fs.existsSync("youtube-cookies.txt")) {
    value = fs.readFileSync("youtube-cookies.txt", "utf8");
  }
  const encrypted = sodium.crypto_box_seal(
    Buffer.from(value, "utf8"),
    new Uint8Array(Buffer.from(pub.key, "base64")),
  );
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${name}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      encrypted_value: Buffer.from(encrypted).toString("base64"),
      key_id: pub.key_id,
    }),
  });
  if (!res.ok) throw new Error(`Falha em ${name}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  ok++;
  console.log("OK", name);
}
console.log(`Total: ${ok} secrets configurados`);

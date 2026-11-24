import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import Database from "better-sqlite3";

const base = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "Google", "Chrome", "User Data");
const localStatePath = path.join(base, "Local State");
const cookiesDb = path.join(base, "Default", "Network", "Cookies");

function dpapi(base64, scope = "LocalMachine") {
  const script = `Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String('${base64}'); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::${scope}))`;
  return execFileSync("powershell.exe", ["-NoProfile", "-Command", script], { encoding: "utf8" }).trim();
}

if (!fs.existsSync(localStatePath) || !fs.existsSync(cookiesDb)) throw new Error("Chrome ou cookies não encontrados.");

const state = JSON.parse(fs.readFileSync(localStatePath, "utf8"));
const encKey = state.os_crypt?.encrypted_key;
if (!encKey) throw new Error("Chave de encriptação do Chrome não encontrada.");
const rawKey = Buffer.from(encKey, "base64");
const key = Buffer.from(dpapi(rawKey.subarray(5).toString("base64")), "base64");

const tmp = path.join(os.tmpdir(), `luba-cookies-${Date.now()}.db`);
fs.copyFileSync(cookiesDb, tmp);
const db = new Database(tmp, { readonly: true });
const linhas = db.prepare(
  "SELECT host_key,name,encrypted_value,path,expires_utc FROM cookies WHERE host_key LIKE '%youtube.com%' OR host_key LIKE '%google.com%'",
).all();
db.close();
fs.rmSync(tmp, { force: true });

const valores = [];
for (const l of linhas) {
  const enc = Buffer.from(l.encrypted_value);
  let texto = "";
  const prefixo = enc.subarray(0, 3).toString();
  if (prefixo === "v10" || prefixo === "v11") {
    const nonce = enc.subarray(3, 15);
    const payload = enc.subarray(15);
    const tag = payload.subarray(payload.length - 16);
    const dados = payload.subarray(0, payload.length - 16);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAuthTag(tag);
    texto = Buffer.concat([decipher.update(dados), decipher.final()]).toString("utf8");
  } else {
    try { texto = Buffer.from(dpapi(enc.toString("base64"), "CurrentUser"), "base64").toString("utf8"); } catch { continue; }
  }
  if (!texto) continue;
  const dominio = l.host_key.startsWith(".") ? l.host_key : "." + l.host_key.replace(/^www\./, "");
  const expira = Math.max(0, Math.floor(l.expires_utc / 1_000_000 - 11644473600));
  valores.push(`${dominio}\tTRUE\t${l.path || "/"}\tTRUE\t${expira}\t${l.name}\t${texto}`);
}

if (!valores.length) throw new Error("Nenhum cookie do YouTube encontrado. Confirme que está logado no Chrome.");
const conteudo = ["# Netscape HTTP Cookie File", ...valores].join("\n") + "\n";
fs.writeFileSync(path.join(process.cwd(), "youtube-cookies.txt"), conteudo, "utf8");
console.log(`Cookies exportados: ${valores.length}`);

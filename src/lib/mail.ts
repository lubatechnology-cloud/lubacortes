import fs from "node:fs";
import path from "node:path";
import { config } from "./config";

/**
 * Correio em modo de desenvolvimento: os tokens são escritos num ficheiro local
 * e impressos no terminal. Nunca são enviados para endereços reais sem SMTP
 * configurado. Em produção, substituir por Supabase/Resend/SMTP.
 */
export function deliverToken(email: string, type: "verify" | "reset", token: string) {
  const outbox = path.join(config.root, "data", "mail-outbox.log");
  fs.mkdirSync(path.dirname(outbox), { recursive: true });
  const link = `${config.appUrl}/${type === "verify" ? "verificar-email" : "redefinir-senha"}?token=${token}`;
  const line = `[${new Date().toISOString()}] ${type.toUpperCase()} ${email} -> ${link}\n`;
  fs.appendFileSync(outbox, line, "utf8");
  console.log(`[mail:teste] ${type} para ${email}: ${link}`);
  return link;
}

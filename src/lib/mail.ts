import fs from "node:fs";
import path from "node:path";
import { config } from "./config";

/**
 * Correio em modo de desenvolvimento: os tokens são escritos num ficheiro local
 * e impressos no terminal. Nunca são enviados para endereços reais sem SMTP
 * configurado. Em produção, substituir por Supabase/Resend/SMTP.
 */
export function deliverToken(email: string, type: "verify" | "reset", token: string) {
  const link = `${config.appUrl}/${type === "verify" ? "verificar-email" : "redefinir-senha"}?token=${token}`;
  // Em serverless o filesystem é só de leitura: não tentar escrever ficheiros.
  if (process.env.VERCEL !== "1" && process.env.NODE_ENV !== "production") {
    try {
      const outbox = path.join(config.root, "data", "mail-outbox.log");
      fs.mkdirSync(path.dirname(outbox), { recursive: true });
      fs.appendFileSync(outbox, `[${new Date().toISOString()}] ${type.toUpperCase()} ${email} -> ${link}\n`, "utf8");
    } catch {
      /* ignorar falha de escrita local */
    }
  }
  console.log(`[mail] ${type} para ${email}`);
  return link;
}

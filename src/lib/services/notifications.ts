import nodemailer from "nodemailer";
import { all, get, nowIso, run } from "../db";

/** Notificação no fim do processamento. Email via SMTP; WhatsApp via API oficial Meta. */
export async function notificarSePronto(userId: string, projectId: string) {
  const pendentes = all<{ id: string }>(
    "SELECT id FROM jobs WHERE project_id=? AND status IN ('queued','running')", projectId,
  );
  if (pendentes.length > 0) return { enviado: false, motivo: "ainda há tarefas" };

  const project = get<{ id: string; notified_at: string | null; title: string }>(
    "SELECT id,notified_at,title FROM projects WHERE id=?", projectId,
  );
  if (!project || project.notified_at) return { enviado: false, motivo: "já notificado" };

  const user = get<{ email: string; phone: string | null; notify_email: number; notify_whatsapp: number }>(
    "SELECT email,phone,notify_email,notify_whatsapp FROM users WHERE id=?", userId,
  );
  if (!user) return { enviado: false, motivo: "utilizador não encontrado" };

  const link = `${process.env.APP_URL ?? "https://lubacortes.vercel.app"}/projecto/${projectId}`;
  const mensagem = `Olá! Os cortes do vídeo "${project.title}" estão prontos. Veja em: ${link}`;
  const resultados: string[] = [];

  if (user.notify_email && process.env.SMTP_URL) {
    try {
      const transporte = nodemailer.createTransport(process.env.SMTP_URL);
      await transporte.sendMail({
        from: process.env.MAIL_FROM ?? "noreply@lubacortes.local",
        to: user.email,
        subject: "Os seus cortes estão prontos — Lubacortes",
        text: mensagem,
      });
      resultados.push("email");
    } catch (e) { console.error("[notify] email falhou:", (e as Error).message); }
  }

  if (user.notify_whatsapp && user.phone && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: user.phone,
            type: "text",
            text: { body: mensagem },
          }),
        },
      );
      if (res.ok) resultados.push("whatsapp");
      else console.error("[notify] whatsapp falhou:", res.status, (await res.text()).slice(0, 200));
    } catch (e) { console.error("[notify] whatsapp falhou:", (e as Error).message); }
  }

  run("UPDATE projects SET notified_at=? WHERE id=?", nowIso(), projectId);
  return { enviado: resultados.length > 0, canais: resultados };
}

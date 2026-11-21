import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Client } from "pg";

function readKey(file: string, name: string): string {
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith(name + "="));
  return line ? line.slice(name.length + 1).trim() : "";
}
function saveKey(file: string, name: string, value: string) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const idx = lines.findIndex((l) => l.startsWith(name + "="));
  if (idx >= 0) lines[idx] = `${name}=${value}`;
  else lines.push(`${name}=${value}`);
  fs.writeFileSync(file, lines.join("\n"), "utf8");
}
function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

async function main() {
  const keyFile = path.join(process.cwd(), "keys.txt");
  const url = readKey(keyFile, "DATABASE_URL");
  if (!url) throw new Error("DATABASE_URL não encontrada");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const plans = [
    ["plan_free", "GRATUITO", "1 corte grátis, 720p, 9:16, marca de água.", 0, 10, 10, 1, 1, 720, "none", 1, 0, 0, 0, 0, 0, 0, 0],
    ["plan_creator", "CRIADOR", "30 cortes, 30 min/vídeo, HD, autofoco, 5 estilos.", 350000, 120, 30, 30, 0, 1280, "basic", 5, 0, 0, 0, 0, 0, 0, 1],
    ["plan_pro", "PROFISSIONAL", "100 cortes, 90 min, legendas animadas, Full HD, agendamento.", 750000, 400, 90, 100, 0, 1920, "tracking", 5, 1, 1, 0, 0, 1, 1, 2],
    ["plan_agency", "AGÊNCIA", "300 cortes, 3h/vídeo, marcas, lote e prioridade.", 1750000, 1200, 180, 300, 0, 1920, "group", 5, 1, 1, 1, 1, 2, 1, 3],
  ];
  for (const p of plans) {
    await client.query(
      `INSERT INTO plans (id,name,description,price_cents,currency,credits,input_minutes,max_video_minutes,max_exports,watermark,recurring_credits,max_width,autofocus_level,subtitle_styles,animated_subtitles,custom_branding,multiple_users,batch_export,priority,auto_publish,is_active,sort_order,created_at,updated_at)
       VALUES ($1,$2,$3,$4,'AOA',0,$5,$6,$7,$8,0,$9,$10,$11,$12,$13,$14,$15,$16,$17,1,$18,now(),now())
       ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, price_cents=EXCLUDED.price_cents,
       input_minutes=EXCLUDED.input_minutes, max_video_minutes=EXCLUDED.max_video_minutes, max_exports=EXCLUDED.max_exports,
       watermark=EXCLUDED.watermark, max_width=EXCLUDED.max_width, autofocus_level=EXCLUDED.autofocus_level,
       subtitle_styles=EXCLUDED.subtitle_styles, animated_subtitles=EXCLUDED.animated_subtitles,
       custom_branding=EXCLUDED.custom_branding, multiple_users=EXCLUDED.multiple_users,
       batch_export=EXCLUDED.batch_export, priority=EXCLUDED.priority, auto_publish=EXCLUDED.auto_publish,
       sort_order=EXCLUDED.sort_order, updated_at=now()`,
      p,
    );
  }
  const packs = [["pack_60", "60 minutos", 60, 200000, 1], ["pack_150", "150 minutos", 150, 450000, 2], ["pack_300", "300 minutos", 300, 800000, 3], ["pack_600", "600 minutos", 600, 1400000, 4]];
  for (const p of packs) {
    await client.query(
      `INSERT INTO minute_packages (id,name,minutes,price_cents,currency,is_active,sort_order,created_at,updated_at)
       VALUES ($1,$2,$3,$4,'AOA',1,$5,now(),now()) ON CONFLICT(id) DO NOTHING`, p,
    );
  }
  const settings: Record<string, unknown> = {
    "pricing.reference_price_cents": 1500, "pricing.express_price_cents": 1500,
    "pricing.transfer_price_cents": 1500, "pricing.currency": "AOA",
    "pricing.credits_per_purchase": 3, "pricing.unlock_all_credits": 1,
    "pricing.credit_per_clip": 1,
    "payments.transfer_iban": "0040 0000 4040 6279 1012 5",
    "payments.transfer_bank": "BAI", "payments.transfer_account_name": "Fausto Silva",
    "payments.reference_enabled": true, "payments.express_enabled": true,
    "limits.clips_per_project": 12, "limits.max_video_minutes": 180,
    "ai.min_score": 0.28, "ai.enabled_categories": ["impacto", "educativo", "historia", "humor", "opiniaoforte", "pergunta", "explicacao", "emocao", "curiosidade", "partilha"],
    "transcription.provider": "groq", "translation.provider": "groq",
    "cost.ffmpeg.render_clip_cents": 0, "cost.ai.transcription_cents": 0, "cost.ai.moment_detection_cents": 0,
  };
  for (const [k, v] of Object.entries(settings)) {
    await client.query(
      "INSERT INTO settings (key,value_json,updated_at) VALUES ($1,$2,now()) ON CONFLICT(key) DO UPDATE SET value_json=EXCLUDED.value_json",
      [k, JSON.stringify(v)],
    );
  }

  const adminEmail = "admin@lubacortes.local";
  const existing = await client.query("SELECT id FROM users WHERE email=$1", [adminEmail]);
  if (existing.rowCount === 0) {
    const password = crypto.randomBytes(9).toString("base64url");
    await client.query(
      "INSERT INTO users (id,email,name,password_hash,role,email_verified_at,plan_id,created_at,updated_at) VALUES ($1,$2,$3,$4,'admin',now(),'plan_agency',now(),now())",
      [crypto.randomUUID(), adminEmail, "Administrador", hashPassword(password)],
    );
    saveKey(keyFile, "ADMIN_PASSWORD", password);
    console.log("Administrador criado. Palavra-passe guardada em keys.txt (não mostrada).");
  } else {
    console.log("Administrador já existe.");
  }
  console.log("Seed concluído.");
  await client.end();
}

main().catch((e) => { console.error("ERRO:", (e as Error).message); process.exit(1); });

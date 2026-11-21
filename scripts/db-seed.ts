import crypto from "node:crypto";
import { getDb, nowIso, uid } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

const db = getDb();
const email = (process.env.ADMIN_EMAIL || "admin@lubacortes.local").toLowerCase();
const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");

if (db.prepare("SELECT 1 FROM users WHERE email=?").get(email)) {
  console.log("Administrador já existe:", email);
} else {
  const now = nowIso();
  db.prepare(
    "INSERT INTO users (id, email, name, password_hash, role, email_verified_at, created_at, updated_at) VALUES (?,?,?,?,'admin',?,?,?)",
  ).run(uid("usr_"), email, "Administrador", hashPassword(password), now, now, now);
  console.log("Administrador criado:", email);
  console.log("Palavra-passe:", password);
  console.log("Altere ADMIN_PASSWORD antes de usar em produção.");
}

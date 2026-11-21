import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "./config";

/** Impede path traversal: todos os caminhos ficam dentro de STORAGE_DIR. */
export function storagePath(rel: string): string {
  const target = path.resolve(config.storageDir, rel);
  const root = path.resolve(config.storageDir);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error("CAMINHO_INVALIDO");
  }
  return target;
}

export function ensureStorage() {
  fs.mkdirSync(config.storageDir, { recursive: true });
}

export function writeStorage(rel: string, data: Buffer | Uint8Array) {
  ensureStorage();
  const target = storagePath(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data);
}

export function readStorage(rel: string): Buffer {
  return fs.readFileSync(storagePath(rel));
}

export function statStorage(rel: string): fs.Stats | null {
  try {
    return fs.statSync(storagePath(rel));
  } catch {
    return null;
  }
}

export function removeStorage(rel: string) {
  const target = storagePath(rel);
  if (fs.existsSync(target)) fs.unlinkSync(target);
}

export function signedToken(payload: { clipId: string; userId: string; exp: number }): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", config.secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySignedToken<T>(token: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", config.secret).update(body).digest("base64url");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload.exp === "number" && payload.exp < Date.now()) return null;
    return payload as T;
  } catch {
    return null;
  }
}

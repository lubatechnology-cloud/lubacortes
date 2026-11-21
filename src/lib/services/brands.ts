import { all, get, nowIso, run, uid } from "../db";
import { ApiError } from "../http";
import { featuresForUser } from "../billing";
import { writeStorage } from "../storage";

export type Brand = {
  id: string; owner_id: string; name: string; logo_path: string | null;
  subtitle_style_json: string; intro_path: string | null; outro_path: string | null;
  created_at: string; updated_at: string;
};

export function listBrands(userId: string) {
  return all<Brand & { role: string }>(
    "SELECT b.*, m.role FROM brands b JOIN brand_members m ON m.brand_id=b.id WHERE m.user_id=? ORDER BY b.created_at DESC",
    userId,
  );
}

export function createBrand(userId: string, name: string) {
  if (!featuresForUser(userId).multipleUsers) {
    throw new ApiError(402, "Várias marcas requerem o plano AGÊNCIA.", "branding_locked");
  }
  const id = uid("brd_");
  const now = nowIso();
  run("INSERT INTO brands (id,owner_id,name,created_at,updated_at) VALUES (?,?,?,?,?)", id, userId, name, now, now);
  run("INSERT INTO brand_members (id,brand_id,user_id,role,created_at) VALUES (?,?,?,'owner',?)", uid("bmb_"), id, userId, now);
  return get<Brand>("SELECT * FROM brands WHERE id=?", id)!;
}

export function updateBrand(userId: string, brandId: string, data: {
  name?: string; subtitleStyle?: Record<string, unknown>;
}) {
  const brand = get<Brand>("SELECT * FROM brands WHERE id=? AND owner_id=?", brandId, userId);
  if (!brand) throw new ApiError(404, "Marca não encontrada.", "not_found");
  const updates: string[] = [];
  const values: unknown[] = [];
  if (data.name) { updates.push("name=?"); values.push(data.name); }
  if (data.subtitleStyle) { updates.push("subtitle_style_json=?"); values.push(JSON.stringify(data.subtitleStyle)); }
  if (updates.length) {
    updates.push("updated_at=?");
    values.push(nowIso(), brandId);
    run(`UPDATE brands SET ${updates.join(",")} WHERE id=?`, ...values);
  }
  return get<Brand>("SELECT * FROM brands WHERE id=?", brandId)!;
}

export function addMember(userId: string, brandId: string, email: string) {
  const brand = get<Brand>("SELECT * FROM brands WHERE id=? AND owner_id=?", brandId, userId);
  if (!brand) throw new ApiError(404, "Marca não encontrada.", "not_found");
  if (!featuresForUser(userId).multipleUsers) {
    throw new ApiError(402, "Várias contas por marca requerem o plano AGÊNCIA.", "users_locked");
  }
  const user = get<{ id: string }>("SELECT id FROM users WHERE email=?", email.toLowerCase());
  if (!user) throw new ApiError(404, "Utilizador não encontrado.", "user_not_found");
  run("INSERT OR IGNORE INTO brand_members (id,brand_id,user_id,role,created_at) VALUES (?,?,?,'member',?)",
    uid("bmb_"), brandId, user.id, nowIso());
  return listBrandMembers(userId, brandId);
}

export function listBrandMembers(userId: string, brandId: string) {
  const brand = get<Brand>("SELECT * FROM brands WHERE id=?", brandId);
  if (!brand || brand.owner_id !== userId) throw new ApiError(404, "Marca não encontrada.", "not_found");
  return all<{ id: string; email: string; name: string; role: string }>(
    "SELECT u.id,u.email,u.name,m.role FROM brand_members m JOIN users u ON u.id=m.user_id WHERE m.brand_id=? ORDER BY m.created_at",
    brandId,
  );
}

export async function saveBrandAsset(userId: string, brandId: string, kind: "logo" | "intro" | "outro", file: File) {
  const brand = get<Brand>("SELECT * FROM brands WHERE id=? AND owner_id=?", brandId, userId);
  if (!brand) throw new ApiError(404, "Marca não encontrada.", "not_found");
  if (kind !== "logo" && !featuresForUser(userId).customBranding) {
    throw new ApiError(402, "Intro/encerramento requerem o plano PROFISSIONAL.", "branding_locked");
  }
  const max = kind === "logo" ? 2 * 1024 * 1024 : 30 * 1024 * 1024;
  if (file.size > max) throw new ApiError(413, "Ficheiro demasiado grande.", "too_large");
  const ext = (file.name.split(".").pop() ?? (kind === "logo" ? "png" : "mp4")).toLowerCase().replace(/[^a-z0-9]/g, "");
  const rel = `brands/${userId}/${brandId}/${kind}.${ext}`;
  writeStorage(rel, Buffer.from(await file.arrayBuffer()));
  const column = kind === "logo" ? "logo_path" : kind === "intro" ? "intro_path" : "outro_path";
  run(`UPDATE brands SET ${column}=?, updated_at=? WHERE id=?`, rel, nowIso(), brandId);
  return get<Brand>("SELECT * FROM brands WHERE id=?", brandId)!;
}

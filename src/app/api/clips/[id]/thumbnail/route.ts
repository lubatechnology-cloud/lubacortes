import { requireUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { ApiError, fail } from "@/lib/http";
import { canDownload } from "@/lib/services/entitlements";
import { readStorage, statStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Cortes bloqueados NUNCA recebem a miniatura real — apenas um placeholder. */
const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b1a44"/><stop offset="1" stop-color="#123a8a"/></linearGradient>
<filter id="b"><feGaussianBlur stdDeviation="14"/></filter></defs>
<rect width="360" height="640" fill="url(#g)"/><g filter="url(#b)" opacity=".5"><circle cx="180" cy="250" r="110" fill="#2563eb"/><rect x="60" y="400" width="240" height="120" rx="24" fill="#22d3ee"/></g>
<text x="180" y="560" text-anchor="middle" fill="#93c5fd" font-family="Arial" font-size="20">BLOQUEADO</text></svg>`;

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const clip = get<{ id: string; user_id: string; thumb_path: string | null }>("SELECT id,user_id,thumb_path FROM clips WHERE id=? AND user_id=?", id, user.id);
    if (!clip) throw new ApiError(404, "Corte não encontrado.", "not_found");
    const unlocked = canDownload(user.id, id);
    if (!unlocked || !clip.thumb_path || !statStorage(clip.thumb_path)) {
      return new Response(PLACEHOLDER, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, no-store" } });
    }
    const data = readStorage(clip.thumb_path);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return fail(e);
  }
}

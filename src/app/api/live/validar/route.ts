import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { validarUrlLive, verificarPlaylist } from "@/lib/video/live";

export async function POST(req: Request) {
  try {
    await requireUser();
    const { url } = z.object({ url: z.string().trim().url() }).parse(await readJson(req));
    const info = await verificarPlaylist(validarUrlLive(url));
    return ok({ valida: true, ...info });
  } catch (e) { return fail(e); }
}

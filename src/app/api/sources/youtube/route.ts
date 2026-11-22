import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { infoYouTube } from "@/lib/video/youtube";

export async function POST(req: Request) {
  try {
    await requireUser();
    const { url } = z.object({ url: z.string().trim().url() }).parse(await readJson(req));
    const info = await infoYouTube(url);
    return ok({
      info,
      aviso: "A Lubacortes não descarrega vídeos de plataformas protegidas. Carregue o ficheiro ou use um URL directo autorizado para continuar.",
    });
  } catch (e) { return fail(e); }
}

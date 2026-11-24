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
      aviso: "O YouTube pode bloquear o download a partir dos nossos servidores. Para garantir os seus cortes, carregue o ficheiro do vídeo — os formatos, legendas e edição funcionam igual.",
    });
  } catch (e) { return fail(e); }
}

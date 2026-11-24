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
      aviso: "O download e a análise são feitos na nuvem. Se o YouTube bloquear algum vídeo, convidamos a carregar o ficheiro — os formatos, legendas e edição funcionam igual.",
    });
  } catch (e) { return fail(e); }
}

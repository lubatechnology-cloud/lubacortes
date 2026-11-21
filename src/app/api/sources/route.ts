import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { listSources } from "@/lib/video/platforms";

export async function GET() {
  try {
    await requireUser();
    return ok({
      sources: listSources(),
      notice: "Não contornamos protecções de plataformas externas. Use um URL directo autorizado ou carregue o ficheiro.",
    });
  } catch (e) { return fail(e); }
}

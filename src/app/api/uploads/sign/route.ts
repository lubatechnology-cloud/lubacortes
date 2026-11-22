import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { uid } from "@/lib/db";
import { criarUrlUpload } from "@/lib/storage-remote";
import { config } from "@/lib/config";

const schema = z.object({
  fileName: z.string().min(1).max(200),
  size: z.number().int().positive().max(config.maxUploadBytes),
  contentType: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await readJson(req));
    const ext = (body.fileName.split(".").pop() ?? "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "mp4";
    const caminho = `uploads/${user.id}/${uid("up_")}.${ext}`;
    const url = await criarUrlUpload(caminho);
    return ok({ url, caminho });
  } catch (e) { return fail(e); }
}

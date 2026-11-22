import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { createLiveProject, createProjectFromUpload, createProjectFromUrl, listProjects } from "@/lib/services/projects";

export const dynamic = "force-dynamic";

const urlSchema = z.object({ sourceType: z.literal("url"), url: z.string().trim().url("Introduza um URL válido.") });
const liveSchema = z.object({
  sourceType: z.literal("live"),
  url: z.string().trim().url("Introduza um URL válido."),
  captureSeconds: z.number().int().min(5).max(600).default(60),
});

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ projects: listProjects(user.id) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return fail(new Error("FICHEIRO_ausente"));
      const project = await createProjectFromUpload(user.id, file);
      return ok({ project }, 201);
    }
    const raw = await readJson(req) as { sourceType?: string };
    if (raw.sourceType === "live") {
      const body = liveSchema.parse(raw);
      const result = createLiveProject(user.id, body.url, body.captureSeconds);
      return ok(result, 201);
    }
    const body = urlSchema.parse(raw);
    const project = await createProjectFromUrl(user.id, body.url);
    return ok({ project }, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "FICHEIRO_ausente") {
      return fail(new (await import("@/lib/http")).ApiError(400, "Nenhum ficheiro enviado.", "missing_file"));
    }
    return fail(e);
  }
}

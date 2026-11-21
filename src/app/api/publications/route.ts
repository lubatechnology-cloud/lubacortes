import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { listPublications, publishNotice, schedulePublication } from "@/lib/services/publications";

export const dynamic = "force-dynamic";

const schema = z.object({
  clipId: z.string().min(1),
  platform: z.string().min(1),
  scheduledAt: z.string().min(1),
});

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ publications: listPublications(user.id), notice: publishNotice() });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await readJson(req));
    const publication = schedulePublication(user.id, body.clipId, body.platform, body.scheduledAt);
    return ok({ publication, notice: publishNotice() }, 201);
  } catch (e) { return fail(e); }
}

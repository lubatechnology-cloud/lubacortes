import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { addMember, listBrandMembers } from "@/lib/services/brands";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return ok({ members: listBrandMembers(user.id, id) });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(await readJson(req));
    return ok({ members: addMember(user.id, id, email) }, 201);
  } catch (e) { return fail(e); }
}

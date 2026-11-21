import { requireUser } from "@/lib/auth";
import { revokeSessionById } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    revokeSessionById(user.id, id);
    return ok({ revoked: true });
  } catch (e) { return fail(e); }
}

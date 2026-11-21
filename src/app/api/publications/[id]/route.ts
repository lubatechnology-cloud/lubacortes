import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { cancelPublication } from "@/lib/services/publications";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    cancelPublication(user.id, id);
    return ok({ cancelled: true });
  } catch (e) { return fail(e); }
}

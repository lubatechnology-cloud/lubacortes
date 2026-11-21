import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { createBrand, listBrands } from "@/lib/services/brands";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ brands: listBrands(user.id) });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { name } = z.object({ name: z.string().trim().min(2).max(80) }).parse(await readJson(req));
    return ok({ brand: createBrand(user.id, name) }, 201);
  } catch (e) { return fail(e); }
}

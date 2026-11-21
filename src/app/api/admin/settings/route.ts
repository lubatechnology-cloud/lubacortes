import { clientIp, requireAdmin } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { getSettings, updateSettings } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return ok({ settings: getSettings() });
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await readJson(req)) as { settings?: Record<string, unknown> };
    if (!body.settings || typeof body.settings !== "object") throw new Error("INVALID");
    return ok({ settings: updateSettings(admin.id, body.settings, clientIp(req)) });
  } catch (e) {
    return fail(e instanceof Error && e.message === "INVALID" ? new (await import("@/lib/http")).ApiError(400, "Configuração inválida.", "invalid") : e);
  }
}

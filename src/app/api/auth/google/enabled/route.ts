import { ok } from "@/lib/http";
import { googleEnabled } from "@/lib/google";

export async function GET() {
  return ok({ enabled: googleEnabled() });
}

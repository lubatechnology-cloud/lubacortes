import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { startAnalysis } from "@/lib/services/projects";
import { SUBTITLE_LANGUAGES } from "@/lib/ai/translate";
import { VIDEO_FORMATS } from "@/lib/video/formats";
import { assertAutofocusAllowed, assertFormatAllowed, featuresForUser } from "@/lib/billing";

const schema = z.object({
  subtitleLang: z.enum(SUBTITLE_LANGUAGES.map((l) => l.code) as [string, ...string[]]).default("pt"),
  formatId: z.enum(VIDEO_FORMATS.map((f) => f.id) as [string, ...string[]]).default("reels"),
  style: z.record(z.unknown()).optional(),
  maxClips: z.number().int().min(1).max(12).optional(),
  autofocusMode: z.enum(["center", "model", "manual"]).optional(),
  manualFocus: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }).optional(),
  groupFocus: z.boolean().optional(),
  stylePreset: z.string().max(40).optional(),
}).default({});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = schema.parse(await readJson(req).catch(() => ({})));
    assertFormatAllowed(user.id, body.formatId);
    assertAutofocusAllowed(user.id, body.autofocusMode ?? "center", body.groupFocus);
    const feat = featuresForUser(user.id);
    if (body.style?.animated && !feat.animatedSubtitles) {
      throw new (await import("@/lib/http")).ApiError(402, "Legendas animadas requerem o plano PROFISSIONAL.", "animated_locked");
    }
    if (body.stylePreset && feat.subtitleStyles < 2) {
      throw new (await import("@/lib/http")).ApiError(402, "Modelos de legendas adicionais requerem o plano CRIADOR ou superior.", "styles_locked");
    }
    const result = startAnalysis(user.id, id, body);
    return ok(result, 202);
  } catch (e) {
    return fail(e);
  }
}

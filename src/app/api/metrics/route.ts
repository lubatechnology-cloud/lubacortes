import { metricasPrometheus } from "@/lib/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Endpoint Prometheus. Protegido por METRICS_TOKEN quando definido. */
export async function GET(req: Request) {
  const token = process.env.METRICS_TOKEN;
  if (token && req.headers.get("authorization") !== `Bearer ${token}` && req.headers.get("x-metrics-token") !== token) {
    return new Response("Unauthorized", { status: 401 });
  }
  return new Response(metricasPrometheus(), {
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8", "Cache-Control": "no-store" },
  });
}

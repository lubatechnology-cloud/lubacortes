import * as Sentry from "@sentry/node";

let iniciado = false;

export function iniciarSentry() {
  if (iniciado || !process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
  });
  iniciado = true;
}

export function capturarErro(erro: unknown) {
  if (!process.env.SENTRY_DSN) return;
  iniciarSentry();
  Sentry.captureException(erro);
}

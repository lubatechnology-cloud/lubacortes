import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error",
  ) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "validation",
          message: "Dados inválidos.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      },
      { status: 422 },
    );
  }
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized", message: "Iniciar sessão é obrigatório." } },
      { status: 401 },
    );
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json(
      { ok: false, error: { code: "forbidden", message: "Sem permissão para esta operação." } },
      { status: 403 },
    );
  }
  console.error("[api] erro não tratado:", error);
  return NextResponse.json(
    { ok: false, error: { code: "internal", message: "Ocorreu um erro interno." } },
    { status: 500 },
  );
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "Corpo JSON inválido.", "invalid_json");
  }
}

export type ApiResponse<T> = { ok: boolean; data?: T; error?: { code: string; message: string; issues?: { path: string; message: string }[] } };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    const texto = (await res.text()).slice(0, 120);
    if (res.status === 413) throw new Error("O ficheiro é demasiado grande para este servidor. Use o carregamento directo para armazenamento.");
    throw new Error(`Resposta inesperada do servidor (${res.status}): ${texto}`);
  }
  const json = (await res.json().catch(() => ({}))) as ApiResponse<T>;
  if (!res.ok || !json.ok) throw new Error(json.error?.message ?? `Erro ${res.status}`);
  return json.data as T;
}

export function post<T>(path: string, body?: unknown) {
  return api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
}

export function put<T>(path: string, body?: unknown) {
  return api<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) });
}

export function patch<T>(path: string, body?: unknown) {
  return api<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
}

export function del<T>(path: string) {
  return api<T>(path, { method: "DELETE" });
}

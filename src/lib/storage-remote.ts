import { config } from "./config";

function base(): { url: string; key: string; bucket: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!url || !key || !bucket) return null;
  return { url: url.replace(/\/$/, ""), key, bucket };
}

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

/** Cria URL de upload assinada para o browser enviar o ficheiro directamente. */
export async function criarUrlUpload(caminho: string): Promise<string> {
  const c = base();
  if (!c) throw new Error("Supabase Storage não configurado.");
  const res = await fetch(
    `${c.url}/storage/v1/object/upload/sign/${c.bucket}/${caminho}`,
    { method: "POST", headers: { ...headers(c.key), "x-upsert": "true" } },
  );
  if (!res.ok) throw new Error(`Falha ao criar upload (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { url?: string; token?: string };
  if (!data.url) throw new Error("O Storage não devolveu URL de upload.");
  if (data.url.startsWith("http")) return data.url;
  const rel = data.url.startsWith("/") ? data.url : `/${data.url}`;
  return rel.startsWith("/storage/v1") ? `${c.url}${rel}` : `${c.url}/storage/v1${rel}`;
}

/** Envia um buffer para o bucket (servidor/worker). */
export async function enviarRemoto(caminho: string, dados: Buffer, contentType = "application/octet-stream") {
  const c = base();
  if (!c) return false;
  const res = await fetch(`${c.url}/storage/v1/object/${c.bucket}/${caminho}`, {
    method: "POST",
    headers: { ...headers(c.key), "Content-Type": contentType, "x-upsert": "true" },
    body: new Uint8Array(dados),
  });
  return res.ok;
}

/** Descarga um objecto do bucket (servidor/worker). */
export async function descarregarRemoto(caminho: string): Promise<Buffer | null> {
  const c = base();
  if (!c) return null;
  const res = await fetch(`${c.url}/storage/v1/object/${c.bucket}/${caminho}`, {
    headers: headers(c.key),
  });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

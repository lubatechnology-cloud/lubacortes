import { post } from "./api";

/** Envia o ficheiro directamente para o Storage, sem passar pelo limite da Vercel. */
export async function uploadDirecto(file: File): Promise<string> {
  const r = await post<{ url: string; caminho: string }>("/api/uploads/sign", {
    fileName: file.name,
    size: file.size,
    contentType: file.type || "video/mp4",
  });
  const res = await fetch(r.url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "video/mp4" },
    body: file,
  });
  if (!res.ok) throw new Error(`Falha ao enviar o ficheiro (${res.status}).`);
  return r.caminho;
}

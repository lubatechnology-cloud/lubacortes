import fs from "node:fs";
import { config } from "../config";
import { storagePath, writeStorage } from "../storage";
import { fetchToBuffer } from "../video/url";
import { descarregarRemoto } from "../storage-remote";

/**
 * O worker corre fora da Vercel e não partilha o filesystem efémero da API.
 * Se o ficheiro local não existir, obtemos o vídeo a partir do URL de origem
 * autorizado (apenas direct media — nunca extractores de plataformas protegidas).
 */
export async function ensureLocalSource(project: {
  storage_path: string | null; source_url: string | null; remote_path?: string | null;
}): Promise<string> {
  if (!project.storage_path) throw new Error("Projecto sem ficheiro de origem.");
  const abs = storagePath(project.storage_path);
  if (fs.existsSync(abs)) return abs;
  if (project.remote_path) {
    const remoto = await descarregarRemoto(project.remote_path);
    if (remoto) { writeStorage(project.storage_path, remoto); return abs; }
  }
  if (project.source_url) {
    const buffer = await fetchToBuffer(project.source_url, config.maxUploadBytes);
    writeStorage(project.storage_path, buffer);
    return abs;
  }
  throw new Error("Ficheiro de origem indisponível no worker e sem URL directo para o obter.");
}

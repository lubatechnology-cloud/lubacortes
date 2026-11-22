import fs from "node:fs";
import { criarUrlUpload } from "../src/lib/storage-remote";

async function main() {
  const url = await criarUrlUpload(`testes/${Date.now()}.mp4`);
  console.log("URL prefixo:", url.slice(0, 90));
  const file = fs.readFileSync("data/fala.mp4");
  const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "video/mp4" }, body: new Uint8Array(file) });
  console.log("PUT", res.status, (await res.text()).slice(0, 200));
}
main().catch((e) => { console.error("ERRO", (e as Error).message); process.exit(1); });

import fs from "node:fs";
import path from "node:path";
import { config } from "../src/lib/config";
import { getTranscriptionProvider } from "../src/lib/ai/transcribe";

const dir = path.join(config.storageDir, "projects", "usr_c55a8650-aa4c-408e-900d-fb5d77d779c0", "prj_14c5ce40-86f3-4916-98c7-fe55ceb50a5c");
const audio = path.join(dir, "audio.wav");
console.log("provider:", config.transcription.provider, "audio existe:", fs.existsSync(audio));
if (!fs.existsSync(audio)) process.exit(1);
async function main() {
  try {
    const r = await getTranscriptionProvider().transcribe(audio);
    console.log("idioma:", r.language, "segmentos:", r.segments.length);
    console.log(JSON.stringify(r.segments.slice(0, 5), null, 1));
    console.log("aviso:", r.warning ?? "—");
  } catch (e) {
    console.error("ERRO:", (e as Error).message.slice(0, 800));
    process.exit(2);
  }
}
main();

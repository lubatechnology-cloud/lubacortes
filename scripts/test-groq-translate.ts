import { config } from "../src/lib/config";
import { getTranslationProvider } from "../src/lib/ai/translate";

async function main() {
  console.log("provider:", config.translation.provider);
  const r = await getTranslationProvider().translate(
    "O maior erro que os criadores cometem é ignorar as legendas.", "en", "pt",
  );
  console.log("traduzido:", r.translated, "resultado:", r.text);
}
main().catch((e) => { console.error("ERRO:", (e as Error).message.slice(0, 400)); process.exit(2); });

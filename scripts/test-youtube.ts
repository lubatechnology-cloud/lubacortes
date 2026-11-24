import { baixarYouTube } from "../src/lib/video/youtube-download";

const url = process.argv[2] || "https://www.youtube.com/watch?v=FqncTKI5gd8";
baixarYouTube(url, "teste", "bot-check")
  .then((r) => console.log("OK", JSON.stringify(r)))
  .catch((e) => { console.error("ERRO:", (e as Error).message.slice(0, 800)); process.exit(1); });

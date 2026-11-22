import { notificarSePronto } from "../src/lib/services/notifications";

const projectId = process.argv[2];
if (!projectId) throw new Error("Uso: test-notify.ts <projectId>");
notificarSePronto("usr_658ace67-ddc3-44c3-95ff-6b0753c84b39", projectId)
  .then((r) => console.log("resultado:", JSON.stringify(r)))
  .catch((e) => { console.error("ERRO:", (e as Error).message); process.exit(1); });

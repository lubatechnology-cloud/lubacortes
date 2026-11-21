import { getDb } from "../src/lib/db";

const db = getDb();
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];
console.log("Base de dados inicializada.");
console.log("Tabelas:", tables.map((t) => t.name).join(", "));

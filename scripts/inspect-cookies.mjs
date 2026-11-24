import path from "node:path";
import Database from "better-sqlite3";
const db = new Database(path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "User Data", "Default", "Network", "Cookies"), { readonly: true });
console.log(db.prepare("SELECT substr(CAST(encrypted_value AS BLOB),1,3) AS prefixo, COUNT(*) AS n FROM cookies GROUP BY prefixo").all());
console.log(db.prepare("SELECT host_key, name, substr(CAST(encrypted_value AS BLOB),1,3) AS prefixo FROM cookies WHERE host_key LIKE '%youtube.com%' LIMIT 5").all());
db.close();

import { all } from "../src/lib/db";
console.log("jobs:", all("SELECT type,status,COUNT(*) AS n FROM jobs GROUP BY type,status"));
console.log("clips:", all("SELECT status,is_unlocked,COUNT(*) AS n FROM clips GROUP BY status,is_unlocked"));
console.log("moments:", all("SELECT COUNT(*) AS n FROM moments"));
console.log("errors:", all("SELECT id,message,created_at FROM processing_errors ORDER BY created_at DESC LIMIT 5"));

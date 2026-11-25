import { run } from "../src/lib/db";
run("UPDATE clips SET status='failed' WHERE id=?", "clip_822a4143-3a7e-4cc3-ac54-12d2a083ffdd");
console.log("reset");

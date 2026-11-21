import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lubacortes-test-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");
process.env.STORAGE_DIR = path.join(dir, "storage");
process.env.APP_SECRET = "test-secret-0123456789abcdef";
process.env.PAYMENT_TEST_CONFIRM_TOKEN = "token-de-teste-secreto-123";
process.env.TRANSCRIPTION_PROVIDER = "none";
process.env.TRANSLATION_PROVIDER = "none";

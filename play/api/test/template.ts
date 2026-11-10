// The template database every test file copies (./kit.ts templateDb), made once before the files start in parallel:
// on a fresh runner they would otherwise all wait for one file to make it, then start at once.
import { DB_URL, templateDb } from "./kit";

if (!DB_URL) process.exit(0);
const admin = new Bun.SQL(DB_URL);
console.log(`test template: ${await templateDb(admin)}`);
await admin.close();

// bun src/migrate.ts — runs play's migrations against DATABASE_URL, then its seed (./seed.ts prepare)
import { connect } from "./kit/pg";
import { prepare } from "./seed";

const db = connect();
const ran = await prepare(db);
console.log(ran.length ? `ran ${ran.join(", ")}` : "nothing to run");
process.exit(0);

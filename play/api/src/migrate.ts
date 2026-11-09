// bun src/migrate.ts — runs play's migrations against DATABASE_URL, then its seed (./seed.ts)
import { connect } from "./kit/pg";
import { migrate } from "./migrations";
import { seed } from "./seed";

const db = connect();
const ran = await migrate(db);
await seed(db);
console.log(ran.length ? `ran ${ran.join(", ")}` : "nothing to run");
process.exit(0);

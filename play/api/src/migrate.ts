// bun src/migrate.ts — runs play's migrations against DATABASE_URL
import { connect } from "./pg";
import { migrate } from "./migrations";

const db = connect();
const ran = await migrate(db);
console.log(ran.length ? `ran ${ran.join(", ")}` : "nothing to run");
process.exit(0);

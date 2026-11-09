// What play makes after its migrations, where SQL can't (a Loro document), each only where absent: run by every entry
// point that migrates (play-api as it starts, src/migrate.ts, the import), after migrate().
import type { Db } from "./kit/pg";
import { ensureSchemas } from "./docs/schemas";
import { ensureLayouts } from "./sandboxes";
import { ensureRules } from "./rules";

export async function seed(db: Db) {
  // the schemas, each a document of the meta-schema, made from the seed where absent (play/SPEC.md "Version control")
  await ensureSchemas(db);
  // the sandboxes' layouts, each a document, and every sandbox change kept by 202611070115-d2f50bf1-sandbox-layouts
  // an intent variant of its layout (play/SPEC.md §4.6)
  await ensureLayouts(db);
  // the auto-accept rules' v1 (play/SPEC.md §4.12 "Auto-accept rules"): one document
  await ensureRules(db);
}
